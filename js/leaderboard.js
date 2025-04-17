/**
 * Leaderboard JavaScript for Hop Bunny
 * Handles leaderboard data loading, display, and interaction
 */

// Import Appwrite configuration
import config from './config/appwrite.js';

// Initialize Appwrite client
const client = new Appwrite.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

// Initialize Appwrite services
const databases = new Appwrite.Databases(client);
const account = new Appwrite.Account(client);
const Query = Appwrite.Query; // Import Query from Appwrite

// Cache for leaderboard data with 5-minute expiration
const leaderboardCache = {
    data: null,
    timestamp: 0,
    expirationTime: 5 * 60 * 1000, // 5 minutes

    get() {
        if (this.data && Date.now() - this.timestamp < this.expirationTime) {
            return this.data;
        }
        return null;
    },

    set(data) {
        this.data = data;
        this.timestamp = Date.now();
    },

    async update() {
        try {
            const freshData = await fetchLeaderboardData(true);
            if (freshData) {
                this.set(freshData);
                return freshData;
            }
            return null;
        } catch (error) {
            console.error('Error updating leaderboard cache:', error);
            return null;
        }
    }
};

// Expose leaderboardCache to the global window object
window.leaderboardCache = leaderboardCache;

// Also expose the fetchLeaderboardData function globally
window.fetchLeaderboardData = fetchLeaderboardData;

// Start background updates
setInterval(() => leaderboardCache.update(), 30 * 1000);

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the leaderboard
    initLeaderboard();
    
    // Add event listeners
    document.getElementById('refreshButton').addEventListener('click', refreshLeaderboard);
    
    // Add button feedback on mobile
    const buttons = document.querySelectorAll('.game-button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.classList.add('active');
        });
        button.addEventListener('touchend', function() {
            this.classList.remove('active');
        });
    });
});

/**
 * Initialize the leaderboard
 */
function initLeaderboard() {
    // Set up animations for particles
    setupParticleAnimations();
    
    // Load and display user info at the top bar
    loadUserInfo();
    
    // Load leaderboard data
    loadLeaderboardData();
    
    // Load player's own stats
    loadPlayerStats();
}

/**
 * Set up animations for particles to match the blue bubble style
 */
function setupParticleAnimations() {
    const particles = document.querySelectorAll('.particle');
    
    particles.forEach((particle, index) => {
        // Random size between 8px and 30px
        const size = 8 + Math.random() * 22;
        
        // Random starting position
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        
        // Random animation duration between 20-40s
        const duration = 20 + Math.random() * 20;
        
        // Random delay
        const delay = Math.random() * 5;
        
        // Random opacity
        const opacity = 0.1 + Math.random() * 0.15;
        
        // Apply styles
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${startX}%`;
        particle.style.top = `${startY}%`;
        particle.style.opacity = opacity;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        
        // Add custom animation path
        if (index % 3 === 0) {
            // Floating up animation
            particle.style.animation = `floatUp ${duration}s ${delay}s infinite linear`;
        } else if (index % 3 === 1) {
            // Diagonal animation
            particle.style.animation = `floatDiagonal ${duration}s ${delay}s infinite linear`;
        } else {
            // Circular animation
            particle.style.animation = `floatCircular ${duration}s ${delay}s infinite linear`;
        }
    });
    
    // Add animation keyframes to the document
    addAnimationKeyframes();
}

/**
 * Add custom animation keyframes to the document
 */
function addAnimationKeyframes() {
    // Create a style element
    const style = document.createElement('style');
    
    // Define keyframes for different bubble movements
    const keyframes = `
        @keyframes floatUp {
            0% {
                transform: translateY(100%) translateX(0) scale(1);
                opacity: 0.1;
            }
            25% {
                transform: translateY(75%) translateX(15px) scale(1.05);
                opacity: 0.2;
            }
            50% {
                transform: translateY(50%) translateX(-15px) scale(1.1);
                opacity: 0.15;
            }
            75% {
                transform: translateY(25%) translateX(15px) scale(1.05);
                opacity: 0.2;
            }
            100% {
                transform: translateY(-20%) translateX(0) scale(1);
                opacity: 0;
            }
        }
        
        @keyframes floatDiagonal {
            0% {
                transform: translate(0, 100%) scale(1);
                opacity: 0.1;
            }
            25% {
                transform: translate(20%, 75%) scale(1.1);
                opacity: 0.15;
            }
            50% {
                transform: translate(40%, 50%) scale(1.2);
                opacity: 0.2;
            }
            75% {
                transform: translate(60%, 25%) scale(1.1);
                opacity: 0.15;
            }
            100% {
                transform: translate(80%, -20%) scale(1);
                opacity: 0;
            }
        }
        
        @keyframes floatCircular {
            0% {
                transform: translate(0, 100%) scale(1) rotate(0deg);
                opacity: 0.1;
            }
            25% {
                transform: translate(-30px, 75%) scale(1.1) rotate(90deg);
                opacity: 0.2;
            }
            50% {
                transform: translate(0, 50%) scale(1.2) rotate(180deg);
                opacity: 0.15;
            }
            75% {
                transform: translate(30px, 25%) scale(1.1) rotate(270deg);
                opacity: 0.2;
            }
            100% {
                transform: translate(0, -20%) scale(1) rotate(360deg);
                opacity: 0;
            }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
        }
        
        .refreshed {
            animation: pulse 0.5s ease-in-out;
            text-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
        }
        
        .user-info-bar.refreshed {
            background: rgba(59, 130, 246, 0.3);
        }
        
        .new-score-animation {
            animation: pulse 0.5s ease-in-out;
            color: #fbbf24;
            text-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
        }
        
        .leaderboard-container.loading {
            opacity: 0.7;
            transition: opacity 0.3s ease;
        }
        
        .leaderboard-container.refreshed {
            opacity: 1;
            animation: pulse 0.5s ease-in-out;
        }
        
        #refreshButton {
            transition: all 0.3s ease;
        }
        
        #refreshButton:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        .leaderboard-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 30px;
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
        }
        
        .loading-spinner {
            font-size: 24px;
            margin-bottom: 15px;
            color: #3b82f6;
        }
        
        .error-row {
            color: #ff6b6b;
            background: rgba(255, 107, 107, 0.1);
        }
    `;
    
    // Add the keyframes to the style element
    style.textContent = keyframes;
    
    // Append the style element to the head
    document.head.appendChild(style);
}

/**
 * Format date string to a readable format
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Modified fetchLeaderboardData to use Appwrite
async function fetchLeaderboardData(bypassCache = false) {
    // Check cache first if not bypassing
    if (!bypassCache) {
        const cachedData = leaderboardCache.get();
        if (cachedData) {
            console.log('Using cached leaderboard data');
            return cachedData;
        }
    } else {
        console.log('Bypassing leaderboard cache, fetching fresh data');
    }

    try {
        console.log('Fetching leaderboard data from Appwrite...');
        
        // Create Appwrite queries
        const queries = [
            Query.orderDesc('score'), // Sort by score descending
            Query.limit(100) // Limit to 100 users
        ];
        
        // Fetch users directly from Appwrite
        const response = await databases.listDocuments(
            config.databaseId,
            config.usersCollectionId,
            queries
        );
        
        console.log('Appwrite response:', response);
        
        if (!response || !response.documents) {
            throw new Error('Invalid response from Appwrite');
        }
        
        // Map the response to our expected format
        const formattedData = response.documents.map(user => ({
            userId: user.$id,
            username: user.displayName || user.username || 'Anonymous',
            score: parseInt(user.score || user.highScore || 0),
            gamesPlayed: parseInt(user.gamesPlayed || 0)
        }));
        
        // Sort by score in descending order (even though Appwrite should already do this)
        formattedData.sort((a, b) => b.score - a.score);
        
        // Cache the formatted data
        leaderboardCache.set(formattedData);
        
        console.log('Leaderboard data fetched successfully:', formattedData);
        return formattedData;
    } catch (error) {
        console.error('Error fetching leaderboard data from Appwrite:', error);
        
        // Try the API endpoint as fallback
        try {
            console.log('Falling back to API endpoint...');
            const response = await fetch(`${config.apiEndpoint}/users?sortBy=score&sortDir=desc&limit=100`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API endpoint failed with status: ${response.status}`);
            }
            
            const responseData = await response.json();
            
            // Check if the response has a users property
            const users = responseData.users || [];
            
            // Map the data to ensure consistent format
            const formattedData = users.map(user => ({
                userId: user.uid,
                username: user.displayName || user.username || 'Anonymous',
                score: parseInt(user.score || user.highScore || 0),
                gamesPlayed: parseInt(user.gamesPlayed || 0)
            }));
            
            // Sort by score in descending order
            formattedData.sort((a, b) => b.score - a.score);
            
            // Cache the formatted data
            leaderboardCache.set(formattedData);
            
            console.log('Leaderboard data fetched via API:', formattedData);
            return formattedData;
        } catch (apiError) {
            console.error('All fetch attempts failed:', apiError);
            return null;
        }
    }
}

/**
 * Load and display user information on the top bar
 */
function loadUserInfo() {
    // Try to refresh user score using the global function
    if (window.refreshUserScore) {
        console.log('Refreshing user score data to get latest values');
        window.refreshUserScore().then(userData => {
            console.log('User score refreshed:', userData);
        }).catch(error => {
            console.error('Error refreshing user score:', error);
        });
    }

    // Get user info from localStorage or sessionStorage
    let username = localStorage.getItem('username') || sessionStorage.getItem('username');
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    const score = localStorage.getItem('highScore') || sessionStorage.getItem('highScore') || 0;
    
    // Update the UI elements
    const currentUsernameElement = document.getElementById('currentUsername');
    const currentUserScoreElement = document.getElementById('currentUserScore');
    
    if (username) {
        // Check if the username looks like an email (contains @)
        const isEmail = username.includes('@');
        
        // Temporarily set username to email prefix or stored username
        currentUsernameElement.textContent = isEmail ? username.split('@')[0] : username;
        currentUserScoreElement.textContent = formatNumber(score);
        
        // If we have a userId, try to fetch the latest data including proper username
        if (userId) {
            // First try to clear cache for this user to get fresh data
            if (window.userDataCache) {
                window.userDataCache.clear(userId);
            }

            // Try to fetch using Appwrite SDK directly
            try {
                databases.getDocument(config.databaseId, config.usersCollectionId, userId)
                    .then(user => {
                        console.log('User data fetched from Appwrite for header:', user);
                        
                        // Use the proper display name or username from Appwrite
                        if (user.displayName || user.username) {
                            const properUsername = user.displayName || user.username;
                            console.log('Using proper username from Appwrite:', properUsername);
                            currentUsernameElement.textContent = properUsername;
                            
                            // Update localStorage and sessionStorage with the proper username
                            localStorage.setItem('username', properUsername);
                            sessionStorage.setItem('username', properUsername);
                        }
                        
                        // Update score if available
                        if (user.score || user.highScore) {
                            const highestScore = Math.max(user.score || 0, user.highScore || 0);
                            currentUserScoreElement.textContent = formatNumber(highestScore);
                            localStorage.setItem('highScore', highestScore);
                            sessionStorage.setItem('highScore', highestScore);
                        }
                    })
                    .catch(error => {
                        console.warn('Appwrite fetch failed, falling back to API:', error);
                        
                        // Fall back to API endpoint if Appwrite SDK fails
                        fetch(`${config.apiEndpoint}/user/${userId}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            }
                        })
                        .then(response => {
                            if (!response.ok) throw new Error('Failed to fetch user data');
                            return response.json();
                        })
                        .then(data => {
                            console.log('User data fetched via API for header:', data);
                            
                            // Use the proper display name or username from the API
                            if (data.displayName || data.username) {
                                const properUsername = data.displayName || data.username;
                                console.log('Using proper username from API:', properUsername);
                                currentUsernameElement.textContent = properUsername;
                                
                                // Update localStorage and sessionStorage with the proper username
                                localStorage.setItem('username', properUsername);
                                sessionStorage.setItem('username', properUsername);
                            }
                            
                            // Update score if available
                            if (data.score || data.highScore) {
                                const highestScore = Math.max(data.score || 0, data.highScore || 0);
                                currentUserScoreElement.textContent = formatNumber(highestScore);
                                localStorage.setItem('highScore', highestScore);
                                sessionStorage.setItem('highScore', highestScore);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching user data for header:', error);
                            // Keep using the default username if API fetch fails
                        });
                    });
            } catch (error) {
                console.error('Error setting up Appwrite fetch:', error);
                // Keep using the default username if Appwrite setup fails
            }
        }
    } else {
        // If no username found, use a placeholder
        currentUsernameElement.textContent = "Guest Player";
        currentUserScoreElement.textContent = "0";
        
        // Create a random guest username for demo purposes
        const guestNames = ["Hopper", "JumpMaster", "BunnyFan", "SkipJoy", "LeapFrog"];
        const randomName = guestNames[Math.floor(Math.random() * guestNames.length)];
        currentUsernameElement.textContent = `Guest_${randomName}`;
        
        // Log authentication status
        console.log('No user authenticated, using guest mode');
    }
}

/**
 * Load the player's stats from localStorage or the API
 */
async function loadPlayerStats() {
    try {
        const currentUserScoreElement = document.getElementById('currentUserScore');
        const currentUsernameElement = document.getElementById('currentUsername');
        
        // Get current user ID from localStorage or sessionStorage
        const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const currentUsername = localStorage.getItem('username') || sessionStorage.getItem('username');
        
        if (!currentUserId) {
            // No user ID found, nothing to do
            console.log('No authenticated user found.');
            return;
        }
        
        console.log('Loading stats for user ID:', currentUserId);
        
        // Get current user from stored all users, or fetch directly
        let currentUser = null;
        
        if (window.allUsers && window.allUsers.length) {
            // Try to find user in already loaded leaderboard data
            currentUser = window.allUsers.find(user => user.userId === currentUserId);
        }
        
        // If not found in existing data, fetch directly
        if (!currentUser) {
            try {
                // Try to fetch from Appwrite directly
                try {
                    const userDoc = await databases.getDocument(
                        config.databaseId,
                        config.usersCollectionId,
                        currentUserId
                    );
                    
                    console.log('Current user data fetched from Appwrite:', userDoc);
                    
                    currentUser = {
                        userId: userDoc.$id,
                        username: userDoc.displayName || userDoc.username || currentUsername,
                        highScore: parseInt(userDoc.score || userDoc.highScore || 0),
                        gamesPlayed: parseInt(userDoc.gamesPlayed || 0)
                    };
                    
                    console.log('Current user data formatted from Appwrite:', currentUser);
                } catch (appwriteError) {
                    console.warn('Failed to fetch user stats via Appwrite:', appwriteError);
                    
                    // Fall back to API endpoint
                    console.log('Falling back to API endpoint for user stats...');
                    const response = await fetch(`${config.apiEndpoint}/user/${currentUserId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        currentUser = {
                            userId: currentUserId,
                            username: data.displayName || data.username || currentUsername,
                            highScore: parseInt(data.score || data.highScore || 0),
                            gamesPlayed: parseInt(data.gamesPlayed || 0)
                        };
                        
                        console.log('Current user data fetched from API:', currentUser);
                    } else {
                        // If API call fails, use data from localStorage
                        currentUser = {
                            userId: currentUserId,
                            username: currentUsername || 'Guest Player',
                            highScore: parseInt(localStorage.getItem('highScore') || sessionStorage.getItem('highScore') || '0'),
                            gamesPlayed: parseInt(localStorage.getItem('gamesPlayed') || sessionStorage.getItem('gamesPlayed') || '0')
                        };
                        
                        console.log('Using localStorage for current user data:', currentUser);
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                
                // Use data from localStorage as fallback
                currentUser = {
                    userId: currentUserId,
                    username: currentUsername || 'Guest Player',
                    highScore: parseInt(localStorage.getItem('highScore') || sessionStorage.getItem('highScore') || '0'),
                    gamesPlayed: parseInt(localStorage.getItem('gamesPlayed') || sessionStorage.getItem('gamesPlayed') || '0')
                };
                
                console.log('Error occurred, falling back to localStorage for user data:', currentUser);
            }
        }
        
        // Update the UI with the user's stats
        if (currentUser) {
            // Update username display if available
            if (currentUser.username && currentUsernameElement) {
                currentUsernameElement.textContent = currentUser.username;
                
                // Update localStorage with latest username
                localStorage.setItem('username', currentUser.username);
                sessionStorage.setItem('username', currentUser.username);
            }
            
            // Update score display if available
            if (currentUser.highScore && currentUserScoreElement) {
                currentUserScoreElement.textContent = formatNumber(currentUser.highScore);
                
                // Update localStorage with latest score
                localStorage.setItem('highScore', currentUser.highScore);
                sessionStorage.setItem('highScore', currentUser.highScore);
            }
            
            // Update games played if available
            if (currentUser.gamesPlayed) {
                localStorage.setItem('gamesPlayed', currentUser.gamesPlayed);
                sessionStorage.setItem('gamesPlayed', currentUser.gamesPlayed);
            }
        }
    } catch (error) {
        console.error('Error loading player stats:', error);
    }
}

/**
 * Show a message to the user (success or error)
 */
function showMessage(message, type = 'info') {
    // Check if a message element already exists
    let messageElement = document.querySelector('.message-popup');
    
    // If not, create one
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'message-popup';
        document.body.appendChild(messageElement);
    }
    
    // Set message content and style based on type
    messageElement.textContent = message;
    messageElement.className = `message-popup ${type}`;
    
    // Display the message
    messageElement.style.display = 'block';
    messageElement.style.opacity = '1';
    
    // Add styles if not already in document
    if (!document.getElementById('message-styles')) {
        const style = document.createElement('style');
        style.id = 'message-styles';
        style.textContent = `
            .message-popup {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transition: opacity 0.3s ease;
                text-align: center;
                max-width: 80%;
                word-wrap: break-word;
            }
            
            .message-popup.success {
                background-color: #2ecc71;
            }
            
            .message-popup.error {
                background-color: #e74c3c;
            }
            
            .message-popup.info {
                background-color: #3498db;
            }
            
            @media (max-width: 400px) {
                .message-popup {
                    padding: 10px 16px;
                    font-size: 14px;
                    max-width: 85%;
                }
            }
            
            @media (max-width: 320px) {
                .message-popup {
                    padding: 8px 12px;
                    font-size: 13px;
                    top: 15px;
                    max-width: 90%;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 300);
    }, 3000);
}

/**
 * Refresh the leaderboard data
 */
async function refreshLeaderboard() {
    try {
        // Show refreshing state
        const refreshButton = document.getElementById('refreshButton');
        refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshButton.disabled = true;
        
        // Add loading class to leaderboard
        const leaderboardContainer = document.querySelector('.leaderboard-container');
        leaderboardContainer.classList.add('loading');
        
        // Clear local cache of users
        window.allUsers = null;
        
        // Clear leaderboard cache
        leaderboardCache.data = null;
        leaderboardCache.timestamp = 0;
        
        // Force refresh user score data
        if (window.refreshUserScore) {
            try {
                await window.refreshUserScore();
                console.log('User score refreshed during leaderboard refresh');
            } catch (error) {
                console.error('Error refreshing user score during leaderboard refresh:', error);
            }
        }
        
        // Load fresh data from API
        await loadLeaderboardData();
        
        // Load player stats
        await loadPlayerStats();
        
        // Show success animation
        leaderboardContainer.classList.add('refreshed');
        
        // Reset the refresh button
        refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> <span>REFRESH</span>';
        refreshButton.disabled = false;
        
        // Add animation to user info bar
        const userInfoBar = document.querySelector('.user-info-bar');
        userInfoBar.classList.add('refreshed');
        
        // Remove animation classes after they complete
        setTimeout(() => {
            leaderboardContainer.classList.remove('refreshed');
            leaderboardContainer.classList.remove('loading');
            userInfoBar.classList.remove('refreshed');
        }, 1000);
        
        console.log('Leaderboard refreshed successfully');
    } catch (error) {
        console.error('Error refreshing leaderboard:', error);
        
        // Reset the refresh button
        const refreshButton = document.getElementById('refreshButton');
        refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> <span>REFRESH</span>';
        refreshButton.disabled = false;
        
        // Remove loading class
        const leaderboardContainer = document.querySelector('.leaderboard-container');
        leaderboardContainer.classList.remove('loading');
        
        // Display error in UI
        showMessage('Failed to refresh leaderboard data. Please try again later.', 'error');
    }
}

/**
 * Update a player's ranking animation
 * This would be called if player positions change after a refresh
 */
function updateRankingWithAnimation(playerId, oldRank, newRank) {
    // In a real implementation, this would animate a player row
    // moving to its new position in the leaderboard
    
    // For example:
    // 1. Highlight the row
    // 2. Animate it moving to the new position
    // 3. Update the rank number
    
    console.log(`Player ${playerId} moved from rank ${oldRank} to ${newRank}`);
}

// Modify the fetchUserRank function to use cached data
async function fetchUserRank(userId) {
    const leaderboardData = await fetchLeaderboardData();
    if (!leaderboardData) return null;

    const userIndex = leaderboardData.findIndex(user => user.userId === userId);
    return userIndex >= 0 ? userIndex + 1 : null;
}

// Modify the fetchCurrentUserData function to use Appwrite
async function fetchCurrentUserData(currentUserId) {
    // Check the global user data cache first
    const cachedData = window.userDataCache?.get(currentUserId);
    if (cachedData) {
        console.log('Using cached user data for current user');
        return cachedData;
    }

    try {
        console.log('Fetching current user data via Appwrite...');
        
        // Try to get user directly from Appwrite
        try {
            const userDoc = await databases.getDocument(
                config.databaseId,
                config.usersCollectionId,
                currentUserId
            );
            
            console.log('User document fetched via Appwrite:', userDoc);
            
            // Format the user data
            const userData = {
                userId: userDoc.$id,
                username: userDoc.displayName || userDoc.username || 'Anonymous',
                score: parseInt(userDoc.score || userDoc.highScore || 0),
                highScore: parseInt(userDoc.highScore || 0),
                gamesPlayed: parseInt(userDoc.gamesPlayed || 0),
                createdAt: userDoc.createdAt
            };
            
            // Cache the data if the cache exists
            if (window.userDataCache) {
                window.userDataCache.set(currentUserId, userData);
            }
            
            return userData;
        } catch (appwriteError) {
            console.warn('Failed to fetch user via Appwrite:', appwriteError);
            
            // Fall back to API endpoint
            console.log('Falling back to API endpoint...');
            const response = await fetch(`${config.apiEndpoint}/user/${currentUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch current user data');
            }

            const data = await response.json();
            
            // Format the user data
            const userData = {
                userId: data.uid || data.$id || currentUserId,
                username: data.displayName || data.username || 'Anonymous',
                score: parseInt(data.score || data.highScore || 0),
                highScore: parseInt(data.highScore || 0),
                gamesPlayed: parseInt(data.gamesPlayed || 0),
                createdAt: data.createdAt
            };
            
            // Cache the data if the cache exists
            if (window.userDataCache) {
                window.userDataCache.set(currentUserId, userData);
            }
            
            return userData;
        }
    } catch (error) {
        console.error('Error fetching current user data:', error);
        return null;
    }
}

/**
 * Load and display leaderboard data
 */
async function loadLeaderboardData() {
    try {
        // Show loading state
        const leaderboardContainer = document.querySelector('.leaderboard-rows-container');
        if (!leaderboardContainer) {
            console.error('Leaderboard container not found');
            return;
        }

        leaderboardContainer.innerHTML = `
            <div class="leaderboard-loading">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p>Loading leaderboard data...</p>
            </div>
        `;

        // Fetch leaderboard data
        const data = await fetchLeaderboardData();
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('No leaderboard data available');
        }

        // Store all users globally for reference
        window.allUsers = data;

        // Clear the container
        leaderboardContainer.innerHTML = '';

        // Display each user in the leaderboard
        data.forEach((user, index) => {
            const rank = index + 1;
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            
            // Add special class for top 3
            if (rank <= 3) {
                row.classList.add(`rank-${rank}`);
            }

            // Add special class for current user
            const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
            if (user.userId === currentUserId) {
                row.classList.add('current-user');
            }

            row.innerHTML = `
                <div class="rank">
                    ${rank <= 3 ? 
                        `<i class="fas fa-trophy rank-${rank}"></i>` : 
                        `#${rank}`
                    }
                </div>
                <div class="player">
                    <i class="fas fa-user"></i>
                    ${user.username || 'Anonymous'}
                </div>
                <div class="score">
                    <i class="fas fa-star"></i>
                    ${formatNumber(user.score || 0)}
                </div>
            `;

            leaderboardContainer.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading leaderboard data:', error);
        const leaderboardContainer = document.querySelector('.leaderboard-rows-container');
        if (leaderboardContainer) {
            leaderboardContainer.innerHTML = `
                <div class="error-row">
                    <p>Failed to load leaderboard data. Please try again later.</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
        }
    }
} 