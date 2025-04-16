const express = require('express');
const router = express.Router();
const { databases, DATABASE_ID, USERS_COLLECTION_ID } = require('../config/appwrite');

/**
 * @route POST /api/update-users
 * @desc Add referralCount field to all users
 * @access Admin only (no auth check for simplicity)
 */
router.post('/', async (req, res) => {
  try {
    console.log('Starting to update users with referralCount field...');
    
    // Get all users
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID
    );
    
    if (response.documents.length === 0) {
      return res.status(200).json({ message: 'No users found', updated: 0 });
    }
    
    let updateCount = 0;
    
    for (const user of response.documents) {
      // Check if user doesn't have a referralCount field
      if (user.referralCount === undefined) {
        console.log(`Adding referralCount to user: ${user.username || user.$id}`);
        await databases.updateDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          user.$id,
          { 
            referralCount: 0,
            updatedAt: new Date().toISOString()
          }
        );
        updateCount++;
      }
    }
    
    if (updateCount > 0) {
      console.log(`Successfully updated ${updateCount} users`);
      return res.status(200).json({ 
        message: `Successfully added referralCount to ${updateCount} users`,
        updated: updateCount
      });
    } else {
      console.log('All users already have referralCount field');
      return res.status(200).json({ 
        message: 'All users already have referralCount field',
        updated: 0
      });
    }
    
  } catch (error) {
    console.error('Error updating users:', error);
    return res.status(500).json({ 
      message: 'Error updating users', 
      error: error.message 
    });
  }
});

module.exports = router; 