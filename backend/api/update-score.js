const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

// Simple in-memory cache to prevent duplicate referral count increments
// This is a quick fix - in production you would use a persistent store
const processedReferrals = new Set();

/**
 * @route POST /api/update-score
 * @desc Update user's score
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    const { userId, score, isReferral, incrementReferralCount, uniqueRequestId } = req.body;
    
    // Add request logging
    console.log(`[UPDATE-SCORE] Request received: userId=${userId}, score=${score}, isReferral=${isReferral}, incrementReferralCount=${incrementReferralCount}, uniqueRequestId=${uniqueRequestId}`);
    
    // Check for duplicate referral increment requests
    if (isReferral && incrementReferralCount) {
      const requestKey = uniqueRequestId ? 
        `${userId}_${uniqueRequestId}` : 
        `${userId}_${Date.now()}`; // Fallback if no uniqueRequestId
        
      if (processedReferrals.has(requestKey)) {
        console.log(`[UPDATE-SCORE] Duplicate referral increment detected and prevented for ${requestKey}`);
        return res.status(200).json({
          message: 'Duplicate referral request detected and prevented',
          isDuplicate: true
        });
      }
      
      // Add to processed set
      processedReferrals.add(requestKey);
      
      // Basic cleanup - remove old entries after 1 hour
      setTimeout(() => {
        processedReferrals.delete(requestKey);
      }, 3600000); // 1 hour
    }
    
    // Validate input
    if (!userId || score === undefined || score === null) {
      return res.status(400).json({ message: 'User ID and score are required' });
    }
    
    // Make sure score is a number
    const numericScore = parseInt(score);
    if (isNaN(numericScore)) {
      return res.status(400).json({ message: 'Score must be a number' });
    }
    
    // Get the user's current data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found in database' });
    }
    
    const userData = userDoc.data();
    const currentScore = userData.score || userData.highScore || 0;
    
    if (isReferral) {
      // For referral bonuses, just add to the score without affecting other stats
      console.log(`[UPDATE-SCORE] REFERRAL BONUS: User ${userId} getting ${numericScore} bonus points`);
      
      // If incrementReferralCount flag is set, increment the referral count
      if (incrementReferralCount) {
        console.log(`[UPDATE-SCORE] Incrementing referral count for referrer ${userId} from ${userData.referralCount || 0} to ${(userData.referralCount || 0) + 1}`);
        await userRef.update({
          score: currentScore + numericScore,
          referralCount: (userData.referralCount || 0) + 1,
          referralBonus: (userData.referralBonus || 0) + numericScore,
          updatedAt: new Date().toISOString()
        });
      } else {
        // For the referred user, just update the score
        console.log(`[UPDATE-SCORE] Updating score only for user ${userId} (no referral count increment)`);
        await userRef.update({
          score: currentScore + numericScore,
          referralBonus: (userData.referralBonus || 0) + numericScore,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Return different responses based on whether it's a referrer or referred user
      if (incrementReferralCount) {
        return res.status(200).json({
          message: 'Referral bonus added successfully',
          previousScore: currentScore,
          addedScore: numericScore,
          totalScore: currentScore + numericScore,
          previousReferralCount: userData.referralCount || 0,
          referralCount: (userData.referralCount || 0) + 1,
          highestSingleGameScore: 0,
          gamesPlayed: userData.gamesPlayed || 0,
          previousGamesPlayed: userData.gamesPlayed || 0,
          lastGameScore: 0,
          rank: userData.rank || 0
        });
      } else {
        return res.status(200).json({
          message: 'Referral bonus added successfully',
          previousScore: currentScore,
          addedScore: numericScore,
          totalScore: currentScore + numericScore,
          referralCount: userData.referralCount || 0,
          highestSingleGameScore: 0,
          gamesPlayed: userData.gamesPlayed || 0,
          previousGamesPlayed: userData.gamesPlayed || 0,
          lastGameScore: 0,
          rank: userData.rank || 0
        });
      }
    } else {
      // Regular game score update logic (keep existing code)
      const currentHighScore = userData.highScore || 0;
      
      // Calculate new cumulative score
      const newCumulativeScore = currentScore + numericScore;
      
      // Keep track of highest single-game score
      const highestSingleScore = Math.max(numericScore, currentHighScore);
      
      // Update the user document
      await userRef.update({
        score: newCumulativeScore,
        highScore: highestSingleScore,
        lastGameScore: numericScore,
        gamesPlayed: (userData.gamesPlayed || 0) + 1,
        updatedAt: new Date().toISOString()
      });

      // Calculate user's rank after updating score
      // Get all users sorted by highScore in descending order
      const usersSnapshot = await db.collection('users')
        .orderBy('highScore', 'desc')
        .get();
      
      let userRank = 0;
      let lastHighScore = Infinity;
      let currentRank = 0;
      
      // Iterate through users to determine rank
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        // If this is a new score tier, increment the rank
        if (user.highScore < lastHighScore) {
          currentRank++;
          lastHighScore = user.highScore;
        }
        
        // If this is our user, save their rank
        if (doc.id === userId) {
          userRank = currentRank;
        }
      });
      
      // Update the user's rank in database
      await userRef.update({ rank: userRank });
      
      console.log(`User ${userId} score updated: +${numericScore} points (total: ${newCumulativeScore}), rank: ${userRank}`);
      
      return res.status(200).json({
        message: 'Score updated successfully',
        previousScore: currentScore,
        addedScore: numericScore,
        totalScore: newCumulativeScore,
        highestSingleGameScore: highestSingleScore,
        gamesPlayed: (userData.gamesPlayed || 0) + 1,
        referralCount: userData.referralCount || 0,
        rank: userRank
      });
    }
  } catch (error) {
    console.error('Error updating score:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Error updating score', error: error.message });
  }
});

module.exports = router; 