/**
 * Profile JavaScript for Hop Bunny
 * Handles loading and displaying user profile data
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

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const profileData = document.getElementById('profileData');

// Current user info
const currentUsername = document.getElementById('currentUsername');
const currentUserScore = document.getElementById('currentUserScore');

// Profile elements
const profileUsername = document.getElementById('profileUsername');
const joinDate = document.getElementById('joinDate');
const highScore = document.getElementById('highScore');
const playerRank = document.getElementById('playerRank');
const achievementsList = document.getElementById('achievementsList');

// Improved data caching system with TTL
const userProfileCache = {
  data: new Map(),
  referralCounts: new Map(),
  maxAge: 5 * 60 * 1000, // 5 minutes in milliseconds
  
  // Get profile data from cache, returns null if expired or not available
  getUserProfile(userId) {
    const entry = this.data.get(userId);
    if (!entry) return null;
    
    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      console.log('Cache expired for user:', userId);
      this.data.delete(userId);
      return null;
    }
    
    console.log('Using cached profile data for user:', userId);
    return entry.data;
  },
  
  // Save profile data to cache
  setUserProfile(userId, data) {
    this.data.set(userId, {
      data,
      timestamp: Date.now()
    });
    console.log('Updated cache for user:', userId);
  },
  
  // Get referral count from cache
  getReferralCount(userId) {
    const entry = this.referralCounts.get(userId);
    if (!entry) return null;
    
    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.referralCounts.delete(userId);
      return null;
    }
    
    return entry.count;
  },
  
  // Save referral count to cache
  setReferralCount(userId, count) {
    this.referralCounts.set(userId, {
      count,
      timestamp: Date.now()
    });
  },
  
  // Clear all caches for a specific user
  clearUserCache(userId) {
    this.data.delete(userId);
    this.referralCounts.delete(userId);
    console.log('Cleared cache for user:', userId);
  }
};

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize profile
    await initProfile();
    
    // Set up particle animations
    setupParticleAnimations();
    
    // Add improved button styles
    enhanceButtonStyles();

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
 * Initialize the profile page
 */
async function initProfile() {
    console.log('Initializing profile page');
    
    // Get current user ID
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    if (!userId) {
      console.error('No user ID found in storage');
      showError('User not logged in');
      return;
    }
    
    // Clear user cache to ensure fresh data on profile page load
    userProfileCache.clearUserCache(userId);
    
    // If the global user data cache exists, also clear it
    if (window.userDataCache) {
        console.log('Clearing global user data cache for profile page');
        window.userDataCache.clear(userId);
    }
    
    // If refreshUserScore is available, use it to get fresh data
    if (window.refreshUserScore) {
        try {
            await window.refreshUserScore();
            console.log('User score refreshed on profile page load');
        } catch (error) {
            console.error('Error refreshing user score on profile load:', error);
        }
    }
    
    // Remove any existing game history section
    removeGameHistory();
    
    // Apply enhanced styles
    enhanceButtonStyles();
    addReferralStyles();
    
    // Load user info from Appwrite
    await loadUserInfo();
    
    // Set up event listeners for profile tabs
    setupProfileTabs();
    
    // Initialize profile data
    loadProfileData();
    
    // Set up referral system
    setupReferralSystem();
    
    // Add event listeners for buttons
    document.addEventListener('click', function(event) {
        // Copy referral link button
        if (event.target.closest('#copyReferralButton')) {
            copyReferralLink();
        }
        
        // Share referral link button
        if (event.target.closest('#shareReferralButton')) {
            shareReferralLink();
        }
    });
}

/**
 * Remove game history section if it exists
 */
function removeGameHistory() {
    const gameHistorySection = document.querySelector('.game-history');
    if (gameHistorySection) {
        console.log('Removing game history section');
        gameHistorySection.remove();
    }
}

/**
 * Set up the referral system with Appwrite integration
 */
function setupReferralSystem() {
    // Get the referral link input element
    const referralLinkInput = document.getElementById('referralLinkInput');
    if (!referralLinkInput) {
        console.log('Referral link input not found, might not be created yet');
        return;
    }
    
    // Update user info in the header
    updateUserInfoFromAppwrite();
    
    // Get the current user ID from Appwrite
    account.get()
        .then(user => {
            // Generate the referral link with the user's ID using our function
            const referralLink = generateReferralLink(user.$id, user.name || user.email);
            
            // Set the referral link input value
            referralLinkInput.value = referralLink;
            
            // Log the link for debugging
            console.log('Generated referral link:', referralLink);
            
            // Load referral stats
            loadReferralStats(user.$id);
        })
        .catch(error => {
            console.error('Error getting user data:', error);
            // Set a placeholder for the referral link
            referralLinkInput.value = 'Please log in to get your referral link';
            referralLinkInput.disabled = true;
        });
}

/**
 * Update user info in the header from Appwrite
 */
function updateUserInfoFromAppwrite() {
    console.log('Updating user info from Appwrite');
    
    // Get DOM elements for user info
    const userNameElement = document.getElementById('currentUsername');
    const userScoreElement = document.getElementById('currentUserScore');
    
    if (!userNameElement || !userScoreElement) {
        console.error('User info elements not found in the DOM');
        return;
    }
    
    // Use User ID from local storage
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    if (!userId) {
        console.error('User ID not found in storage');
        return;
    }
    
    // Check if we have cached data
    const cachedUserData = userProfileCache.getUserProfile(userId);
    if (cachedUserData) {
        // Update UI with cached data
        userNameElement.textContent = cachedUserData.displayName || cachedUserData.username || 'Player';
        userScoreElement.textContent = formatNumber(cachedUserData.score || 0);
        return;
    }
    
    // First try to use the refreshUserScore global function if available
    if (window.refreshUserScore) {
        console.log('Using refreshUserScore to get latest user data');
        window.refreshUserScore()
            .then(userData => {
                if (userData) {
                    // Update UI with the data
                    userNameElement.textContent = userData.displayName || userData.username || 'Player';
                    userScoreElement.textContent = formatNumber(userData.score || 0);
                    
                    // Cache the data for future use
                    userProfileCache.setUserProfile(userId, userData);
                } else {
                    // If no data, fall back to direct Appwrite call
                    fetchUserDataWithAppwrite();
                }
            })
            .catch(error => {
                console.error('Error with refreshUserScore:', error);
                fetchUserDataWithAppwrite();
            });
    } else {
        // No refreshUserScore function, use direct Appwrite call
        fetchUserDataWithAppwrite();
    }
    
    function fetchUserDataWithAppwrite() {
        // Try to get user data directly from Appwrite
        databases.getDocument(
            config.databaseId,
            config.usersCollectionId,
            userId
        ).then(userData => {
            // Update UI with the data
            userNameElement.textContent = userData.displayName || userData.username || 'Player';
            userScoreElement.textContent = formatNumber(userData.score || 0);
            
            // Cache the data for future use
            userProfileCache.setUserProfile(userId, userData);
        }).catch(error => {
            console.error('Error fetching user data from Appwrite:', error);
            
            // If all else fails, use data from localStorage
            userNameElement.textContent = localStorage.getItem('username') || sessionStorage.getItem('username') || 'Player';
            userScoreElement.textContent = formatNumber(parseInt(localStorage.getItem('totalScore')) || 0);
        });
    }
}

/**
 * Load referral stats for a user
 * @param {string} userId - The user ID to load stats for
 */
function loadReferralStats(userId) {
    // Check if we have cached referral count
    const cachedReferralCount = userProfileCache.getReferralCount(userId);
    if (cachedReferralCount !== null) {
        updateReferralDisplay(cachedReferralCount);
        return;
    }
    
    // Fetch the referral count directly from the database
    try {
        console.log('Fetching referral count from database');
        databases.getDocument(
            config.databaseId,
            config.usersCollectionId,
            userId
        ).then(userDoc => {
            // Update localStorage with the latest referral count
            if (userDoc && userDoc.referralCount !== undefined) {
                const referralCount = parseInt(userDoc.referralCount || 0);
                console.log('Referral count from database:', referralCount);
                
                // Update localStorage and sessionStorage
                localStorage.setItem('referralCount', referralCount.toString());
                sessionStorage.setItem('referralCount', referralCount.toString());
                
                // Cache the referral count
                userProfileCache.setReferralCount(userId, referralCount);
                
                // Update the display
                updateReferralDisplay(referralCount);
            }
        }).catch(error => {
            console.error('Error fetching referral count:', error);
            // Fall back to localStorage
            const storedCount = parseInt(localStorage.getItem('referralCount') || '0');
            updateReferralDisplay(storedCount);
        });
    } catch (error) {
        console.error('Error fetching referral count:', error);
        // Fall back to localStorage
        const storedCount = parseInt(localStorage.getItem('referralCount') || '0');
        updateReferralDisplay(storedCount);
    }
    
    function updateReferralDisplay(count) {
        // Update the referral count display if the element exists
        const referralCountElement = document.getElementById('referralCount');
        if (referralCountElement) {
            referralCountElement.textContent = count.toString();
        }
    }
}

/**
 * Load and display user information on the top bar
 */
async function loadUserInfo() {
    // First try to update from Appwrite directly
    try {
        await updateUserInfoFromAppwrite();
        return;
    } catch (error) {
        console.warn('Could not update from Appwrite directly, using fallback:', error);
    }
    
    // Fallback to localStorage/sessionStorage
    const username = localStorage.getItem('username') || sessionStorage.getItem('username');
    const score = localStorage.getItem('score') || sessionStorage.getItem('score');
    
    // Update UI with stored values
    const userNameElement = document.getElementById('currentUsername');
    const userScoreElement = document.getElementById('currentUserScore');
    
    if (username && userNameElement) {
        userNameElement.textContent = username;
    }
    
    if (score && userScoreElement) {
        userScoreElement.textContent = formatNumber(parseInt(score));
    }
}

function updateProfileFromData(data) {
    // Update the score display with the latest from the database
    if (data.score !== undefined && !isNaN(data.score)) {
        const dbScore = parseInt(data.score);
        currentUserScore.textContent = formatNumber(dbScore);
    } else if (data.highScore !== undefined && !isNaN(data.highScore)) {
        const dbScore = parseInt(data.highScore);
        currentUserScore.textContent = formatNumber(dbScore);
    }
    
    // Use the proper display name or username from the API
    if (data.displayName || data.username) {
        const properUsername = data.displayName || data.username;
        console.log('Using proper username:', properUsername);
        currentUsername.textContent = properUsername;
        
        // Update localStorage and sessionStorage with the proper username
        localStorage.setItem('username', properUsername);
        sessionStorage.setItem('username', properUsername);
    }
}

/**
 * Load profile data for a specific user
 */
async function loadProfileData(userId) {
    try {
        // If userId is not provided, try to get it from localStorage
        if (!userId) {
            userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
            console.log('Using userId from localStorage:', userId);
            
            if (!userId) {
                console.error('No user ID found');
                showError('Please log in to view your profile');
                return;
            }
        }
        
        // Show loading state
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        profileData.style.display = 'none';
        
        // Force clear any cached data for this user
        if (window.userDataCache) {
            window.userDataCache.clear(userId);
            console.log('Cache cleared for user ID:', userId);
        }
        
        // Try to fetch user data from Appwrite
        try {
            console.log('Fetching user data from Appwrite...');
            const userData = await databases.getDocument(
                config.databaseId, 
                config.usersCollectionId, 
                userId
            );
            
            console.log('User data fetched directly from Appwrite:', userData);
            await displayProfileData(userData);
            return userData;
        } catch (error) {
            console.error('Error fetching user data from Appwrite:', error);
            
            // Try using the API endpoint as fallback
            try {
                console.log('Falling back to API endpoint...');
                const response = await fetch(`${config.apiEndpoint}/user/${userId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch user data from API');
                }
                
                const apiData = await response.json();
                console.log('User data fetched from API:', apiData);
                
                // Convert API data to the format expected by the UI
                const processedData = processApiUserData(apiData, userId);
                await displayProfileData(processedData);
                return processedData;
            } catch (apiError) {
                console.error('Error fetching user data from API:', apiError);
                
                // Show error state
                loadingState.style.display = 'none';
                errorState.style.display = 'flex';
                profileData.style.display = 'none';
                
                // Log details
                console.error('All fetch attempts failed:', apiError);
                
                // Return null to indicate failure
                return null;
            }
        }
    } catch (error) {
        console.error('Error in loadProfileData:', error);
        
        // Show error state
        loadingState.style.display = 'none';
        errorState.style.display = 'flex';
        profileData.style.display = 'none';
        
        return null;
    }
}

/**
 * Process API user data into the format our profile display expects
 */
function processApiUserData(apiData, userId) {
    console.log('Processing API data:', apiData);
    
    // Get username with fallback
    const username = apiData.displayName || apiData.username || 
                    localStorage.getItem('username') || sessionStorage.getItem('username') || 
                    'Guest Player';
    
    // Get high score from API data
    const userScore = parseInt(apiData.score || apiData.highScore || 0);
    
    // Get games played from API data
    const gamesPlayed = parseInt(apiData.gamesPlayed || 0);
    
    // Get rank from API data or localStorage
    let rank = apiData.rank || 
              parseInt(localStorage.getItem('rank') || sessionStorage.getItem('rank') || 0);
    
    // If rank is 0 or undefined, set to a placeholder
    if (!rank || rank === 0 || rank === 999) {
        rank = '---';
    }
    
    // Determine if this user is a top player (top 10)
    const isTopPlayer = typeof rank === 'number' && rank <= 10;
    
    // Extract referral count if available
    const referralCount = apiData.referralCount || 
                        parseInt(localStorage.getItem('referralCount') || 
                                sessionStorage.getItem('referralCount') || 0);
    
    // Determine when the user joined
    let joined;
    if (apiData.$createdAt) {
        joined = new Date(apiData.$createdAt);
    } else if (apiData.createdAt) {
        joined = new Date(apiData.createdAt);
    } else {
        // Fallback to a default date if not available
        joined = new Date();
    }
    
    // Build achievements array (for now just generate dummy achievements)
    const achievements = [];
    
    // If score is above certain thresholds, add corresponding achievements
    if (userScore >= 1000) {
        achievements.push({
            icon: 'fas fa-trophy',
            name: 'High Jumper',
            description: 'Reached a score of 1000 or more'
        });
    }
    
    if (userScore >= 5000) {
        achievements.push({
            icon: 'fas fa-medal',
            name: 'Pro Hopper',
            description: 'Reached a score of 5000 or more'
        });
    }
    
    if (gamesPlayed >= 10) {
        achievements.push({
            icon: 'fas fa-gamepad',
            name: 'Dedicated Player',
            description: 'Played 10 or more games'
        });
    }
    
    if (referralCount >= 1) {
        achievements.push({
            icon: 'fas fa-user-plus',
            name: 'Influencer',
            description: 'Referred at least one friend'
        });
    }
    
    if (isTopPlayer) {
        achievements.push({
            icon: 'fas fa-crown',
            name: 'Leaderboard Champion',
            description: 'Reached the top 10 on the leaderboard'
        });
    }
    
    // Generate game history
    const gameHistoryCount = Math.min(5, gamesPlayed);
    const gameHistory = [];
    
    // If we have played games, generate some mock history
    if (gameHistoryCount > 0) {
        const now = new Date();
        
        for (let i = 0; i < gameHistoryCount; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            // Generate a score that's a percentage of the high score
            const historyScore = Math.floor(userScore * (0.5 + (Math.random() * 0.5)));
            const isHighScore = i === 0; // First one is the high score
            
            gameHistory.push({
                date: date,
                score: historyScore,
                isHighScore: isHighScore
            });
        }
        
        // Sort by date, newest first
        gameHistory.sort((a, b) => b.date - a.date);
    }
    
    return {
        userId,
        username,
        score: userScore,
        highScore: userScore,
        rank,
        isTopPlayer,
        joined,
        gamesPlayed,
        referralCount,
        achievements,
        gameHistory
    };
}

/**
 * Format a date to Month Day, Year format
 * Handles various date formats including Firebase timestamp format
 */
function formatDate(date) {
    console.log('Formatting date:', date);
    
    // If it's a Firebase timestamp object
    if (date && date._seconds) {
        console.log('Converting Firebase timestamp with _seconds');
        date = new Date(date._seconds * 1000);
    }
    
    // If it's another Firebase timestamp format
    if (date && date.seconds) {
        console.log('Converting Firebase timestamp with seconds');
        date = new Date(date.seconds * 1000);
    }
    
    // If it's a string, try to parse it
    if (typeof date === 'string') {
        console.log('Parsing date string');
        
        // If it's already in "Month Day, Year" format, return it
        if (/^[A-Za-z]+ \d+, \d{4}$/.test(date)) {
            console.log('Date is already in Month Day, Year format');
            return date;
        }
        
        // Try to parse the string
        date = new Date(date);
    }
    
    // Make sure it's a Date object now
    if (!(date instanceof Date)) {
        console.log('Converting to Date object');
        date = new Date(date);
    }
    
    if (isNaN(date.getTime())) {
        // If date is invalid, return today's date
        console.warn('Invalid date, using current date');
        date = new Date();
    }
    
    // Format the date in a more user-friendly way: "Month Day, Year"
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formatted = date.toLocaleDateString('en-US', options);
    console.log('Formatted date:', formatted);
    return formatted;
}

/**
 * Get current user's data from localStorage/sessionStorage
 */
function getCurrentUserData() {
    console.log('Getting current user data from localStorage/sessionStorage');
    
    // Try to get user ID
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    console.log('User ID:', userId);
    
    if (!userId) {
        console.warn('No user ID found in localStorage or sessionStorage');
    }
    
    // Get username with fallback
    const username = localStorage.getItem('username') || sessionStorage.getItem('username') || 'Guest Player';
    console.log('Username:', username);
    
    // Get score with fallback
    let highScore = 0;
    try {
        const fromLocalStorage = localStorage.getItem('highScore');
        const fromSessionStorage = sessionStorage.getItem('highScore');
        highScore = parseInt(fromLocalStorage || fromSessionStorage || '0');
        console.log('Score source:', fromLocalStorage ? 'localStorage' : (fromSessionStorage ? 'sessionStorage' : 'default'));
    } catch (e) {
        console.error('Error parsing score:', e);
    }
    console.log('Score:', highScore);
    
    // Get rank with fallback - don't default to rank 1
    let rank = 999; // High default rank instead of 1
    try {
        const storedRank = localStorage.getItem('rank') || sessionStorage.getItem('rank');
        if (storedRank) {
            rank = parseInt(storedRank);
        }
    } catch (e) {
        console.error('Error parsing rank:', e);
    }
    console.log('Rank:', rank);
    
    // Calculate a join date (use today's date)
    const today = new Date();
    let joinDate;
    const storedJoinDate = localStorage.getItem('joinDate') || sessionStorage.getItem('joinDate');
    if (storedJoinDate) {
        joinDate = storedJoinDate;
        console.log('Using stored join date:', joinDate);
    } else {
        joinDate = formatDate(today);
        console.log('Generated join date:', joinDate);
    }
    console.log('Join Date:', joinDate);
    
    // Get referral count with fallback
    let referralCount = 0;
    try {
        referralCount = parseInt(localStorage.getItem('referralCount') || sessionStorage.getItem('referralCount') || '0');
    } catch (e) {
        console.error('Error parsing referral count:', e);
    }
    console.log('Referral Count:', referralCount);
    
    // Get referral bonus with fallback
    let referralBonus = 0;
    try {
        referralBonus = parseInt(localStorage.getItem('referralBonus') || sessionStorage.getItem('referralBonus') || '0');
    } catch (e) {
        console.error('Error parsing referral bonus:', e);
    }
    console.log('Referral Bonus:', referralBonus);
    
    // Create achievements based on the user's score and rank
    const achievements = [];
    
    // Basic achievement for all users
    achievements.push({
        icon: 'fas fa-play-circle',
        name: 'Hop Bunny Player',
        description: 'Joined the hopping adventure'
    });
    
    // Achievement based on rank - only add if we have a valid rank (not our default 999)
    if (rank < 999) {
    if (rank === 1) {
        achievements.push({
            icon: 'fas fa-crown',
            name: 'Top Hopper',
            description: 'Reached #1 on the leaderboard'
        });
    } else if (rank <= 3) {
        achievements.push({
            icon: 'fas fa-medal',
            name: 'Leaderboard Elite',
            description: `Reached #${rank} on the leaderboard`
        });
    } else if (rank <= 10) {
        achievements.push({
            icon: 'fas fa-award',
            name: 'Top 10',
            description: `Ranked #${rank} on the leaderboard`
        });
        } else if (rank <= 50) {
            achievements.push({
                icon: 'fas fa-star',
                name: 'Rising Star',
                description: `In the top 50 on the leaderboard`
            });
        }
    }
    
    // Achievements based on score
    if (highScore >= 5000) {
        achievements.push({
            icon: 'fas fa-fire',
            name: '5K Master',
            description: 'Scored over 5,000 points'
        });
    } else if (highScore >= 1000) {
        achievements.push({
            icon: 'fas fa-star',
            name: '1K Club',
            description: 'Scored over 1,000 points'
        });
    }
    
    // Achievements based on referrals
    if (referralCount >= 10) {
        achievements.push({
            icon: 'fas fa-user-friends',
            name: 'Community Builder',
            description: 'Referred 10+ players to Hop Bunny'
        });
    } else if (referralCount >= 5) {
        achievements.push({
            icon: 'fas fa-user-plus',
            name: 'Friend Bringer',
            description: 'Referred 5+ players to Hop Bunny'
        });
    } else if (referralCount >= 1) {
        achievements.push({
            icon: 'fas fa-share-alt',
            name: 'Word Spreader',
            description: 'Referred their first player to Hop Bunny'
        });
    }
    
    // Generate some recent game history
    const gameHistory = [];
    
    // Add the best score game
    gameHistory.push({
        date: formatDate(today),
        score: highScore,
        isHighScore: true
    });
    
    // Add some additional game entries
    for (let i = 1; i <= 3; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(pastDate.getDate() - i);
        
        gameHistory.push({
            date: formatDate(pastDate),
            score: Math.floor(highScore * 0.8), // 80% of high score
            isHighScore: false
        });
    }
    
    console.log('Profile data prepared successfully');
    
    return {
        userId: userId || 'guest',
        username: username,
        joinDate: joinDate,
        highScore: highScore,
        rank: rank,
        referralCount: referralCount,
        referralBonus: referralBonus,
        achievements: achievements,
        gameHistory: gameHistory,
        referralLink: generateReferralLink(userId || 'guest', username)
    };
}

/**
 * Fetch and display user's rank
 */
async function fetchAndDisplayRank(userData) {
    try {
        // Always fetch fresh rank from leaderboard for consistency
        console.log('Fetching fresh rank from leaderboard for profile display');
        const userId = userData.$id || userData.userId;
        
        if (!userId) {
            console.error('No user ID available for rank fetching');
            if (playerRank) playerRank.textContent = `--`;
            return;
        }
        
        // Get the rank from leaderboard data
        const rank = await fetchLeaderboardDataForRank(userId);
        console.log('Fresh rank fetched for profile:', rank);
        
        // Display the rank
        if (rank !== undefined && rank !== null) {
            if (playerRank) playerRank.textContent = `#${rank}`;
            
            // Store the rank in localStorage for use elsewhere
            localStorage.setItem('rank', rank.toString());
            sessionStorage.setItem('rank', rank.toString());
            
            // Apply appropriate styling
            addTopPlayerStyles(rank);
        } else {
            // Fallback if rank can't be determined
            if (playerRank) playerRank.textContent = `--`;
        }
    } catch (error) {
        console.error('Error fetching rank:', error);
        if (playerRank) playerRank.textContent = `--`;
    }
}

/**
 * Display profile data in the UI
 */
async function displayProfileData(userData) {
    try {
        // Hide loading state
        if (loadingState) loadingState.style.display = 'none';
        
        console.log('Displaying profile data:', userData);
        
        // Check if userData is null or undefined
        if (!userData) {
            console.error('userData is null or undefined');
            showError('No profile data available');
            return;
        }
        
        // Extract data from user object
        const username = userData.displayName || userData.username || 'Anonymous';
        const createdAt = userData.$createdAt || userData.createdAt || new Date().toISOString();
        const score = parseInt(userData.score || userData.highScore || 0);
        const gamesPlayed = parseInt(userData.gamesPlayed || 0);
        
        // Save referral count to localStorage if it exists in the data
        if (userData.referralCount !== undefined) {
            const referralCount = parseInt(userData.referralCount || 0);
            console.log('Saving referral count to storage:', referralCount);
            localStorage.setItem('referralCount', referralCount.toString());
            sessionStorage.setItem('referralCount', referralCount.toString());
        }
        
        // Format join date
        const joinDateFormatted = formatDate(createdAt);
        
        // Generate the referral link if not present
        if (!userData.referralLink && (userData.$id || userData.userId)) {
            userData.referralLink = generateReferralLink(userData.$id || userData.userId, username);
        }
        
        // Update the UI elements
        if (profileUsername) profileUsername.textContent = username;
        if (joinDate) joinDate.textContent = joinDateFormatted;
        if (highScore) highScore.textContent = formatNumber(score);
        
        // Also update the score in the header for consistency
        const currentUserScoreElement = document.getElementById('currentUserScore');
        if (currentUserScoreElement) {
            currentUserScoreElement.textContent = formatNumber(score);
            
            // Update localStorage with the latest score
            localStorage.setItem('score', score.toString());
            localStorage.setItem('highScore', score.toString());
            sessionStorage.setItem('score', score.toString());
            sessionStorage.setItem('highScore', score.toString());
        }
        
        // Fetch and display user's rank using our new function
        await fetchAndDisplayRank(userData);
        
        // Show profile data
        if (profileData) profileData.style.display = 'block';
        
        // Hide error state if visible
        if (errorState) errorState.style.display = 'none';
        
        // Display achievements
        if (userData.achievements) {
            displayAchievements(userData.achievements);
        } else {
            // Generate default achievements based on score and games played
            const generatedAchievements = generateAchievementsFromStats(score, gamesPlayed);
            displayAchievements(generatedAchievements);
        }
        
        // Show referral section if userID is available
        if (userData.$id || userData.userId) {
            await displayReferralSection(userData);
        }
        
        // Animate in the content
        animateProfileContent();
        
        return userData;
    } catch (error) {
        console.error('Error displaying profile data:', error);
        showError('Failed to display profile data');
        return null;
    }
}

/**
 * Generate achievements based on user stats when none are provided from server
 * @param {number} score - User's score
 * @param {number} gamesPlayed - Number of games played
 * @returns {Array} Array of achievement objects
 */
function generateAchievementsFromStats(score, gamesPlayed) {
    const achievements = [];
    
    // Get referral count from storage if available
    let referralCount = 0;
    try {
        referralCount = parseInt(localStorage.getItem('referralCount') || sessionStorage.getItem('referralCount') || '0');
        console.log('Referral count for achievements:', referralCount);
    } catch (e) {
        console.error('Error parsing referral count:', e);
    }
    
    // Score-based achievements
    if (score >= 100) {
        achievements.push({
            id: 'score_100',
            title: 'Century Hopper',
            description: 'Reach 100 points',
            icon: 'fa-star',
            unlocked: true
        });
    }
    
    if (score >= 500) {
        achievements.push({
            id: 'score_500',
            title: 'High Flyer',
            description: 'Reach 500 points',
            icon: 'fa-medal',
            unlocked: true
        });
    }
    
    if (score >= 1000) {
        achievements.push({
            id: 'score_1000',
            title: 'Master Jumper',
            description: 'Reach 1,000 points',
            icon: 'fa-trophy',
            unlocked: true
        });
    }
    
    // Games played achievements
    if (gamesPlayed >= 5) {
        achievements.push({
            id: 'games_5',
            title: 'Regular Player',
            description: 'Play 5 games',
            icon: 'fa-gamepad',
            unlocked: true
        });
    }
    
    if (gamesPlayed >= 20) {
        achievements.push({
            id: 'games_20',
            title: 'Dedicated Hopper',
            description: 'Play 20 games',
            icon: 'fa-crown',
            unlocked: true
        });
    }
    
    // Referral achievements
    if (referralCount >= 1) {
        achievements.push({
            id: 'referral_1',
            title: 'Community Builder',
            description: 'Invited first friend to play',
            icon: 'fa-user-plus',
            unlocked: true
        });
    }
    
    if (referralCount >= 3) {
        achievements.push({
            id: 'referral_3',
            title: 'Social Hopper',
            description: 'Invited 3+ friends to play',
            icon: 'fa-users',
            unlocked: true
        });
    }
    
    if (referralCount >= 10) {
        achievements.push({
            id: 'referral_10',
            title: 'Hop Ambassador',
            description: 'Invited 10+ friends to play',
            icon: 'fa-certificate',
            unlocked: true
        });
    }
    
    // If user has not unlocked any achievements yet
    if (achievements.length === 0) {
        achievements.push({
            id: 'welcome',
            title: 'Welcome!',
            description: 'Create your account and start playing',
            icon: 'fa-award',
            unlocked: true
        });
    }
    
    // Add referral invitation achievement for everyone
    achievements.push({
        id: 'referral_invite',
        title: 'Friend Inviter',
        description: 'Share your referral code with friends',
        icon: 'fa-share-alt',
        unlocked: true
    });
    
    return achievements;
}

/**
 * Display the referral section with stats and referral link
 */
async function displayReferralSection(userData) {
    console.log('Displaying referral section with user data:', userData);
    
    let referralCount = userData.referralCount || 0;
    
    // First fetch the latest referral count (if we haven't already)
    if (userData.userId && userData.userId !== 'guest' && (!userData.referralCount || userData.referralCount === 0)) {
        try {
            console.log('Attempting to fetch fresh referral count for userId:', userData.userId);
            const freshReferralCount = await fetchReferralCount(userData.userId);
            if (freshReferralCount !== undefined && freshReferralCount !== null) {
                referralCount = freshReferralCount;
                console.log('Successfully fetched fresh referral count:', referralCount);
            } else {
                console.warn('Received undefined/null referral count, using existing value:', referralCount);
            }
        } catch (error) {
            console.error('Error fetching fresh referral count, using existing value:', error);
        }
    } else {
        console.log('Using existing referral count or skipping fetch for guest user');
    }
    
    // Update the userData object with our possibly fresh count
    userData.referralCount = referralCount;
    
    // Generate referral link if not present
    if (!userData.referralLink) {
        userData.referralLink = generateReferralLink(userData.userId || 'guest', userData.username || 'Guest');
    }
    
    // Create referral section if it doesn't exist
    let referralSection = document.querySelector('.referral-section');
    
    if (!referralSection) {
        // Create the referral section
        referralSection = document.createElement('div');
        referralSection.className = 'referral-section';
        
        // Create section title
        const sectionTitle = document.createElement('h3');
        sectionTitle.className = 'section-title';
        sectionTitle.innerHTML = '<i class="fas fa-user-plus"></i> Invite Friends';
        
        // Create referral stats 
        const referralStats = document.createElement('div');
        referralStats.className = 'referral-stats';
        
        // Create referral link container
        const referralLinkContainer = document.createElement('div');
        referralLinkContainer.className = 'referral-link-container';
        
        // Add the elements to the section
        referralSection.appendChild(sectionTitle);
        referralSection.appendChild(referralStats);
        referralSection.appendChild(referralLinkContainer);
        
        // Insert the referral section before the actions row
        const actionsRow = document.querySelector('.actions-row');
        if (actionsRow) {
            profileData.insertBefore(referralSection, actionsRow);
        } else {
            profileData.appendChild(referralSection);
        }
    }
    
    // Populate referral stats
    const referralStats = referralSection.querySelector('.referral-stats');
    referralStats.innerHTML = `
        <div class="stat-item">
            <div class="stat-icon"><i class="fas fa-users"></i></div>
            <div class="stat-info">
                <div class="stat-value">${userData.referralCount || 0}</div>
                <div class="stat-label">Friends Referred</div>
            </div>
        </div>
    `;
    
    // Populate referral link container
    const referralLinkContainer = referralSection.querySelector('.referral-link-container');
    referralLinkContainer.innerHTML = `
        <p class="referral-info">Share your unique link with friends. When they sign up, you'll earn 500 bonus points and they'll get 200!</p>
        <div class="referral-link-group">
            <input type="text" id="referralLinkInput" value="${userData.referralLink}" readonly>
        </div>
        <div class="referral-buttons">
            <button id="copyReferralButton" class="game-button small-button">
                <i class="fas fa-copy"></i> Copy
            </button>
            <button id="shareReferralButton" class="game-button small-button primary-button">
                <i class="fas fa-share-alt"></i> Share
            </button>
        </div>
    `;
    
    // Add click event listeners to the buttons
    document.getElementById('copyReferralButton').addEventListener('click', copyReferralLink);
    document.getElementById('shareReferralButton').addEventListener('click', shareReferralLink);
    
    // Add styles if not added already
    if (!document.getElementById('referral-styles')) {
        addReferralStyles();
    }
}

/**
 * Add special styles for top players
 */
function addTopPlayerStyles(rank) {
    try {
        // Get the rank card element
        const rankCard = document.querySelector('.rank-card');
        if (!rankCard) return;
        
        // First remove any existing rank classes
        rankCard.classList.remove('gold-rank', 'silver-rank', 'bronze-rank', 'top-ten-rank', 'new-player-rank');
        
        // Handle different rank types
        if (rank === 1) {
            // Gold style for #1 ranked player
            rankCard.classList.add('gold-rank');
            
            const rankIcon = rankCard.querySelector('.stat-icon i');
            if (rankIcon) {
                rankIcon.className = 'fas fa-crown';
            }
        } else if (rank === 2) {
            // Silver style for #2 ranked player
            rankCard.classList.add('silver-rank');
            
            const rankIcon = rankCard.querySelector('.stat-icon i');
            if (rankIcon) {
                rankIcon.className = 'fas fa-medal';
            }
        } else if (rank === 3) {
            // Bronze style for #3 ranked player
            rankCard.classList.add('bronze-rank');
            
            const rankIcon = rankCard.querySelector('.stat-icon i');
            if (rankIcon) {
                rankIcon.className = 'fas fa-medal';
            }
        } else if (rank <= 10) {
            // Top 10 style
            rankCard.classList.add('top-ten-rank');
        }
        
        // Add rank styles if they don't exist yet
        if (!document.getElementById('rank-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'rank-styles';
            styleEl.textContent = `
        .gold-rank {
                    background: linear-gradient(135deg, #f1c40f, #f39c12);
                    animation: pulse-gold 2s infinite;
                }
                
                .silver-rank {
                    background: linear-gradient(135deg, #bdc3c7, #95a5a6);
                    animation: pulse-silver 2s infinite;
                }
                
                .bronze-rank {
                    background: linear-gradient(135deg, #e67e22, #d35400);
                    animation: pulse-bronze 2s infinite;
                }
                
                .top-ten-rank {
                    background: linear-gradient(135deg, #3498db, #2980b9);
                }
                
                .gold-rank .stat-icon i {
                    color: #f1c40f;
                    text-shadow: 0 0 10px rgba(241, 196, 15, 0.7);
                }
                
                .silver-rank .stat-icon i {
                    color: #ecf0f1;
                    text-shadow: 0 0 10px rgba(236, 240, 241, 0.7);
                }
                
                .bronze-rank .stat-icon i {
                    color: #e67e22;
                    text-shadow: 0 0 10px rgba(230, 126, 34, 0.7);
                }
                
                @keyframes pulse-gold {
                    0% { box-shadow: 0 0 0 0 rgba(241, 196, 15, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(241, 196, 15, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(241, 196, 15, 0); }
                }
                
                @keyframes pulse-silver {
                    0% { box-shadow: 0 0 0 0 rgba(189, 195, 199, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(189, 195, 199, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(189, 195, 199, 0); }
                }
                
                @keyframes pulse-bronze {
                    0% { box-shadow: 0 0 0 0 rgba(230, 126, 34, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(230, 126, 34, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(230, 126, 34, 0); }
                }
            `;
            document.head.appendChild(styleEl);
        }
    } catch (error) {
        console.error('Error adding top player styles:', error);
    }
}

/**
 * Display user achievements in the profile
 */
function displayAchievements(achievements) {
    // Get the achievements section element
    const achievementsSection = document.querySelector('.achievement-section');
    
    // Check if achievements section exists
    if (!achievementsSection) {
        console.log('Achievements section not found, creating one');
        
        // Create achievements section
        const newSection = document.createElement('div');
        newSection.className = 'achievement-section';
        
        // Create section title
        const sectionTitle = document.createElement('h3');
        sectionTitle.className = 'section-title';
        sectionTitle.innerHTML = '<i class="fas fa-medal"></i> Achievements';
        
        // Create achievements list container
        const achievementsListContainer = document.createElement('div');
        achievementsListContainer.id = 'achievementsList';
        achievementsListContainer.className = 'achievements-list';
        
        // Assemble section
        newSection.appendChild(sectionTitle);
        newSection.appendChild(achievementsListContainer);
        
        // Insert before game history or actions row
        const profileData = document.getElementById('profileData');
        const gameHistory = document.querySelector('.game-history');
        const actionsRow = document.querySelector('.actions-row');
        
        if (profileData) {
            if (gameHistory) {
                profileData.insertBefore(newSection, gameHistory);
            } else if (actionsRow) {
                profileData.insertBefore(newSection, actionsRow);
            } else {
                profileData.appendChild(newSection);
            }
        } else {
            console.error('Profile data container not found');
            return; // Exit if we can't append
        }
    }
    
    // Get the achievements list element
    const achievementsList = document.getElementById('achievementsList');
    
    // Check if achievements list exists
    if (!achievementsList) {
        console.error('Achievements list not found');
        return;
    }
    
    // Add custom styles to fix layout issues if they don't exist already
    if (!document.getElementById('achievement-fix-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'achievement-fix-styles';
        styleEl.textContent = `
            .achievements-list {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 15px;
                width: 100%;
            }
            
            .achievement {
                display: flex;
                align-items: center;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 12px;
                transition: transform 0.3s ease;
                overflow: hidden;
            }
            
            .achievement-icon {
                min-width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(59, 130, 246, 0.2);
                border-radius: 50%;
                margin-right: 12px;
                flex-shrink: 0;
            }
            
            .achievement-info {
                flex: 1;
                min-width: 0;
                overflow: hidden;
            }
            
            .achievement-name {
                font-weight: 600;
                margin-bottom: 3px;
                color: #ffffff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .achievement-desc {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.7);
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            @media (max-width: 600px) {
                .achievements-list {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    // Clear previous achievements
    achievementsList.innerHTML = '';
    
    if (!achievements || achievements.length === 0) {
        achievementsList.innerHTML = `
            <div class="achievement" style="grid-column: 1 / -1; justify-content: center;">
                <p>No achievements yet.</p>
            </div>
        `;
        return;
    }
    
    // Add achievement items
    achievements.forEach(achievement => {
        try {
            if (!achievement) return;
            
            const achievementItem = document.createElement('div');
            achievementItem.className = 'achievement';
            
            // Use title/name property depending on which is available
            const iconClass = achievement.icon?.startsWith('fa-') 
                ? `fas ${achievement.icon}` 
                : (achievement.icon || 'fas fa-award');
                
            const name = achievement.title || achievement.name || 'Achievement';
            const description = achievement.description || 'Complete specific tasks to earn this achievement';
            
            achievementItem.innerHTML = `
                <div class="achievement-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="achievement-info">
                    <div class="achievement-name">${name}</div>
                    <div class="achievement-desc">${description}</div>
                </div>
            `;
            
            achievementsList.appendChild(achievementItem);
        } catch (error) {
            console.error('Error displaying achievement:', error, achievement);
        }
    });
}

/**
 * Animate profile content when it loads
 */
function animateProfileContent() {
    // Animate stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }, 100 + (index * 100));
    });
    
    // Animate other sections
    const sections = [
        document.querySelector('.profile-header'),
        document.querySelector('.achievement-section'),
        document.querySelector('.referral-section'),
        document.querySelector('.actions-row')
    ];
    
    sections.forEach((section, index) => {
        if (!section) return;
        
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            section.style.transition = 'all 0.4s ease';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 300 + (index * 150));
    });
}

/**
 * Show error message in the profile
 */
function showError(message) {
    // Check if elements exist before manipulating them
    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'block';
    if (profileData) profileData.style.display = 'none';
    
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.textContent = message || 'Could not load the requested profile. The user may not exist or there was a connection error.';
    } else {
        console.error('Error message container not found. Error:', message);
    }
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
}

/**
 * Generate a referral link for the user
 */
function generateReferralLink(userId, username) {
    // Get the base URL from config or window.location
    const baseUrl = window.location.origin;
    
    // We only need the user ID for the referral
    const encodedUserId = encodeURIComponent(userId);
    
    // Generate the full referral link without .html extension for cleaner URLs
    return `${baseUrl}/?ref=${encodedUserId}`;
}

/**
 * Copy the referral link to clipboard
 */
function copyReferralLink() {
    const referralLinkInput = document.getElementById('referralLinkInput');
    
    if (!referralLinkInput) {
        console.error('Referral link input not found');
        return;
    }
    
    // Select the text field
    referralLinkInput.select();
    referralLinkInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        // Use modern navigator.clipboard API if available
        if (navigator.clipboard) {
            navigator.clipboard.writeText(referralLinkInput.value)
                .then(() => {
                    showCopySuccess();
                })
                .catch(err => {
                    console.error('Navigator clipboard failed:', err);
                    fallbackCopy();
                });
        } else {
            // Fall back to document.execCommand (deprecated but useful as fallback)
            fallbackCopy();
        }
    } catch (err) {
        console.error('Copy failed:', err);
        fallbackCopy();
    }
    
    // Fallback copy method using document.execCommand
    function fallbackCopy() {
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopySuccess();
            } else {
                console.error('Fallback copy unsuccessful');
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
    }
    
    // Show success message
    function showCopySuccess() {
        // Create success message if it doesn't exist
        let successMessage = document.querySelector('.copy-success');
        if (!successMessage) {
            successMessage = document.createElement('div');
            successMessage.className = 'copy-success';
            successMessage.textContent = 'Link copied to clipboard!';
            document.body.appendChild(successMessage);
        }
        
        // Show the message
        successMessage.style.display = 'block';
        
        // Hide after 2 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 2000);
    }
}

/**
 * Share the referral link using the Web Share API or fallback
 */
function shareReferralLink() {
    const referralLinkInput = document.getElementById('referralLinkInput');
    
    if (!referralLinkInput) {
        console.error('Referral link input not found');
        return;
    }
    
    const referralLink = referralLinkInput.value;
    const shareTitle = 'Join me in Hop Bunny!';
    const shareText = 'Play Hop Bunny with me and earn bonus points!';
    
    // Check if Web Share API is available
    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            text: shareText,
            url: referralLink
        })
        .then(() => {
            console.log('Shared successfully');
        })
        .catch(error => {
            console.error('Error sharing:', error);
            fallbackShare();
        });
    } else {
        fallbackShare();
    }
    
    // Fallback sharing method
    function fallbackShare() {
        // On desktop, copy to clipboard
        copyReferralLink();
        
        // Provide additional sharing options or instructions
        let shareOptions = document.querySelector('.share-options');
        
        if (!shareOptions) {
            shareOptions = document.createElement('div');
            shareOptions.className = 'share-options';
            
            // Create options content
            shareOptions.innerHTML = `
                <div class="share-header">Share via:</div>
                <div class="share-buttons">
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}" target="_blank" class="share-button twitter">
                        <i class="fab fa-twitter"></i> Twitter
                    </a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}" target="_blank" class="share-button facebook">
                        <i class="fab fa-facebook"></i> Facebook
                    </a>
                    <a href="mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + '\n\n' + referralLink)}" class="share-button email">
                        <i class="fas fa-envelope"></i> Email
                    </a>
                </div>
                <div class="share-close">Close</div>
            `;
            
            // Add to page
            const referralSection = document.querySelector('.referral-section');
            if (referralSection) {
                referralSection.appendChild(shareOptions);
                
                // Add close button functionality
                shareOptions.querySelector('.share-close').addEventListener('click', () => {
                    shareOptions.style.display = 'none';
                });
            }
        }
        
        // Show the options
        shareOptions.style.display = 'block';
    }
}

/**
 * Get mock user data for demo purposes
 * In a real app, this would be replaced with API calls
 */
function getMockUserData(userId) {
    // For demo purposes, we'll have a few mock users
    const mockUsers = [
        {
            userId: '1',
            username: 'MasterHopper',
            joinDate: '2023-05-15',
            highScore: 45780,
            gamesPlayed: 156,
            rank: 1,
            highestJump: 1250,
            achievements: [
                {
                    icon: 'fas fa-crown',
                    name: 'Top Player',
                    description: 'Reached #1 on the leaderboard'
                },
                {
                    icon: 'fas fa-fire',
                    name: 'Hot Streak',
                    description: 'Played 20 games in one day'
                },
                {
                    icon: 'fas fa-bolt',
                    name: 'Speed Runner',
                    description: 'Reached 1000 points in under 30 seconds'
                },
                {
                    icon: 'fas fa-star',
                    name: '10K Club',
                    description: 'Scored over 10,000 points'
                }
            ],
            gameHistory: [
                { date: '2023-08-10', score: 45780, isHighScore: true },
                { date: '2023-08-09', score: 42150, isHighScore: false },
                { date: '2023-08-08', score: 38920, isHighScore: false },
                { date: '2023-08-07', score: 35670, isHighScore: false },
                { date: '2023-08-06', score: 31540, isHighScore: false }
            ]
        },
        {
            userId: '2',
            username: 'BunnyJumper',
            joinDate: '2023-06-22',
            highScore: 38950,
            gamesPlayed: 89,
            rank: 2,
            highestJump: 1150,
            achievements: [
                {
                    icon: 'fas fa-medal',
                    name: 'Silver League',
                    description: 'Reached #2 on the leaderboard'
                },
                {
                    icon: 'fas fa-star',
                    name: '10K Club',
                    description: 'Scored over 10,000 points'
                },
                {
                    icon: 'fas fa-heart',
                    name: 'Dedicated Player',
                    description: 'Played 50+ games'
                }
            ],
            gameHistory: [
                { date: '2023-08-09', score: 38950, isHighScore: true },
                { date: '2023-08-08', score: 36780, isHighScore: false },
                { date: '2023-08-07', score: 33400, isHighScore: false },
                { date: '2023-08-05', score: 31200, isHighScore: false }
            ]
        },
        {
            userId: '3',
            username: 'HopKing',
            joinDate: '2023-04-30',
            highScore: 36240,
            gamesPlayed: 112,
            rank: 3,
            highestJump: 1080,
            achievements: [
                {
                    icon: 'fas fa-award',
                    name: 'Bronze League',
                    description: 'Reached #3 on the leaderboard'
                },
                {
                    icon: 'fas fa-star',
                    name: '10K Club',
                    description: 'Scored over 10,000 points'
                },
                {
                    icon: 'fas fa-calendar-check',
                    name: 'Consistency',
                    description: 'Played every day for a week'
                }
            ],
            gameHistory: [
                { date: '2023-08-10', score: 36240, isHighScore: true },
                { date: '2023-08-09', score: 34150, isHighScore: false },
                { date: '2023-08-08', score: 32980, isHighScore: false },
                { date: '2023-08-07', score: 30500, isHighScore: false }
            ]
        }
    ];
    
    // Find the user
    return mockUsers.find(user => user.userId === userId) || null;
}

/**
 * Add CSS styles for the referral section
 */
function addReferralStyles() {
    // Check if styles have already been added
    if (document.getElementById('referral-styles')) {
        return;
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'referral-styles';
    
    // Define styles
    const css = `
        .referral-section {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(5px);
            position: relative;
        }
        
        .referral-stats {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            min-width: 180px;
            transition: transform 0.3s ease;
        }
        
        .stat-item:hover {
            transform: translateY(-3px);
        }
        
        .stat-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(59, 130, 246, 0.2);
            border-radius: 50%;
            color: #3498db;
            font-size: 20px;
        }
        
        .stat-info {
            flex: 1;
        }
        
        .stat-value {
            font-weight: 600;
            font-size: 20px;
            margin-bottom: 3px;
            color: #ffffff;
        }
        
        .stat-label {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
        }
        
        .referral-info {
            text-align: center;
            margin-bottom: 15px;
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            line-height: 1.4;
        }
        
        .referral-link-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: stretch;
        }
        
        #referralLinkInput {
            width: 100%;
            padding: 12px 15px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-family: 'Fredoka', sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }
        
        .referral-buttons {
            display: flex;
            gap: 10px;
            width: 100%;
            margin-top: 10px;
        }
        
        .referral-buttons .game-button {
            flex: 1;
            padding: 12px;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .game-button.small-button {
            min-width: 0;
            white-space: nowrap;
        }
        
        .game-button.small-button i {
            margin-right: 5px;
        }
        
        .game-button.success {
            background: #2ecc71;
            box-shadow: 0 4px 10px rgba(46, 204, 113, 0.4);
        }
        
        /* Share options styles */
        .share-options {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(41, 128, 185, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 100;
            width: 90%;
            max-width: 320px;
            display: none;
        }
        
        .share-header {
            text-align: center;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            color: white;
        }
        
        .share-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .share-button {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px;
            border-radius: 10px;
            color: white;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .share-button i {
            margin-right: 10px;
            font-size: 18px;
        }
        
        .share-button.twitter {
            background: #1DA1F2;
        }
        
        .share-button.facebook {
            background: #1877F2;
        }
        
        .share-button.email {
            background: #555;
        }
        
        .share-button:hover {
            transform: translateY(-2px);
            filter: brightness(1.1);
        }
        
        .share-close {
            text-align: center;
            margin-top: 15px;
            padding: 8px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .share-close:hover {
            text-decoration: underline;
        }
        
        /* Copy success message */
        .copy-success {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(46, 204, 113, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            animation: fadeInOut 2s ease;
            z-index: 1000;
            display: none;
        }
        
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -10px); }
            10% { opacity: 1; transform: translate(-50%, 0); }
            90% { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -10px); }
        }
        
        @media (max-width: 500px) {
            .referral-link-group {
                flex-direction: column;
                width: 100%;
            }
            
            .referral-buttons {
                display: flex;
                width: 100%;
                gap: 8px;
            }
            
            .referral-buttons .game-button {
                flex: 1;
                min-width: 0;
                white-space: nowrap;
                padding: 10px 0;
            }
            
            #referralLinkInput {
                margin-bottom: 10px;
                font-size: 12px;
                padding: 10px;
                width: 100%;
            }
            
            .stat-item {
                min-width: 100%;
                margin: 5px 0;
            }
        }
    `;
    
    // Add the styles to the style element
    style.textContent = css;
    
    // Append the style element to the head
    document.head.appendChild(style);
}

/**
 * Add enhanced button styles for the profile page
 */
function enhanceButtonStyles() {
    // Check if styles have already been added
    if (document.getElementById('enhanced-button-styles')) {
        return;
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'enhanced-button-styles';
    
    // Define enhanced button styles
    const css = `
        .game-button.primary-button {
            background: linear-gradient(135deg, #5b9be2, #3498db) !important;
            box-shadow: 0 8px 20px rgba(52, 152, 219, 0.5) !important;
        }
        
        .game-button.primary-button::before {
            background: linear-gradient(135deg, #3498db, #2980b9) !important;
        }
        
        .game-button.primary-button:hover {
            box-shadow: 0 10px 25px rgba(52, 152, 219, 0.6) !important;
        }
        
        .game-button.primary-button:active {
            box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4) !important;
        }
        
        .game-button i {
            margin-right: 10px !important;
            font-size: 18px !important;
            vertical-align: middle !important;
        }
        
        .actions-row {
            display: flex !important;
            justify-content: center !important;
            gap: 20px !important;
            margin-top: 30px !important;
            margin-bottom: 30px !important;
            padding-bottom: 60px !important; /* Add padding to prevent buttons from being cut off */
        }
        
        .actions-row .game-button {
            min-width: 180px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        /* For mobile devices */
        @media (max-width: 480px) {
            .game-button {
                padding: 14px 20px !important;
                font-size: 14px !important;
            }
            
            .actions-row {
                flex-direction: column !important;
                align-items: center !important;
            }
            
            .actions-row .game-button {
                width: 100% !important;
                max-width: 280px !important;
            }
        }
    `;
    
    // Add the styles to the style element
    style.textContent = css;
    
    // Append the style element to the head
    document.head.appendChild(style);
}

/**
 * Fetch leaderboard data to determine the user's rank
 */
async function fetchLeaderboardDataForRank(userId) {
    try {
        console.log('Fetching leaderboard rank for user:', userId);
        
        // First check if leaderboard data is already cached by the leaderboard page
        if (window.leaderboardCache && typeof window.leaderboardCache.get === 'function') {
            const cachedData = window.leaderboardCache.get();
            if (cachedData && Array.isArray(cachedData)) {
                console.log('Using cached leaderboard data for rank');
                // Find the user's position in the sorted cached list
                const position = cachedData.findIndex(user => user.userId === userId);
                
                if (position !== -1) {
                    // Add 1 because array indices are 0-based, but ranks start at 1
                    const rank = position + 1;
                    console.log(`User ${userId} is ranked #${rank} (from cache)`);
                    return rank;
                }
            }
        }
        
        // If no cached data, try to fetch from leaderboard function if available
        if (window.fetchLeaderboardData && typeof window.fetchLeaderboardData === 'function') {
            console.log('Fetching fresh leaderboard data from shared function');
            const leaderboardData = await window.fetchLeaderboardData();
            
            if (leaderboardData && Array.isArray(leaderboardData)) {
                // Find the user's position in the sorted list
                const position = leaderboardData.findIndex(user => user.userId === userId);
                
                if (position !== -1) {
                    // Add 1 because array indices are 0-based, but ranks start at 1
                    const rank = position + 1;
                    console.log(`User ${userId} is ranked #${rank} (from shared function)`);
                    return rank;
                }
            }
        }
        
        // Fall back to direct Appwrite query as a last resort
        console.log('Falling back to direct Appwrite query for rank');
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
        
        console.log('Leaderboard data fetched from Appwrite for rank calculation');
            
            if (!response || !response.documents) {
                throw new Error('Invalid response from Appwrite');
            }
            
        // Find the user's position in the sorted list
        const position = response.documents.findIndex(user => user.$id === userId);
        
        if (position !== -1) {
            // Add 1 because array indices are 0-based, but ranks start at 1
            const rank = position + 1;
            console.log(`User ${userId} is ranked #${rank} (from Appwrite query)`);
                return rank;
            } else {
            console.log(`User ${userId} not found in leaderboard`);
            // If user not found on leaderboard, return a high number
            return 999;
        }
    } catch (error) {
        console.error('Error fetching leaderboard data for rank:', error);
        
        // Try fallback method using API endpoint
        try {
            const response = await fetch(`${config.apiEndpoint}/leaderboard`);
            if (response.ok) {
            const data = await response.json();
                
                if (data && Array.isArray(data)) {
                    // Find the user's position in the sorted list
                    const position = data.findIndex(user => user.userId === userId);
                    
                    if (position !== -1) {
                        // Add 1 because array indices are 0-based, but ranks start at 1
                        const rank = position + 1;
                        console.log(`User ${userId} is ranked #${rank} (via API fallback)`);
                return rank;
                    }
                }
            }
        } catch (fallbackError) {
            console.error('Error in fallback rank fetch:', fallbackError);
        }
        
        // Return a default high rank if all methods fail
        return 999;
    }
}

/**
 * Fetch the user's referral count from the API
 */
async function fetchReferralCount(userId) {
    try {
        console.log('Fetching referral count for userId:', userId);
        
        // Try to fetch from Appwrite first
        try {
            // Get the user document, which should include referral count
            const userDoc = await databases.getDocument(
                config.databaseId,
                config.usersCollectionId,
                userId
            );
            
            if (userDoc && userDoc.referralCount !== undefined) {
                console.log('Referral count from Appwrite:', userDoc.referralCount);
                return userDoc.referralCount;
            } else {
                throw new Error('Referral count not found in Appwrite user document');
            }
        } catch (appwriteError) {
            console.warn('Failed to fetch referral count from Appwrite, trying API endpoint:', appwriteError);
            
            // Fall back to API endpoint
            const response = await fetch(`${config.apiEndpoint}/referral/stats/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                cache: 'no-cache' // Always get fresh data
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch referral count from API');
            }
            
            const data = await response.json();
            console.log('Referral data from API:', data);
            
            if (data && data.referralCount !== undefined) {
                return data.referralCount;
            } else {
                console.warn('Referral count not found in API response');
                return 0;
            }
        }
    } catch (error) {
        console.error('Error fetching referral count:', error);
        return 0;
    }
}

/**
 * Set up event listeners for profile tabs
 */
function setupProfileTabs() {
    console.log('Setting up profile tabs');
    // This function would handle tab navigation if your profile page had tabs
    // Since the current profile design doesn't have tabs, this is a placeholder
}

/**
 * Updates the referral count for a user
 * @param {string} userId - The ID of the user to update
 * @param {number} incrementBy - Amount to increment (default: 1)
 * @returns {Promise<Object>} - The updated user document
 */
async function updateReferralCount(userId, incrementBy = 1) {
    try {
        console.log(`📊 Updating referral count for user: ${userId}`);
        
        // Get the current user document
        const userDoc = await databases.getDocument(
            config.databaseId,
            config.usersCollectionId,
            userId
        );
        
        // Calculate current and new values
        const currentCount = typeof userDoc.referralCount === 'number' 
            ? userDoc.referralCount 
            : parseInt(userDoc.referralCount || '0');
        
        const newCount = currentCount + incrementBy;
        console.log(`📈 Referral count: ${currentCount} → ${newCount}`);
        
        // Update the document with new count
        const updatedDoc = await databases.updateDocument(
            config.databaseId,
            config.usersCollectionId,
            userId,
            {
                referralCount: newCount,
                updatedAt: new Date().toISOString()
            }
        );
        
        console.log('✅ Successfully updated referral count!');
        return updatedDoc;
    } catch (error) {
        console.error('❌ Error updating referral count:', error.message);
        throw error;
    }
} 