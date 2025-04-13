// This script adds the referralCount field to all users in the database
// Run this script on your server after deployment

async function addReferralCountToAllUsers() {
  try {
    // Get all users
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.log('No users found');
      return;
    }
    
    let updateCount = 0;
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      const userData = doc.data();
      
      // Check if user doesn't have a referralCount field
      if (userData.referralCount === undefined) {
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
      console.log(`Successfully added referralCount to ${updateCount} users`);
    } else {
      console.log('All users already have the referralCount field');
    }
    
  } catch (error) {
    console.error('Error updating users:', error);
  }
}

module.exports = { addReferralCountToAllUsers }; 