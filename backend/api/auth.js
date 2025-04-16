const express = require('express');
const router = express.Router();
const { account, databases, DATABASE_ID, USERS_COLLECTION_ID, REFERRALS_COLLECTION_ID } = require('../config/appwrite');
const axios = require('axios');

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

    // Create user with Appwrite
    const user = await account.create('unique()', email, password, username);
    
    // Create user document in Appwrite Database
    await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      user.$id,
      {
        email,
        username,
        displayName: username,
        score: 0,
        highScore: 0,
        createdAt: new Date().toISOString()
      }
    );

    // Process referral if provided
    let referralBonus = 0;
    if (referrerId) {
      try {
        // Amount of points to award
        const REFERRER_POINTS = 500;
        const NEW_USER_POINTS = 200;

        // Update referrer's points
        const referrerDoc = await databases.getDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          referrerId
        );
        
        if (referrerDoc) {
          console.log(`Processing referral: Referrer ${referrerDoc.username || referrerId} (current score: ${referrerDoc.score || 0}) will get ${REFERRER_POINTS} points`);
          
          await databases.updateDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            referrerId,
            {
              score: (referrerDoc.score || 0) + REFERRER_POINTS,
              referralBonus: (referrerDoc.referralBonus || 0) + REFERRER_POINTS
            }
          );
          
          // Update new user's points
          await databases.updateDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            user.$id,
            {
              score: NEW_USER_POINTS,
              referralBonus: NEW_USER_POINTS
            }
          );

          // Record the referral
          await databases.createDocument(
            DATABASE_ID,
            REFERRALS_COLLECTION_ID,
            'unique()',
            {
              referrerId: referrerId,
              referrerName: referrerDoc.username || referrerUsername,
              newUserId: user.$id,
              newUserName: username,
              referrerPointsAwarded: REFERRER_POINTS,
              newUserPointsAwarded: NEW_USER_POINTS,
              createdAt: new Date().toISOString()
            }
          );

          referralBonus = NEW_USER_POINTS;
          console.log(`Referral processed: ${referrerId} (awarded ${REFERRER_POINTS} pts) referred ${user.$id} (awarded ${NEW_USER_POINTS} pts)`);
        }
      } catch (referralError) {
        console.error('Error processing referral:', referralError);
        // We continue registration process even if referral processing fails
      }
    }

    // Create session for the new user
    const session = await account.createSession(email, password);

    res.status(201).json({
      message: 'User registered successfully',
      token: session.secret,
      userId: user.$id,
      referralBonus,
      user: {
        uid: user.$id,
        email: user.email,
        displayName: user.name
      }
    });
    
    console.log(`Registration completed successfully for ${username}. Referral bonus: ${referralBonus}`);
  } catch (error) {
    console.error('Error registering user:', error);
    
    if (error.type === 'user_already_exists') {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    if (error.type === 'invalid_email') {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    if (error.type === 'invalid_password') {
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

    // Create session with Appwrite
    const session = await account.createSession(email, password);
    const user = await account.get();

    // Get user data from Appwrite Database
    const userDoc = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      user.$id
    );
    
    res.status(200).json({
      message: 'Login successful',
      token: session.secret,
      userId: user.$id,
      score: userDoc?.score || 0,
      highScore: userDoc?.highScore || 0,
      referralCount: userDoc?.referralCount || 0,
      referralBonus: userDoc?.referralBonus || 0,
      user: {
        uid: user.$id,
        email: user.email,
        displayName: user.name || userDoc?.username,
        highScore: userDoc?.highScore || 0,
        score: userDoc?.score || 0,
        referralCount: userDoc?.referralCount || 0,
        referralBonus: userDoc?.referralBonus || 0
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    
    if (error.type === 'user_not_found' || error.type === 'invalid_credentials') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

/**
 * @route POST /api/auth/verify-token
 * @desc Verify an Appwrite session
 * @access Public
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }
    
    // Verify the session
    const session = await account.getSession(token);
    const user = await account.get();
    
    // Get additional user data from Appwrite Database
    const userDoc = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      user.$id
    );
    
    res.status(200).json({
      message: 'Token is valid',
      userId: user.$id,
      user: {
        uid: user.$id,
        email: user.email,
        displayName: user.name || userDoc?.username,
        highScore: userDoc?.highScore || 0,
        score: userDoc?.score || 0,
        referralCount: userDoc?.referralCount || 0,
        referralBonus: userDoc?.referralBonus || 0
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router; 