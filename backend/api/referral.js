const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

/**
 * @route POST /api/referral
 * @desc Process a referral: Award 500 points to referrer and 200 points to referred user
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    const { referrerId, referredId } = req.body;
    
    // Validate input
    if (!referrerId || !referredId) {
      return res.status(400).json({ message: 'Both referrer and referred user IDs are required' });
    }
    
    // Check if users exist
    const referrerRef = db.collection('users').doc(referrerId);
    const referredRef = db.collection('users').doc(referredId);
    
    const [referrerDoc, referredDoc] = await Promise.all([
      referrerRef.get(),
      referredRef.get()
    ]);
    
    if (!referrerDoc.exists) {
      return res.status(404).json({ message: 'Referrer user not found' });
    }
    
    if (!referredDoc.exists) {
      return res.status(404).json({ message: 'Referred user not found' });
    }
    
    // Get current user data
    const referrerData = referrerDoc.data();
    const referredData = referredDoc.data();
    
    // Check if this referral has already been processed
    const referralsCollection = db.collection('referrals');
    const existingReferral = await referralsCollection
      .where('referrerId', '==', referrerId)
      .where('referredId', '==', referredId)
      .get();
    
    if (!existingReferral.empty) {
      return res.status(400).json({ message: 'This referral has already been processed' });
    }
    
    // Update referrer: add 500 points to score and track referral count
    await referrerRef.update({
      score: (referrerData.score || 0) + 500,
      // NOTE: referralCount is not incremented here - that's now handled by update-score.js with the incrementReferralCount flag
      referralBonus: (referrerData.referralBonus || 0) + 500,
      updatedAt: new Date().toISOString()
    });
    
    // Update referred user: add 200 points to their score
    await referredRef.update({
      score: (referredData.score || 0) + 200,
      referralBonus: (referredData.referralBonus || 0) + 200,
      updatedAt: new Date().toISOString()
    });
    
    // Record the referral to prevent duplicates
    await referralsCollection.add({
      referrerId: referrerId,
      referredId: referredId,
      referrerUsername: referrerData.username,
      referredUsername: referredData.username,
      referrerBonus: 500,
      referredBonus: 200,
      processedAt: new Date().toISOString()
    });
    
    console.log(`Referral processed: ${referrerId} referred ${referredId}`);
    
    return res.status(200).json({
      message: 'Referral processed successfully',
      referrerBonus: 500,
      referredBonus: 200
    });
    
  } catch (error) {
    console.error('Error processing referral:', error);
    res.status(500).json({ message: 'Error processing referral', error: error.message });
  }
});

/**
 * @route GET /api/referral/stats/:userId
 * @desc Get referral statistics for a user
 * @access Public
 */
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Get referrals made by this user
    const referralsQuery = await db.collection('referrals')
      .where('referrerId', '==', userId)
      .get();
    
    const referrals = [];
    referralsQuery.forEach(doc => {
      referrals.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      referralCount: userData.referralCount || 0,
      referralBonus: userData.referralBonus || 0,
      referrals: referrals
    });
    
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({ message: 'Error getting referral stats', error: error.message });
  }
});

/**
 * @route POST /api/referral/update-count
 * @desc Update a user's referral count
 * @access Public
 */
router.post('/update-count', async (req, res) => {
  try {
    const { userId, referralCount } = req.body;
    
    // Validate input
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    if (referralCount === undefined || referralCount === null) {
      return res.status(400).json({ message: 'Referral count is required' });
    }
    
    // Make sure referral count is a number
    const numericCount = parseInt(referralCount);
    if (isNaN(numericCount)) {
      return res.status(400).json({ message: 'Referral count must be a number' });
    }
    
    // Get the user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found in database' });
    }
    
    // Update the user's referral count
    await userRef.update({
      referralCount: numericCount,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`Updated referral count for user ${userId} to ${numericCount}`);
    
    return res.status(200).json({
      message: 'Referral count updated successfully',
      userId,
      referralCount: numericCount
    });
    
  } catch (error) {
    console.error('Error updating referral count:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Error updating referral count', error: error.message });
  }
});

/**
 * @route GET /api/referral/count/:userId
 * @desc Get a user's referral count
 * @access Public
 */
router.get('/count/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get the user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found in database' });
    }
    
    const userData = userDoc.data();
    const referralCount = userData.referralCount || 0;
    
    return res.status(200).json({
      userId,
      referralCount
    });
    
  } catch (error) {
    console.error('Error getting referral count:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Error getting referral count', error: error.message });
  }
});

module.exports = router; 