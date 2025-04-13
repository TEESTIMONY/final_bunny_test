const { db } = require('../config/firebase');

async function addReferralCountToAllUsers() {
  try {
    console.log('Starting to update users...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('No users found');
      return;
    }
    
    let updateCount = 0;
    const batch = db.batch();
    
    usersSnapshot.forEach(doc => {
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
    } else {
      console.log('All users already have referralCount field');
    }
    
  } catch (error) {
    console.error('Error updating users:', error);
  }
}

// Run the function
addReferralCountToAllUsers(); 