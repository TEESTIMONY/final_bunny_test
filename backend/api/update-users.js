const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

/**
 * @route POST /api/update-users
 * @desc Add referralCount field to all users
 * @access Admin only (no auth check for simplicity)
 */
router.post('/', async (req, res) => {
  try {
    console.log('Starting to update users with referralCount field...');
    
    // Get all users
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      return res.status(200).json({ message: 'No users found', updated: 0 });
    }
    
    let updateCount = 0;
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      const userData = doc.data();
      
      // Check if user doesn't have a referralCount field
      if (userData.referralCount === undefined) {
        console.log(`Adding referralCount to user: ${userData.username || doc.id}`);
        const userRef = db.collection('users').doc(doc.id);
        batch.update(userRef, { 
          referralCount: 0,
          updatedAt: new Date().toISOString()
        });
        updateCount++;
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
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