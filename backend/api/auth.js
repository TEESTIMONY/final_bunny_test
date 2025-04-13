const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, referrerId, referrerUsername } = req.body;

    console.log(`Registration attempt for ${username} (${email})`);
    
    if (referrerId) {
      console.log(`Registration includes referral data: referrerId=${referrerId}, referrerUsername=${referrerUsername || 'not provided'}`);
    }

    if (!email || !password || !username) {
      return res.status(400).json({ message: 'Please provide email, password, and username' });
    }

    // Create user with Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: username
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      username,
      displayName: username,
      score: 0,
      highScore: 0,
      createdAt: new Date().toISOString()
    });

    // Generate a custom token for the client
    const token = await auth.createCustomToken(userRecord.uid);

    // Process referral if provided
    let referralBonus = 0;
    if (referrerId) {
      try {
        // Amount of points to award
        const REFERRER_POINTS = 500;
        const NEW_USER_POINTS = 200;

        // Update referrer's points
        const referrerRef = db.collection('users').doc(referrerId);
        const referrerDoc = await referrerRef.get();
        
        if (referrerDoc.exists) {
          const referrerData = referrerDoc.data();
          console.log(`Processing referral: Referrer ${referrerData.username || referrerId} (current score: ${referrerData.score || 0}) will get ${REFERRER_POINTS} points`);
          
          await referrerRef.update({
            score: (referrerData.score || 0) + REFERRER_POINTS,
            referralBonus: (referrerData.referralBonus || 0) + REFERRER_POINTS
          });
          
          console.log(`Updated referrer score: ${(referrerData.score || 0) + REFERRER_POINTS} (+${REFERRER_POINTS} points)`);
          // Verify the update was successful by getting the updated document
          const updatedReferrerDoc = await referrerRef.get();
          const updatedReferrerData = updatedReferrerDoc.data();
          console.log(`VERIFICATION - Referrer new score: ${updatedReferrerData.score}, Referral count: ${updatedReferrerData.referralCount}`);

          // Update new user's points
          const newUserRef = db.collection('users').doc(userRecord.uid);
          const newUserDoc = await newUserRef.get();
          const newUserData = newUserDoc.data();
          
          console.log(`New user ${username} (current score: ${newUserData.score || 0}) will get ${NEW_USER_POINTS} points`);
          
          await newUserRef.update({
            score: (newUserData.score || 0) + NEW_USER_POINTS,
            referralBonus: (newUserData.referralBonus || 0) + NEW_USER_POINTS
          });
          
          console.log(`Updated new user score: ${(newUserData.score || 0) + NEW_USER_POINTS} (+${NEW_USER_POINTS} points)`);
          // Verify the update was successful by getting the updated document
          const updatedNewUserDoc = await newUserRef.get();
          const updatedNewUserData = updatedNewUserDoc.data();
          console.log(`VERIFICATION - New user score: ${updatedNewUserData.score}, Referral bonus: ${updatedNewUserData.referralBonus}`);

          // Record the referral
          await db.collection('referrals').add({
            referrerId: referrerId,
            referrerName: referrerData.username || referrerUsername,
            newUserId: userRecord.uid,
            newUserName: username,
            referrerPointsAwarded: REFERRER_POINTS,
            newUserPointsAwarded: NEW_USER_POINTS,
            createdAt: new Date().toISOString()
          });

          referralBonus = NEW_USER_POINTS;
          console.log(`Referral processed: ${referrerId} (awarded ${REFERRER_POINTS} pts) referred ${userRecord.uid} (awarded ${NEW_USER_POINTS} pts)`);
        }
      } catch (referralError) {
        console.error('Error processing referral:', referralError);
        // We continue registration process even if referral processing fails
      }
    }

    res.status(201).json({
      message: 'User registered successfully',
      token,
      userId: userRecord.uid,
      referralBonus,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      }
    });
    
    console.log(`Registration completed successfully for ${username}. Referral bonus: ${referralBonus}`);
  } catch (error) {
    console.error('Error registering user:', error);
    
    // Handle Firebase Auth specific errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ message: 'Password is too weak' });
    }
    
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Try to find the user by email
    const userRecord = await auth.getUserByEmail(email);

    // Since Firebase Admin SDK doesn't have a native way to verify passwords,
    // we'll just create a token based on the found user
    // In a real implementation, you should use Firebase Client SDK on frontend
    // for proper authentication with password
    
    const token = await auth.createCustomToken(userRecord.uid);
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();

    res.status(200).json({
      message: 'Login successful',
      token,
      userId: userRecord.uid,
      score: userData?.score || 0,
      highScore: userData?.highScore || 0,
      referralCount: userData?.referralCount || 0,
      referralBonus: userData?.referralBonus || 0,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || userData?.username,
        highScore: userData?.highScore || 0,
        score: userData?.score || 0,
        referralCount: userData?.referralCount || 0,
        referralBonus: userData?.referralBonus || 0
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    
    // Handle Firebase Auth specific errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

/**
 * @route POST /api/auth/verify-token
 * @desc Verify a Firebase ID token
 * @access Public
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }
    
    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Get user data
    const userRecord = await auth.getUser(uid);
    
    // Get additional user data from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    
    res.status(200).json({
      message: 'Token is valid',
      userId: uid,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || userData.username,
        highScore: userData.highScore || 0
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router; 