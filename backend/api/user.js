const express = require('express');
const router = express.Router();
const { account, databases, DATABASE_ID, USERS_COLLECTION_ID } = require('../config/appwrite');
const { verifyToken } = require('../middleware/auth');
const LRU = require('lru-cache');

// Create an in-memory cache for user data
// 200 users max, items expire after 5 minutes
const userCache = new LRU({
  max: 200,
  ttl: 5 * 60 * 1000, // 5 minutes
  allowStale: true,   // Return stale items before removing
  updateAgeOnGet: true, // Update age when getting an item
});

/**
 * Helper function to format timestamp into a readable date string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return null;
  
  try {
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    
    return new Date(timestamp).toISOString();
  } catch (e) {
    console.error('Error formatting timestamp:', e);
    return null;
  }
}

/**
 * @route GET /api/user/:userId
 * @desc Get user data by ID
 * @access Public
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { skipCache } = req.query;
    
    // Check for valid userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Check cache first unless skipCache is specified
    if (skipCache !== 'true' && userCache.has(userId)) {
      const cachedUser = userCache.get(userId);
      console.log(`Using cached data for user ${userId}`);
      return res.status(200).json(cachedUser);
    }
    
    // If not in cache, get from database
    const user = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user rank if stored, or calculate it if not available
    let userRank = user.rank;
    
    if (userRank === undefined) {
      // Get all users sorted by highScore in descending order for rank calculation
      const usersResponse = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [
          'orderDesc("highScore")'
        ]
      );
      
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
      
      // Update the user's rank in database for future queries
      await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId,
        { 
          rank: userRank,
          updatedAt: new Date().toISOString()
        }
      );
    }
    
    // Process user data
    const userData = {
      uid: user.$id,
      email: user.email,
      username: user.username,
      displayName: user.name || user.username,
      score: user.score || user.highScore || 0,
      highScore: user.highScore || 0,
      lastGameScore: user.lastGameScore || 0,
      gamesPlayed: user.gamesPlayed || 0,
      rank: userRank || 999,
      referralCount: user.referralCount || 0,
      referralBonus: user.referralBonus || 0,
      createdAt: formatTimestamp(user.createdAt),
      updatedAt: formatTimestamp(user.updatedAt)
    };
    
    // Store in cache for future requests
    userCache.set(userId, userData);
    
    res.status(200).json(userData);
  } catch (error) {
    // Handle document not found separately
    if (error.type === 'document_not_found') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

/**
 * @route PUT /api/user/:userId
 * @desc Update user data
 * @access Private (requires authentication)
 */
router.put('/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, username } = req.body;
    
    // Check if the requested userId matches the authenticated user
    if (req.user.uid !== userId) {
      return res.status(403).json({ message: 'Forbidden: Cannot update other user data' });
    }
    
    // Update object for Appwrite Database
    const updates = {};
    
    // Update object for Appwrite Account
    const accountUpdates = {};
    
    if (displayName) {
      updates.displayName = displayName;
      accountUpdates.name = displayName;
    }
    
    if (username) {
      updates.username = username;
    }
    
    // Update in Appwrite Account if needed
    if (Object.keys(accountUpdates).length > 0) {
      await account.updateName(accountUpdates.name);
    }
    
    // Update in Appwrite Database
    if (Object.keys(updates).length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId,
        {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      );
    }
    
    // Get updated user data
    const user = await account.get(userId);
    const userDoc = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId
    );
    
    // Update cache
    userCache.set(userId, {
      uid: user.$id,
      email: user.email,
      username: user.username,
      displayName: user.name || userDoc.username,
      score: userDoc.score || userDoc.highScore || 0,
      highScore: userDoc.highScore || 0,
      lastGameScore: userDoc.lastGameScore || 0,
      gamesPlayed: userDoc.gamesPlayed || 0,
      rank: userDoc.rank || 999,
      referralCount: userDoc.referralCount || 0,
      referralBonus: userDoc.referralBonus || 0,
      createdAt: formatTimestamp(userDoc.createdAt),
      updatedAt: formatTimestamp(userDoc.updatedAt)
    });
    
    res.status(200).json({
      message: 'User updated successfully',
      user: {
        uid: user.$id,
        email: user.email,
        displayName: user.name || userDoc.username,
        username: userDoc.username,
        score: userDoc.score || userDoc.highScore || 0,
        highScore: userDoc.highScore || 0,
        lastGameScore: userDoc.lastGameScore || 0,
        gamesPlayed: userDoc.gamesPlayed || 0,
        rank: userDoc.rank || 999,
        referralCount: userDoc.referralCount || 0,
        referralBonus: userDoc.referralBonus || 0,
        createdAt: formatTimestamp(userDoc.createdAt),
        updatedAt: formatTimestamp(userDoc.updatedAt)
      }
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.type === 'document_not_found') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

/**
 * @route DELETE /api/user/:userId/cache
 * @desc Clear the cache for a specific user
 * @access Public
 */
router.delete('/:userId/cache', (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  
  // Clear cache for this user
  const existed = userCache.has(userId);
  userCache.delete(userId);
  
  res.status(200).json({ 
    message: existed ? 'Cache cleared for user' : 'No cache entry found for user',
    userId
  });
});

module.exports = router; 