require('dotenv').config();
const { databases, DATABASE_ID, USERS_COLLECTION_ID } = require('../backend/config/appwrite');

/**
 * Helper function to format timestamp into a readable date string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return null;
  
  let date;
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
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

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle POST request for creating new user
  if (req.method === 'POST') {
    try {
      const userData = req.body;
      
      // Validate required fields
      if (!userData.userId || !userData.email || !userData.username) {
        return res.status(400).json({ 
          message: 'Missing required fields', 
          required: ['userId', 'email', 'username'] 
        });
      }

      // Create user document
      const newUser = await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userData.userId, // Use the Appwrite user ID as document ID
        {
          email: userData.email,
          username: userData.username,
          displayName: userData.displayName || userData.username,
          score: userData.score || 0,
          highScore: userData.highScore || 0,
          lastGameScore: userData.lastGameScore || 0,
          gamesPlayed: userData.gamesPlayed || 0,
          rank: userData.rank || 999,
          referralCount: userData.referralCount || 0,
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      return res.status(201).json({
        message: 'User created successfully',
        user: {
          uid: newUser.$id,
          email: newUser.email,
          username: newUser.username,
          displayName: newUser.displayName,
          score: newUser.score,
          highScore: newUser.highScore,
          lastGameScore: newUser.lastGameScore,
          gamesPlayed: newUser.gamesPlayed,
          rank: newUser.rank,
          referralCount: newUser.referralCount,
          createdAt: formatTimestamp(newUser.createdAt)
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ 
        message: 'Error creating user', 
        error: error.message 
      });
    }
  }

  // Handle GET request for listing users
  if (req.method === 'GET') {
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
      const users = response.documents.map(user => ({
        uid: user.$id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        score: user.score || user.highScore || 0,
        highScore: user.highScore || 0,
        lastGameScore: user.lastGameScore || 0,
        gamesPlayed: user.gamesPlayed || 0,
        rank: user.rank || 999,
        referralCount: user.referralCount || 0,
        createdAt: formatTimestamp(user.createdAt)
      }));
      
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
  }

  // Handle unsupported methods
  res.status(405).json({ message: 'Method not allowed' });
}; 