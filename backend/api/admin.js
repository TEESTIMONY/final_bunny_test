const express = require('express');
const router = express.Router();
const { databases, DATABASE_ID, USERS_COLLECTION_ID, REFERRALS_COLLECTION_ID } = require('../config/appwrite');

// Enhanced admin caching with batch updates and prefetching
const adminCache = {
    data: new Map(),
    timestamp: 0,
    expirationTime: 5 * 60 * 1000, // 5 minutes
    updateInterval: 60 * 1000, // 1 minute
    lastUpdate: 0,
    updateInProgress: false,

    get(key) {
        const cachedData = this.data.get(key);
        if (cachedData && Date.now() - cachedData.timestamp < this.expirationTime) {
            return cachedData.data;
        }
        return null;
    },

    set(key, data) {
        this.data.set(key, {
            data,
            timestamp: Date.now()
        });
    },

    async update() {
        if (this.updateInProgress || Date.now() - this.lastUpdate < this.updateInterval) {
            return;
        }

        this.updateInProgress = true;
        try {
            // Batch fetch all required data
            const [usersResponse, referralsResponse] = await Promise.all([
                databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID),
                databases.listDocuments(DATABASE_ID, REFERRALS_COLLECTION_ID)
            ]);

            // Process data in memory
            const userStats = new Map();
            const referralStats = new Map();

            // Process referrals
            referralsResponse.documents.forEach(doc => {
                const referrerId = doc.referrerId;
                if (!referralStats.has(referrerId)) {
                    referralStats.set(referrerId, 0);
                }
                referralStats.set(referrerId, referralStats.get(referrerId) + 1);
            });

            // Process users and create paginated data
            const users = usersResponse.documents.map(user => {
                const userId = user.$id;
                const referrals = referralStats.get(userId) || 0;

                return {
                    ...user,
                    id: userId,
                    gamesPlayed: user.gamesPlayed || 0,
                    totalScore: user.score || 0,
                    referralCount: referrals
                };
            });

            // Sort users by score
            users.sort((a, b) => b.totalScore - a.totalScore);

            // Create paginated data
            const pageSize = 10;
            const totalPages = Math.ceil(users.length / pageSize);
            
            for (let page = 1; page <= totalPages; page++) {
                const start = (page - 1) * pageSize;
                const end = start + pageSize;
                const pageData = users.slice(start, end);
                
                this.set(`users_${page}_${pageSize}`, {
                    users: pageData,
                    total: users.length
                });
            }

            // Update stats
            const stats = {
                totalUsers: users.length,
                activeUsers: users.filter(u => u.lastActive >= new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
                totalReferrals: referralsResponse.documents.length
            };

            this.set('user_stats', stats);
            this.lastUpdate = Date.now();
        } catch (error) {
            console.error('Error updating admin cache:', error);
        } finally {
            this.updateInProgress = false;
        }
    }
};

// Start background updates
setInterval(() => adminCache.update(), 60 * 1000);

// Modify getUsers to use caching and batch operations
async function getUsers(page = 1, limit = 10) {
    const cacheKey = `users_${page}_${limit}`;
    
    // Check cache first
    const cachedData = adminCache.get(cacheKey);
    if (cachedData) {
        console.log('Using cached user data for page:', page);
        return cachedData;
    }

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            [
                'orderDesc("createdAt")'
            ],
            limit,
            (page - 1) * limit
        );

        // Get user statistics in parallel
        const statsPromises = response.documents.map(async (user) => {
            const userId = user.$id;

            // Get user statistics in parallel
            const [referralCount] = await Promise.all([
                databases.listDocuments(
                    DATABASE_ID,
                    REFERRALS_COLLECTION_ID,
                    [
                        `equal("referrerId", "${userId}")`
                    ]
                )
            ]);

            return {
                ...user,
                id: userId,
                gamesPlayed: user.gamesPlayed || 0,
                totalScore: user.score || 0,
                referralCount: referralCount.documents.length
            };
        });

        const userData = await Promise.all(statsPromises);
        
        // Cache the results
        adminCache.set(cacheKey, {
            users: userData,
            total: response.total
        });

        return {
            users: userData,
            total: response.total
        };
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}

// Modify getUserStats to use caching and parallel requests
async function getUserStats() {
    const cacheKey = 'user_stats';
    
    // Check cache first
    const cachedData = adminCache.get(cacheKey);
    if (cachedData) {
        console.log('Using cached user statistics');
        return cachedData;
    }

    try {
        // Fetch all statistics in parallel
        const [usersResponse, referralsResponse] = await Promise.all([
            databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID),
            databases.listDocuments(DATABASE_ID, REFERRALS_COLLECTION_ID)
        ]);

        const activeUsers = usersResponse.documents.filter(
            user => user.lastActive >= new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;

        const stats = {
            totalUsers: usersResponse.documents.length,
            activeUsers: activeUsers,
            totalReferrals: referralsResponse.documents.length
        };

        // Cache the results
        adminCache.set(cacheKey, stats);

        return stats;
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        throw error;
    }
}

/**
 * @route GET /api/admin/users
 * @desc Get all users with pagination
 * @access Admin only
 */
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const data = await getUsers(parseInt(page), parseInt(limit));
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

/**
 * @route GET /api/admin/stats
 * @desc Get admin statistics
 * @access Admin only
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await getUserStats();
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching admin statistics:', error);
        res.status(500).json({ message: 'Error fetching admin statistics', error: error.message });
    }
});

module.exports = router; 