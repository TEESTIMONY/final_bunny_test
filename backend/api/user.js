const express = require('express');
const router = express.Router();
const { account, databases, DATABASE_ID, USERS_COLLECTION_ID } = require('../config/appwrite');
const { verifyToken } = require('../middleware/auth');

/**
 * Helper function to format timestamp into a readable date string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return null;
  
  let date;
  if (typeof timestamp === 'string') {
    // ISO string format
    date = new Date(timestamp);
  } else {
    // If it's already a Date object or timestamp in milliseconds
    date = new Date(timestamp);
  }
  
  if (isNaN(date.getTime())) return null;
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * @route GET /api/user/:userId
 * @desc Get user data by ID
 * @access Public
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user data from Appwrite
    const user = await account.get(userId);
    
    // Get additional user data from Appwrite Database
    const userDoc = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId
    );
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found in database' });
    }
    
    // Get user rank if stored, or calculate it if not available
    let userRank = userDoc.rank;
    
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
    
    res.status(200).json({
      uid: user.$id,
      email: user.email,
      displayName: user.name || userDoc.username,
      username: userDoc.username,
      score: userDoc.score || userDoc.highScore || 0,
      highScore: userDoc.highScore || 0,
      lastGameScore: userDoc.lastGameScore || 0,
      gamesPlayed: userDoc.gamesPlayed || 0,
      rank: userRank || 999, // Default to a high rank if calculation failed
      referralCount: userDoc.referralCount || 0, // Include referral count
      referralBonus: userDoc.referralBonus || 0, // Include referral bonus points
      createdAt: formatTimestamp(userDoc.createdAt)
    });
    
  } catch (error) {
    console.error('Error getting user data:', error);
    
    if (error.type === 'user_not_found') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Error retrieving user data', error: error.message });
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
        referralCount: userDoc.referralCount || 0,
        referralBonus: userDoc.referralBonus || 0,
        createdAt: formatTimestamp(userDoc.createdAt)
      }
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.type === 'user_not_found') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

module.exports = router; 