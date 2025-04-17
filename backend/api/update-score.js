const express = require('express');
const router = express.Router();
const { databases, DATABASE_ID, USERS_COLLECTION_ID } = require('../config/appwrite');
const { verifyToken } = require('../middleware/auth');

// Simple in-memory cache to prevent duplicate referral count increments
// This is a quick fix - in production you would use a persistent store
const processedReferrals = new Set();

// In-memory cache for top player ranks
// Will be updated periodically by a batch job
const rankCache = {
  topPlayers: [], // Stores ordered list of top players by highScore
  lastUpdated: 0,
  updating: false
};

// Update rank cache every 10 minutes
const RANK_CACHE_TTL = 10 * 60 * 1000; 

/**
 * Updates the rank cache with latest rankings
 * This prevents recalculating ranks on every score update
 */
async function updateRankCache() {
  if (rankCache.updating) return;
  
  try {
    rankCache.updating = true;
    console.log('[RANK CACHE] Updating rank cache');
    
    // Get all users sorted by highScore in descending order
    const usersResponse = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [
        'orderDesc("highScore")'
      ]
    );
    
    // Process the rankings
    const rankedPlayers = [];
    let lastHighScore = Infinity;
    let currentRank = 0;
    
    usersResponse.documents.forEach(user => {
      const highScore = user.highScore || 0;
      
      // If this is a new score tier, increment the rank
      if (highScore < lastHighScore) {
        currentRank++;
        lastHighScore = highScore;
      }
      
      rankedPlayers.push({
        id: user.$id,
        highScore: highScore,
        rank: currentRank
      });
    });
    
    // Update the cache
    rankCache.topPlayers = rankedPlayers;
    rankCache.lastUpdated = Date.now();
    
    console.log(`[RANK CACHE] Updated with ${rankedPlayers.length} players`);
  } catch (error) {
    console.error('[RANK CACHE] Error updating rank cache:', error);
  } finally {
    rankCache.updating = false;
  }
}

// Initial population of rank cache
updateRankCache();

/**
 * Gets a user's rank from the cache or calculates it if needed
 * @param {string} userId - The user ID to look up
 * @param {number} highScore - The user's current high score
 * @returns {number} The calculated rank
 */
function getRankFromCache(userId, highScore) {
  // Check if cache needs update
  if (Date.now() - rankCache.lastUpdated > RANK_CACHE_TTL && !rankCache.updating) {
    // Trigger update in background
    updateRankCache();
  }
  
  // Try to find user in cache
  const cachedUser = rankCache.topPlayers.find(player => player.id === userId);
  if (cachedUser) {
    return cachedUser.rank;
  }
  
  // If user not in cache or score higher than cached, calculate rough rank
  // This is an estimate until the next cache refresh
  let estimatedRank = rankCache.topPlayers.length + 1; // Default to bottom
  
  for (let i = 0; i < rankCache.topPlayers.length; i++) {
    if (highScore >= rankCache.topPlayers[i].highScore) {
      estimatedRank = rankCache.topPlayers[i].rank;
      break;
    }
  }
  
  return estimatedRank;
}

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
      
      // Get estimated rank from cache instead of reading all users
      const userRank = getRankFromCache(userId, highestSingleScore);
      
      // Update the user document with all fields at once
      await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId,
        {
          score: newCumulativeScore,
          highScore: highestSingleScore,
          lastGameScore: numericScore,
          gamesPlayed: (userDoc.gamesPlayed || 0) + 1,
          rank: userRank,
          updatedAt: new Date().toISOString()
        }
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