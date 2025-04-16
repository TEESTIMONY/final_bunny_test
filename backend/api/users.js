const express = require('express');
const router = express.Router();
const { databases, DATABASE_ID, USERS_COLLECTION_ID } = require('../config/appwrite');
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
 * @route GET /api/users
 * @desc Get all registered users with pagination and filtering
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 10, offset = 0, sortBy = 'createdAt', sortDir = 'desc', username } = req.query;
    
    // Convert parameters to appropriate types
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    // Build query parameters
    const queries = [];
    
    // Apply sorting
    queries.push(`order${sortDir === 'desc' ? 'Desc' : 'Asc'}("${sortBy}")`);
    
    // Apply filtering if username is provided
    if (username) {
      queries.push(`search("username", "${username}")`);
    }
    
    // Execute the query
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      queries,
      limitNum,
      offsetNum
    );
    
    if (response.documents.length === 0) {
      return res.status(200).json({ users: [], total: 0 });
    }
    
    // Get total count for pagination info
    const total = response.total;
    
    // Process the results
    const users = [];
    
    // For rank calculation, get all high scores if sorting by highScore
    let userRanks = {};
    if (sortBy === 'highScore' && sortDir === 'desc') {
      // Ranks are already in order
      let lastHighScore = Infinity;
      let currentRank = 0;
      
      response.documents.forEach(user => {
        const highScore = user.highScore || 0;
        
        // If this is a new score tier, increment the rank
        if (highScore < lastHighScore) {
          currentRank++;
          lastHighScore = highScore;
        }
        
        userRanks[user.$id] = currentRank;
      });
    }
    
    response.documents.forEach(user => {
      // Determine rank from calculated ranks if available, or use stored rank
      let rank = user.rank;
      
      if (userRanks[user.$id]) {
        rank = userRanks[user.$id];
        
        // Update rank in database if it's changed or not set
        if (rank !== user.rank) {
          databases.updateDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            user.$id,
            { 
              rank: rank,
              updatedAt: new Date().toISOString()
            }
          ).catch(err => console.error('Error updating user rank:', err));
        }
      }

      // If user doesn't have referralCount, add it to the document
      if (user.referralCount === undefined) {
        console.log(`Adding missing referralCount field to user ${user.$id}`);
        databases.updateDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          user.$id,
          {
            referralCount: 0,
            updatedAt: new Date().toISOString()
          }
        ).catch(err => console.error('Error adding referralCount:', err));
      }
      
      users.push({
        uid: user.$id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        score: user.score || user.highScore || 0,
        highScore: user.highScore || 0,
        lastGameScore: user.lastGameScore || 0,
        gamesPlayed: user.gamesPlayed || 0,
        rank: rank || 999, // Default to a high rank if not calculated/stored
        referralCount: user.referralCount || 0, // Include referral count
        createdAt: formatTimestamp(user.createdAt)
      });
    });
    
    res.status(200).json({
      users,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: users.length + offsetNum < total
      }
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

module.exports = router; 