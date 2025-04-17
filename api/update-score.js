require('dotenv').config();
const { databases, DATABASE_ID, USERS_COLLECTION_ID } = require('../backend/config/appwrite');

/**
 * API handler for updating a user's score
 * This endpoint takes a user ID and a score, and updates the user's total score in the database
 * It also updates the high score if the new score is higher than the existing high score
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

  // Only handle POST requests for updating scores
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed. Use POST.' });
  }

  try {
    const { userId, score } = req.body;

    // Validate required fields
    if (!userId || score === undefined) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['userId', 'score'] 
      });
    }

    // Make sure score is a number
    const numericScore = Number(score);
    if (isNaN(numericScore)) {
      return res.status(400).json({ 
        message: 'Score must be a number' 
      });
    }

    // Get the user document from the database
    let userDoc;
    try {
      userDoc = await databases.getDocument(
        DATABASE_ID, 
        USERS_COLLECTION_ID, 
        userId
      );
    } catch (error) {
      console.error('Error fetching user document:', error);
      return res.status(404).json({ 
        message: 'User not found', 
        error: error.message 
      });
    }

    // Calculate new stats
    const currentTotalScore = userDoc.score || 0;
    const currentHighScore = userDoc.highScore || 0;
    const currentGamesPlayed = userDoc.gamesPlayed || 0;

    // Calculate new values
    const newTotalScore = currentTotalScore + numericScore;
    const newHighScore = Math.max(currentHighScore, numericScore);
    const newGamesPlayed = currentGamesPlayed + 1;

    // Update the user document with new stats
    const updatedUser = await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      {
        score: newTotalScore,           // Accumulate the total score
        highScore: newHighScore,        // Update high score if needed
        lastGameScore: numericScore,    // Store last game score
        gamesPlayed: newGamesPlayed,    // Increment games played
        updatedAt: new Date().toISOString() // Update timestamp
      }
    );

    // Return the updated statistics
    return res.status(200).json({
      message: 'Score updated successfully',
      userId: updatedUser.$id,
      totalScore: newTotalScore,             // Total accumulated score
      highestSingleGameScore: newHighScore,  // Highest single game score
      lastGameScore: numericScore,           // Last game score
      gamesPlayed: newGamesPlayed,
      updatedAt: updatedUser.updatedAt
    });

  } catch (error) {
    console.error('Error updating score:', error);
    return res.status(500).json({ 
      message: 'Error updating score', 
      error: error.message 
    });
  }
}; 