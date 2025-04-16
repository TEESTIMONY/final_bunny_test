const express = require('express');
const router = express.Router();
const { databases, DATABASE_ID, USERS_COLLECTION_ID, REFERRALS_COLLECTION_ID } = require('../config/appwrite');
const { verifyToken } = require('../middleware/auth');

// Add caching for referral data
const referralCache = {
    data: new Map(),
    timestamp: 0,
    expirationTime: 5 * 60 * 1000, // 5 minutes

    get(userId) {
        const cachedData = this.data.get(userId);
        if (cachedData && Date.now() - cachedData.timestamp < this.expirationTime) {
            return cachedData.data;
        }
        return null;
    },

    set(userId, data) {
        this.data.set(userId, {
            data,
            timestamp: Date.now()
        });
    }
};

// Modify checkReferral to use caching
async function checkReferral(userId) {
    // Check cache first
    const cachedData = referralCache.get(userId);
    if (cachedData) {
        console.log('Using cached referral data for user:', userId);
        return cachedData;
    }

    try {
        const referralDoc = await databases.getDocument(
            DATABASE_ID,
            REFERRALS_COLLECTION_ID,
            userId
        );

        if (!referralDoc) {
            referralCache.set(userId, null);
            return null;
        }

        referralCache.set(userId, referralDoc);
        return referralDoc;
    } catch (error) {
        console.error('Error checking referral:', error);
        throw error;
    }
}

// Modify processReferral to use Appwrite
async function processReferral(referrerId, referredId) {
    try {
        // Check if referral already exists
        const existingReferral = await databases.listDocuments(
            DATABASE_ID,
            REFERRALS_COLLECTION_ID,
            [
                `equal("referrerId", "${referrerId}")`,
                `equal("referredId", "${referredId}")`
            ]
        );
        
        if (existingReferral.documents.length > 0) {
            throw new Error('Referral already processed');
        }

        // Get both users' data in parallel
        const [referrerDoc, referredDoc] = await Promise.all([
            databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, referrerId),
            databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, referredId)
        ]);

        if (!referrerDoc || !referredDoc) {
            throw new Error('One or both users not found');
        }

        // Create referral record
        const referralData = {
            referrerId,
            referredId,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        // Create referral document
        const referralDoc = await databases.createDocument(
            DATABASE_ID,
            REFERRALS_COLLECTION_ID,
            'unique()',
            referralData
        );

        // Update referrer's referral count
        await databases.updateDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            referrerId,
            {
                referralCount: (referrerDoc.referralCount || 0) + 1
            }
        );

        // Update cache
        referralCache.set(referredId, referralData);

        return referralData;
    } catch (error) {
        console.error('Error processing referral:', error);
        throw error;
    }
}

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
    const [referrerDoc, referredDoc] = await Promise.all([
      databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, referrerId),
      databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, referredId)
    ]);
    
    if (!referrerDoc) {
      return res.status(404).json({ message: 'Referrer user not found' });
    }
    
    if (!referredDoc) {
      return res.status(404).json({ message: 'Referred user not found' });
    }
    
    // Check if this referral has already been processed
    const existingReferral = await databases.listDocuments(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      [
        `equal("referrerId", "${referrerId}")`,
        `equal("referredId", "${referredId}")`
      ]
    );
    
    if (existingReferral.documents.length > 0) {
      return res.status(400).json({ message: 'This referral has already been processed' });
    }
    
    // Update referrer: add 500 points to score and track referral count
    await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      referrerId,
      {
        score: (referrerDoc.score || 0) + 500,
        referralBonus: (referrerDoc.referralBonus || 0) + 500,
        updatedAt: new Date().toISOString()
      }
    );
    
    // Update referred user: add 200 points to their score
    await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      referredId,
      {
        score: (referredDoc.score || 0) + 200,
        referralBonus: (referredDoc.referralBonus || 0) + 200,
        updatedAt: new Date().toISOString()
      }
    );
    
    // Record the referral to prevent duplicates
    await databases.createDocument(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      'unique()',
      {
        referrerId: referrerId,
        referredId: referredId,
        referrerUsername: referrerDoc.username,
        referredUsername: referredDoc.username,
        referrerBonus: 500,
        referredBonus: 200,
        processedAt: new Date().toISOString()
      }
    );
    
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
    const userDoc = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId
    );
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get referrals made by this user
    const referralsResponse = await databases.listDocuments(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      [
        `equal("referrerId", "${userId}")`
      ]
    );
    
    res.status(200).json({
      referralCount: userDoc.referralCount || 0,
      referralBonus: userDoc.referralBonus || 0,
      referrals: referralsResponse.documents
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
    
    // Update user's referral count
    await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      {
        referralCount: referralCount || 0,
        updatedAt: new Date().toISOString()
      }
    );
    
    res.status(200).json({ message: 'Referral count updated successfully' });
  } catch (error) {
    console.error('Error updating referral count:', error);
    res.status(500).json({ message: 'Error updating referral count', error: error.message });
  }
});

module.exports = router; 