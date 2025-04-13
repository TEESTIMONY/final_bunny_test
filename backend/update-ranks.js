/**
 * Update Ranks Script for Hop Bunny
 * This script updates all user records with their current rank based on high scores
 * Run with: node update-ranks.js
 */

const { db } = require('./config/firebase');

async function updateAllUserRanks() {
  console.log('Starting rank update for all users...');
  
  try {
    // Get all users sorted by highScore in descending order
    const usersSnapshot = await db.collection('users')
      .orderBy('highScore', 'desc')
      .get();
    
    if (usersSnapshot.empty) {
      console.log('No users found in database.');
      return;
    }
    
    console.log(`Found ${usersSnapshot.size} users to process.`);
    
    let batch = db.batch();
    let batchCount = 0;
    let lastHighScore = Infinity;
    let currentRank = 0;
    let updates = 0;
    
    // Process users in batches (Firestore limits batch operations to 500)
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userRef = db.collection('users').doc(doc.id);
      const highScore = userData.highScore || 0;
      
      // If this is a new score tier, increment the rank
      if (highScore < lastHighScore) {
        currentRank++;
        lastHighScore = highScore;
      }
      
      // Check if rank needs updating
      if (userData.rank !== currentRank) {
        batch.update(userRef, { 
          rank: currentRank,
          updatedAt: new Date().toISOString()
        });
        
        updates++;
        batchCount++;
        
        // Firestore has a limit of 500 operations per batch
        if (batchCount >= 450) { // Using 450 to be safe
          console.log(`Committing batch of ${batchCount} updates...`);
          batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    });
    
    // Commit any remaining updates
    if (batchCount > 0) {
      console.log(`Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }
    
    console.log(`Rank update completed. Updated ${updates} user records.`);
    
  } catch (error) {
    console.error('Error updating user ranks:', error);
  }
}

// Run the function
updateAllUserRanks().then(() => {
  console.log('Rank update process completed.');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error during rank update:', error);
  process.exit(1);
}); 