const express = require('express');
const router = express.Router();
const { databases, DATABASE_ID, USERS_COLLECTION_ID } = require('../config/appwrite');
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
    const userDoc = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId
    );
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found in database' });
    }
    
    const currentScore = userDoc.score || userDoc.highScore || 0;
    
    if (isReferral) {
      // For referral bonuses, just add to the score without affecting other stats
      console.log(`[UPDATE-SCORE] REFERRAL BONUS: User ${userId} getting ${numericScore} bonus points`);
      
      // If incrementReferralCount flag is set, increment the referral count
      if (incrementReferralCount) {
        console.log(`[UPDATE-SCORE] Incrementing referral count for referrer ${userId} from ${userDoc.referralCount || 0} to ${(userDoc.referralCount || 0) + 1}`);
        await databases.updateDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          userId,
          {
            score: currentScore + numericScore,
            referralCount: (userDoc.referralCount || 0) + 1,
            referralBonus: (userDoc.referralBonus || 0) + numericScore,
            updatedAt: new Date().toISOString()
          }
        );
      } else {
        // For the referred user, just update the score
        console.log(`[UPDATE-SCORE] Updating score only for user ${userId} (no referral count increment)`);
        await databases.updateDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          userId,
          {
            score: currentScore + numericScore,
            referralBonus: (userDoc.referralBonus || 0) + numericScore,
            updatedAt: new Date().toISOString()
          }
        );
      }
      
      // Return different responses based on whether it's a referrer or referred user
      if (incrementReferralCount) {
        return res.status(200).json({
          message: 'Referral bonus added successfully',
          previousScore: currentScore,
          addedScore: numericScore,
          totalScore: currentScore + numericScore,
          previousReferralCount: userDoc.referralCount || 0,
          referralCount: (userDoc.referralCount || 0) + 1,
          highestSingleGameScore: 0,
          gamesPlayed: userDoc.gamesPlayed || 0,
          previousGamesPlayed: userDoc.gamesPlayed || 0,
          lastGameScore: 0,
          rank: userDoc.rank || 0
        });
      } else {
        return res.status(200).json({
          message: 'Referral bonus added successfully',
          previousScore: currentScore,
          addedScore: numericScore,
          totalScore: currentScore + numericScore,
          referralCount: userDoc.referralCount || 0,
          highestSingleGameScore: 0,
          gamesPlayed: userDoc.gamesPlayed || 0,
          previousGamesPlayed: userDoc.gamesPlayed || 0,
          lastGameScore: 0,
          rank: userDoc.rank || 0
        });
      }
    } else {
      // Regular game score update logic
      const currentHighScore = userDoc.highScore || 0;
      
      // Calculate new cumulative score
      const newCumulativeScore = currentScore + numericScore;
      
      // Keep track of highest single-game score
      const highestSingleScore = Math.max(numericScore, currentHighScore);
      
      // Update the user document
      await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId,
        {
          score: newCumulativeScore,
          highScore: highestSingleScore,
          lastGameScore: numericScore,
          gamesPlayed: (userDoc.gamesPlayed || 0) + 1,
          updatedAt: new Date().toISOString()
        }
      );

      // Calculate user's rank after updating score
      // Get all users sorted by highScore in descending order
      const usersResponse = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [
          'orderDesc("highScore")'
        ]
      );
      
      let userRank = 0;
      let lastHighScore = Infinity;
      let currentRank = 0;
      
      // Iterate through users to determine rank
      usersResponse.documents.forEach(user => {
        // If this is a new score tier, increment the rank
        if (user.highScore < lastHighScore) {
          currentRank++;
          lastHighScore = user.highScore;
        }
        
        // If this is our user, save their rank
        if (user.$id === userId) {
          userRank = currentRank;
        }
      });
      
      // Update the user's rank in database
      await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId,
        { rank: userRank }
      );
      
      console.log(`User ${userId} score updated: +${numericScore} points (total: ${newCumulativeScore}), rank: ${userRank}`);
      
      return res.status(200).json({
        message: 'Score updated successfully',
        previousScore: currentScore,
        addedScore: numericScore,
        totalScore: newCumulativeScore,
        highestSingleGameScore: highestSingleScore,
        gamesPlayed: (userDoc.gamesPlayed || 0) + 1,
        referralCount: userDoc.referralCount || 0,
        rank: userRank
      });
    }
  } catch (error) {
    console.error('Error updating score:', error);
    
    if (error.type === 'document_not_found') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Error updating score', error: error.message });
  }
});

module.exports = router; 