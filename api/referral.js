const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp(functions.config().firebase);
}

const db = admin.firestore();

// API endpoint to process referrals
exports.processReferral = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  
  try {
    const { referrerId, newUserId, newUsername } = req.body;
    
    if (!referrerId || !newUserId || !newUsername) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }
    
    // Check if users exist
    const referrerDoc = await db.collection('users').doc(referrerId).get();
    const newUserDoc = await db.collection('users').doc(newUserId).get();
    
    if (!referrerDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Referrer not found' 
      });
    }
    
    if (!newUserDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'New user not found' 
      });
    }
    
    // Check if this referral has already been processed
    const existingReferral = await db.collection('referrals')
      .where('referrerId', '==', referrerId)
      .where('newUserId', '==', newUserId)
      .get();
    
    if (!existingReferral.empty) {
      return res.status(400).json({ 
        success: false, 
        error: 'Referral already processed' 
      });
    }
    
    // Amount of points to award
    const REFERRAL_POINTS = 200;
    
    // Transactions to update both users and record the referral
    await db.runTransaction(async (transaction) => {
      // Update referrer's points
      const referrerRef = db.collection('users').doc(referrerId);
      const referrer = await transaction.get(referrerRef);
      const referrerData = referrer.data();
      
      transaction.update(referrerRef, {
        score: (referrerData.score || 0) + REFERRAL_POINTS
      });
      
      // Update new user's points
      const newUserRef = db.collection('users').doc(newUserId);
      const newUser = await transaction.get(newUserRef);
      const newUserData = newUser.data();
      
      transaction.update(newUserRef, {
        score: (newUserData.score || 0) + REFERRAL_POINTS
      });
      
      // Record the referral in a separate collection
      const referralRef = db.collection('referrals').doc();
      transaction.set(referralRef, {
        referrerId: referrerId,
        referrerName: referrerData.displayName,
        newUserId: newUserId,
        newUserName: newUsername,
        pointsAwarded: REFERRAL_POINTS,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    // Create notification for both users
    const batch = db.batch();
    
    // Notification for referrer
    const referrerNotifRef = db.collection('notifications').doc();
    batch.set(referrerNotifRef, {
      userId: referrerId,
      type: 'referral_completed',
      message: `${newUsername} signed up using your referral link! You've earned ${REFERRAL_POINTS} points.`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Notification for new user
    const newUserNotifRef = db.collection('notifications').doc();
    batch.set(newUserNotifRef, {
      userId: newUserId,
      type: 'referral_bonus',
      message: `You've earned ${REFERRAL_POINTS} points from a referral bonus! Welcome to Hop Bunny!`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await batch.commit();
    
    return res.status(200).json({
      success: true,
      message: 'Referral processed successfully',
      pointsAwarded: REFERRAL_POINTS
    });
    
  } catch (error) {
    console.error('Error processing referral:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error processing referral'
    });
  }
}); 