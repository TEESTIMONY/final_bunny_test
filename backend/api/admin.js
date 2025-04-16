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
            const [usersSnapshot, gamesSnapshot, referralsSnapshot] = await Promise.all([
                db.collection('users').get(),
                db.collection('games').get(),
                db.collection('referrals').get()
            ]);

            // Process data in memory
            const userStats = new Map();
            const gameStats = new Map();
            const referralStats = new Map();

            // Process games
            gamesSnapshot.forEach(doc => {
                const data = doc.data();
                const userId = data.userId;
                if (!gameStats.has(userId)) {
                    gameStats.set(userId, { count: 0, totalScore: 0 });
                }
                const stats = gameStats.get(userId);
                stats.count++;
                stats.totalScore += data.score || 0;
            });

            // Process referrals
            referralsSnapshot.forEach(doc => {
                const data = doc.data();
                const referrerId = data.referrerId;
                if (!referralStats.has(referrerId)) {
                    referralStats.set(referrerId, 0);
                }
                referralStats.set(referrerId, referralStats.get(referrerId) + 1);
            });

            // Process users and create paginated data
            const users = [];
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                const userId = doc.id;
                const games = gameStats.get(userId) || { count: 0, totalScore: 0 };
                const referrals = referralStats.get(userId) || 0;

                users.push({
                    ...userData,
                    id: userId,
                    gamesPlayed: games.count,
                    totalScore: games.totalScore,
                    referralCount: referrals
                });
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
                totalGames: gamesSnapshot.size,
                totalReferrals: referralsSnapshot.size
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
        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .offset((page - 1) * limit)
            .get();

        // Get user statistics in parallel
        const statsPromises = snapshot.docs.map(async (doc) => {
            const userData = doc.data();
            const userId = doc.id;

            // Get user statistics in parallel
            const [gamesPlayed, totalScore, referralCount] = await Promise.all([
                db.collection('games')
                    .where('userId', '==', userId)
                    .count()
                    .get(),
                db.collection('scores')
                    .where('userId', '==', userId)
                    .get(),
                db.collection('referrals')
                    .where('referrerId', '==', userId)
                    .count()
                    .get()
            ]);

            return {
                ...userData,
                id: userId,
                gamesPlayed: gamesPlayed.data().count,
                totalScore: totalScore.docs.reduce((sum, doc) => sum + (doc.data().score || 0), 0),
                referralCount: referralCount.data().count
            };
        });

        const userData = await Promise.all(statsPromises);
        
        // Cache the results
        adminCache.set(cacheKey, {
            users: userData,
            total: (await usersRef.count().get()).data().count
        });

        return {
            users: userData,
            total: (await usersRef.count().get()).data().count
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
        const [totalUsers, activeUsers, totalGames, totalReferrals] = await Promise.all([
            db.collection('users').count().get(),
            db.collection('users').where('lastActive', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)).count().get(),
            db.collection('games').count().get(),
            db.collection('referrals').count().get()
        ]);

        const stats = {
            totalUsers: totalUsers.data().count,
            activeUsers: activeUsers.data().count,
            totalGames: totalGames.data().count,
            totalReferrals: totalReferrals.data().count
        };

        // Cache the results
        adminCache.set(cacheKey, stats);

        return stats;
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        throw error;
    }
} 