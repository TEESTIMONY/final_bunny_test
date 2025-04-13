const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

/**
 * Helper function to format timestamp into a readable date string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return null;
  
  let date;
  if (timestamp._seconds) {
    // Firestore Timestamp format
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp.seconds) {
    // Another possible Firestore format
    date = new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp === 'string') {
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
    
    // Get user data from Firebase Auth
    const userRecord = await auth.getUser(userId);
    
    // Get additional user data from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found in database' });
    }
    
    const userData = userDoc.data();
    
    // Get user rank if stored, or calculate it if not available
    let userRank = userData.rank;
    
    if (userRank === undefined) {
      // Get all users sorted by highScore in descending order for rank calculation
      const usersSnapshot = await db.collection('users')
        .orderBy('highScore', 'desc')
        .get();
      
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
      
      // Update the user's rank in database for future queries
      await db.collection('users').doc(userId).update({ 
        rank: userRank,
        updatedAt: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || userData.username,
      username: userData.username,
      score: userData.score || userData.highScore || 0,
      highScore: userData.highScore || 0,
      lastGameScore: userData.lastGameScore || 0,
      gamesPlayed: userData.gamesPlayed || 0,
      rank: userRank || 999, // Default to a high rank if calculation failed
      referralCount: userData.referralCount || 0, // Include referral count
      referralBonus: userData.referralBonus || 0, // Include referral bonus points
      createdAt: formatTimestamp(userData.createdAt)
    });
    
  } catch (error) {
    console.error('Error getting user data:', error);
    
    if (error.code === 'auth/user-not-found') {
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
    
    // Update object for Firestore
    const updates = {};
    
    // Update object for Auth
    const authUpdates = {};
    
    if (displayName) {
      updates.displayName = displayName;
      authUpdates.displayName = displayName;
    }
    
    if (username) {
      updates.username = username;
    }
    
    // Update in Firebase Auth if needed
    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(userId, authUpdates);
    }
    
    // Update in Firestore
    if (Object.keys(updates).length > 0) {
      await db.collection('users').doc(userId).update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
    }
    
    // Get updated user data
    const userRecord = await auth.getUser(userId);
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    res.status(200).json({
      message: 'User updated successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || userData.username,
        username: userData.username,
        score: userData.score || userData.highScore || 0,
        highScore: userData.highScore || 0,
        lastGameScore: userData.lastGameScore || 0,
        gamesPlayed: userData.gamesPlayed || 0,
        referralCount: userData.referralCount || 0,
        referralBonus: userData.referralBonus || 0,
        createdAt: formatTimestamp(userData.createdAt)
      }
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

module.exports = router; 