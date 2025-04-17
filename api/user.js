require('dotenv').config();
const { databases, DATABASE_ID, USERS_COLLECTION_ID } = require('../backend/config/appwrite');

/**
 * API handler for getting user information
 * GET: Retrieve a user by ID
 */
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

  // Extract the userId from the query parameters
  const { userId } = req.query;

  // Validate user ID
  if (!userId) {
    return res.status(400).json({ 
      message: 'Missing user ID',
      error: 'User ID is required as a query parameter'
    });
  }

  // Handle GET request for fetching user
  if (req.method === 'GET') {
    try {
      // Get the user document
      const user = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId
      );

      // Format user data
      const userData = {
        uid: user.$id,
        email: user.email,
        username: user.username || '',
        displayName: user.displayName || user.username || '',
        score: user.score || 0,
        highScore: user.highScore || 0,
        lastGameScore: user.lastGameScore || 0,
        gamesPlayed: user.gamesPlayed || 0,
        rank: user.rank || 999,
        referralCount: user.referralCount || 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return res.status(200).json(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
      
      // Check if document not found
      if (error.code === 404 || error.message?.includes('not found')) {
        return res.status(404).json({ 
          message: 'User not found', 
          error: `No user found with ID: ${userId}` 
        });
      }
      
      return res.status(500).json({ 
        message: 'Error fetching user', 
        error: error.message 
      });
    }
  }

  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}; 