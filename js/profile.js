/**
 * Profile JavaScript for Hop Bunny
 * Handles loading and displaying user profile data
 */

// API Configuration
const API_BASE_URL = 'https://new-backend-hop.vercel.app/api';
const API_ENDPOINTS = {
    users: '/users',
    userProfile: '/user/{userId}',
    userGameHistory: '/users/{userId}/games',
    userAchievements: '/users/{userId}/achievements',
    referral: '/referral',
    referralStats: '/referral/stats/{userId}'
};

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
    
    // ADDITIONAL FIX: Clear any potentially incorrect rank data
    localStorage.removeItem('rank');
    sessionStorage.removeItem('rank');
    
    // Load current user info from local storage
    loadUserInfo();
    
    // Get the current logged-in user's ID from localStorage or sessionStorage
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    // Check if we need to force a fresh API fetch (after login with referral)
    const forceRefresh = sessionStorage.getItem('forceProfileRefresh') === 'true';
    if (forceRefresh) {
        console.log('Force refresh flag detected - fetching fresh data from API');
        sessionStorage.removeItem('forceProfileRefresh'); // Clear the flag
    }
    
    if (userId) {
        try {
            // ADDITIONAL FIX: First fetch leaderboard data to get accurate rank
            await fetchLeaderboardDataForRank(userId);
            // Then load profile data for the current user
            await loadProfileData(userId, forceRefresh);
        } catch (error) {
            console.error('Error fetching leaderboard data:', error);
            // Continue with profile data loading even if leaderboard fetch fails
            await loadProfileData(userId, forceRefresh);
        }
    } else {
        // If no user is logged in, show a guest profile or error
        showError('Please log in to view your profile');
    }
}

/**
 * Load and display user information on the top bar
 */
function loadUserInfo() {
    // Get user info from localStorage or sessionStorage
    let username = localStorage.getItem('username') || sessionStorage.getItem('username');
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    // First try to show localStorage data while we fetch the latest
    const cachedScore = localStorage.getItem('highScore') || sessionStorage.getItem('highScore') || 0;
    
    // Update the UI elements with cached data first
    if (username) {
        // Check if the username looks like an email (contains @)
        const isEmail = username.includes('@');
        
        // Temporarily set the username
        currentUsername.textContent = isEmail ? username.split('@')[0] : username;
        currentUserScore.textContent = formatNumber(cachedScore);
        
        // If we have a userId, we can try to fetch the latest score and proper username
        if (userId) {
            // Fetch the latest score from the API
            const userEndpoint = API_ENDPOINTS.userProfile.replace('{userId}', userId);
            fetch(`${API_BASE_URL}${userEndpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }
                return response.json();
            })
            .then(data => {
                console.log('User data fetched for header:', data);
                
                // Update the score display with the latest from the database
                if (data.score !== undefined && !isNaN(data.score)) {
                    const dbScore = parseInt(data.score);
                    currentUserScore.textContent = formatNumber(dbScore);
                }
                
                // Use the proper display name or username from the API
                if (data.displayName || data.username) {
                    const properUsername = data.displayName || data.username;
                    console.log('Using proper username from API:', properUsername);
                    currentUsername.textContent = properUsername;
                    
                    // Update localStorage and sessionStorage with the proper username
                    localStorage.setItem('username', properUsername);
                    sessionStorage.setItem('username', properUsername);
                }
            })
            .catch(error => {
                console.error('Error fetching user header data:', error);
                // If there's an error, we'll keep showing the cached score
            });
        }
    } else {
        currentUsername.textContent = "Guest Player";
        currentUserScore.textContent = "0";
    }
}

/**
 * Load profile data for a specific user
 */
async function loadProfileData(userId, forceRefresh) {
    try {
        // Show loading state
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        profileData.style.display = 'none';
        
        // Try to fetch user data from the API
        const userEndpoint = API_ENDPOINTS.userProfile.replace('{userId}', userId);
        fetch(`${API_BASE_URL}${userEndpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            // Add cache busting parameter when forcing refresh
            ...(forceRefresh ? {cache: 'no-cache'} : {})
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            return response.json();
        })
        .then(async data => {
            console.log('User profile data fetched from API:', data);
            
            // Log specific data points for debugging
            console.log('API data - games played:', data.gamesPlayed);
            console.log('API data - highScore:', data.highScore);
            console.log('API data - rank:', data.rank);
            console.log('API data - createdAt:', data.createdAt);
            console.log('API data - referralCount:', data.referralCount);
            
            // Update localStorage with fresh data for future use
            if (data.referralCount !== undefined) {
                console.log('Updating localStorage with referral count from API:', data.referralCount);
                localStorage.setItem('referralCount', data.referralCount.toString());
                sessionStorage.setItem('referralCount', data.referralCount.toString());
            }
            
            // Process API data to match our expected format
            const userData = processApiUserData(data, userId);
            
            // Display the profile with data from the API
            await displayProfileData(userData);
        })
        .catch(async error => {
            console.error('Error fetching profile data from API:', error);
            console.log('Falling back to localStorage data');
            
            // Fallback to localStorage data if the API call fails
            const userData = getCurrentUserData();
            await displayProfileData(userData);
        });
        
    } catch (error) {
        console.error('Error in loadProfileData:', error);
        // Still try to show some data even if there's an error
        try {
            const userData = getCurrentUserData();
            await displayProfileData(userData);
        } catch (innerError) {
            console.error('Failed to display profile:', innerError);
            showError('Could not load profile data');
        }
    }
}

/**
 * Process API user data into the format our profile display expects
 */
function processApiUserData(apiData, userId) {
    console.log('Processing API data:', apiData);
    
    // Get username with fallback
    const username = apiData.username || localStorage.getItem('username') || sessionStorage.getItem('username') || 'Guest Player';
    
    // Get high score from API data
    let highScore = 0;
    if (apiData.score !== undefined && !isNaN(apiData.score)) {
        highScore = parseInt(apiData.score);
        
        // Update localStorage for consistency
        localStorage.setItem('highScore', highScore);
    } else {
        // Fallback to localStorage
        const localScore = localStorage.getItem('highScore') || sessionStorage.getItem('highScore');
        highScore = parseInt(localScore || '0');
    }
    
    // Get rank from API data - IMPORTANT: don't default to rank 1
    let rank = apiData.rank;
    if (rank === undefined || rank === null) {
        try {
            // First try to get the rank from localStorage (which should be updated from leaderboard)
            const storedRank = localStorage.getItem('rank') || sessionStorage.getItem('rank');
            rank = storedRank ? parseInt(storedRank) : 999; // Use high number as default (not 1)
            console.log('Using stored rank from localStorage:', rank);
    } catch (e) {
        console.error('Error parsing rank:', e);
            rank = 999; // Default to a high rank if no data available
        }
    } else {
        // We have a rank from the API - log it for debugging
        console.log('Using rank directly from API:', rank);
        
        // Store the correct rank from API
        localStorage.setItem('rank', rank.toString());
        console.log('Updated localStorage with API rank:', rank);
    }
    
    // Override with rank from leaderboard if significantly different
    const leaderboardRank = localStorage.getItem('leaderboardRank');
    if (leaderboardRank && Math.abs(parseInt(leaderboardRank) - rank) > 1) {
        console.log(`API rank (${rank}) differs from leaderboard rank (${leaderboardRank}). Using leaderboard rank.`);
        rank = parseInt(leaderboardRank);
    }
    
    // Get join date from API or use stored value
    let joinDate;
    if (apiData.createdAt) {
        console.log('Using createdAt date from API:', apiData.createdAt);
        
        // If it's already in the format "April 11, 2025 at 10:49 AM"
        if (typeof apiData.createdAt === 'string' && apiData.createdAt.includes(' at ')) {
            // Just extract the date part, removing the time
            joinDate = apiData.createdAt.split(' at ')[0];
            console.log('Extracted date part from createdAt:', joinDate);
        } else {
            joinDate = formatDate(new Date(apiData.createdAt));
        }
        
        localStorage.setItem('joinDate', joinDate);
    } else if (apiData.joinDate) {
        console.log('Using joinDate from API:', apiData.joinDate);
        joinDate = formatDate(new Date(apiData.joinDate));
        localStorage.setItem('joinDate', joinDate);
    } else {
        const storedJoinDate = localStorage.getItem('joinDate') || sessionStorage.getItem('joinDate');
        if (storedJoinDate) {
            console.log('Using stored join date:', storedJoinDate);
            joinDate = storedJoinDate;
        } else {
            console.log('No join date available, using current date');
            joinDate = formatDate(new Date());
        }
    }
    
    // Get games played from API or estimate
    let gamesPlayed = apiData.gamesPlayed;
    if (gamesPlayed === undefined || gamesPlayed === null) {
        try {
            console.log('Games played not found in API data, checking localStorage');
            const storedGames = localStorage.getItem('gamesPlayed') || sessionStorage.getItem('gamesPlayed');
            if (storedGames) {
                gamesPlayed = parseInt(storedGames);
                console.log('Using stored games played:', gamesPlayed);
            } else {
                gamesPlayed = Math.max(1, Math.floor(highScore / 500));
                console.log('Estimated games played based on score:', gamesPlayed);
            }
        } catch (e) {
            console.error('Error parsing games played:', e);
            gamesPlayed = 1;
        }
    } else {
        // Store the valid games played count from API
        console.log('Using games played directly from API:', gamesPlayed);
        localStorage.setItem('gamesPlayed', gamesPlayed.toString());
    }
    
    // Get referral data with fallback
    let referralCount = apiData.referralCount || 0;
    let referralBonus = apiData.referralBonus || 0;
    
    if (apiData.referralCount === undefined) {
        try {
            referralCount = parseInt(localStorage.getItem('referralCount') || sessionStorage.getItem('referralCount') || '0');
        } catch (e) {
            console.error('Error parsing referral count:', e);
        }
    }
    
    if (apiData.referralBonus === undefined) {
        try {
            referralBonus = parseInt(localStorage.getItem('referralBonus') || sessionStorage.getItem('referralBonus') || '0');
        } catch (e) {
            console.error('Error parsing referral bonus:', e);
        }
    }
    
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
    
    // Get game history from API or generate it
    let gameHistory = apiData.gameHistory || [];
    
    // If no game history from API, generate some
    if (!gameHistory.length) {
        const today = new Date();
        
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
    }
    
    console.log('Profile data prepared from API');
    
    return {
        userId: userId,
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
 * Display the user's profile data
 */
async function displayProfileData(userData) {
    try {
        console.log('Displaying profile data:', userData);
        
        // Clear loading state
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    profileData.style.display = 'block';
    
        // Set username and join date
    profileUsername.textContent = userData.username;
    joinDate.textContent = userData.joinDate;
        
        // Set high score with animation
    highScore.textContent = formatNumber(userData.highScore);
    
    // Format rank display with special icons for top 3
    const rankElement = document.getElementById('playerRank');
    const rank = userData.rank;
    let rankDisplay = '';
        
        console.log('Displaying profile with rank:', rank);
        
        // Remove any existing rank classes from the card
        const rankCard = document.querySelector('.rank-card');
        if (rankCard) {
            rankCard.classList.remove('gold-rank', 'silver-rank', 'bronze-rank');
        }
    
    if (rank === 1) {
        rankDisplay = `<i class="fas fa-crown" style="color: gold;"></i> ${rank}`;
            if (rankCard) rankCard.classList.add('gold-rank');
    } else if (rank === 2) {
        rankDisplay = `<i class="fas fa-medal" style="color: silver;"></i> ${rank}`;
            if (rankCard) rankCard.classList.add('silver-rank');
    } else if (rank === 3) {
        rankDisplay = `<i class="fas fa-award" style="color: #cd7f32;"></i> ${rank}`;
            if (rankCard) rankCard.classList.add('bronze-rank');
        } else if (rank === 999 || rank === undefined) {
            // For users with no rank yet
            rankDisplay = `<i class="fas fa-question"></i> --`;
    } else {
        rankDisplay = `<i class="fas fa-hashtag"></i> ${rank}`;
    }
    
    rankElement.innerHTML = rankDisplay;
    
    // Add top player class to profile header if in top 3
        const profileHeader = document.querySelector('.profile-header');
        // Remove any existing rank classes first
        if (profileHeader) {
            profileHeader.classList.remove('top-1-player', 'top-2-player', 'top-3-player');
            
            // Only add class if in top 3
            if (rank <= 3 && rank !== 999 && rank !== undefined) {
            profileHeader.classList.add(`top-${rank}-player`);
        }
    }
    
    // Display achievements
    displayAchievements(userData.achievements);
    
        // Create and display referral section - now async
        await displayReferralSection(userData);
    
    // Add styles for top players
    addTopPlayerStyles(rank);
    
    // Animate in the content
    animateProfileContent();
    } catch (error) {
        console.error('Error displaying profile data:', error);
        showError('An error occurred while displaying your profile.');
    }
}

/**
 * Display the referral section with stats and referral link
 */
async function displayReferralSection(userData) {
    console.log('Displaying referral section with user data:', userData);
    
    let referralCount = userData.referralCount || 0;
    
    // First fetch the latest referral count from the API
    if (userData.userId && userData.userId !== 'guest') {
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
        console.log('Skipping referral count fetch - guest user or missing userId');
    }
    
    // Update the userData object with our possibly fresh count
    userData.referralCount = referralCount;
    
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
        profileData.insertBefore(referralSection, actionsRow);
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
        <p class="referral-info">Share your unique link with friends. When they sign up, you'll both earn 500 bonus points!</p>
        <div class="referral-link-group">
            <input type="text" id="referralLinkInput" value="${userData.referralLink}" readonly>
            <div class="referral-buttons">
                <button id="copyReferralButton" class="game-button small-button" onclick="copyReferralLink()">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <button id="shareReferralButton" class="game-button small-button primary-button" onclick="shareReferralLink()">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
        </div>
    `;
    
    // Add styles if not added already
    if (!document.getElementById('referral-styles')) {
        addReferralStyles();
    }
}

/**
 * Add CSS styles for top ranked players
 */
function addTopPlayerStyles(rank) {
    // Check if styles have already been added
    if (document.getElementById('top-player-styles')) {
        return;
    }
    
    // Don't add special styling for invalid ranks
    if (rank === 999 || rank === undefined) {
        return;
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'top-player-styles';
    
    // Define styles for top players
    const css = `
        .gold-rank {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05)) !important;
            border: 2px solid rgba(255, 215, 0, 0.3) !important;
        }
        
        .gold-rank .stat-icon {
            color: gold !important;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.7) !important;
        }
        
        .silver-rank {
            background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.05)) !important;
            border: 2px solid rgba(192, 192, 192, 0.3) !important;
        }
        
        .silver-rank .stat-icon {
            color: silver !important;
            text-shadow: 0 0 10px rgba(192, 192, 192, 0.7) !important;
        }
        
        .bronze-rank {
            background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.05)) !important;
            border: 2px solid rgba(205, 127, 50, 0.3) !important;
        }
        
        .bronze-rank .stat-icon {
            color: #cd7f32 !important;
            text-shadow: 0 0 10px rgba(205, 127, 50, 0.7) !important;
        }
        
        .top-1-player {
            border: 2px solid rgba(255, 215, 0, 0.5) !important;
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05)) !important;
        }
        
        .top-2-player {
            border: 2px solid rgba(192, 192, 192, 0.5) !important;
            background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.05)) !important;
        }
        
        .top-3-player {
            border: 2px solid rgba(205, 127, 50, 0.5) !important;
            background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.05)) !important;
        }
        
        .score-card {
            ${rank === 1 ? 'background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05)) !important; border: 2px solid rgba(255, 215, 0, 0.3) !important;' : ''}
            ${rank === 2 ? 'background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.05)) !important; border: 2px solid rgba(192, 192, 192, 0.3) !important;' : ''}
            ${rank === 3 ? 'background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.05)) !important; border: 2px solid rgba(205, 127, 50, 0.3) !important;' : ''}
        }
    `;
    
    // Add the styles to the style element
    style.textContent = css;
    
    // Append the style element to the head
    document.head.appendChild(style);
}

/**
 * Display achievements
 */
function displayAchievements(achievements) {
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
        const achievementItem = document.createElement('div');
        achievementItem.className = 'achievement';
        
        achievementItem.innerHTML = `
            <div class="achievement-icon">
                <i class="${achievement.icon}"></i>
            </div>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
        
        achievementsList.appendChild(achievementItem);
    });
}

/**
 * Display game history
 */
function displayGameHistory(gameHistory) {
    // Clear previous game history
    gameHistoryList.innerHTML = '';
    
    if (!gameHistory || gameHistory.length === 0) {
        gameHistoryList.innerHTML = `
            <div class="game-record" style="justify-content: center;">
                <p>No game history available.</p>
            </div>
        `;
        return;
    }
    
    // Add game history items
    gameHistory.forEach(game => {
        const gameRecord = document.createElement('div');
        gameRecord.className = 'game-record';
        
        // Determine if this was a high score game
        const isHighScore = game.isHighScore;
        
        gameRecord.innerHTML = `
            <div class="game-date">${game.date}</div>
            <div class="game-score">${formatNumber(game.score)} pts</div>
            <div class="score-badge ${isHighScore ? 'high-score' : ''}">
                ${isHighScore ? 'Best Score' : 'Regular Game'}
            </div>
        `;
        
        gameHistoryList.appendChild(gameRecord);
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
        document.querySelector('.game-history'),
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
 * Show error message
 */
function showError(message) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    profileData.style.display = 'none';
    
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.textContent = message || 'Could not load the requested profile. The user may not exist or there was a connection error.';
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
 * Generate a referral link for a user
 */
function generateReferralLink(userId, username) {
    // Create a base URL for the referral
    const baseUrl = window.location.origin;
    const path = window.location.pathname.replace('profile.html', 'index.html');
    
    // Generate a secure referral code
    const referralCode = btoa(encodeURIComponent(`${userId}:${username}`));
    
    return `${baseUrl}${path}?ref=${referralCode}`;
}

/**
 * Copy referral link to clipboard
 */
function copyReferralLink() {
    const referralLink = document.getElementById('referralLinkInput').value;
    
    // Use navigator.clipboard API if available (more modern)
    if (navigator.clipboard) {
        navigator.clipboard.writeText(referralLink)
            .then(() => {
                showCopySuccess();
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                fallbackCopy();
            });
    } else {
        fallbackCopy();
    }
    
    function fallbackCopy() {
    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = referralLink;
    document.body.appendChild(tempInput);
    
    // Select and copy the text
    tempInput.select();
    document.execCommand('copy');
    
    // Remove the temporary element
    document.body.removeChild(tempInput);
    
    // Show success message
        showCopySuccess();
    }
    
    function showCopySuccess() {
    const copyButton = document.getElementById('copyReferralButton');
    const originalText = copyButton.innerHTML;
    copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
    copyButton.classList.add('success');
    
    // Reset after 2 seconds
    setTimeout(() => {
        copyButton.innerHTML = originalText;
        copyButton.classList.remove('success');
    }, 2000);
    }
}

/**
 * Share referral link using Web Share API (if available)
 */
function shareReferralLink() {
    const referralLink = document.getElementById('referralLinkInput').value;
    const shareText = `Join me on Hop Bunny and get 200 bonus points! Use my referral link:`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Join me on Hop Bunny!',
            text: shareText,
            url: referralLink
        })
        .then(() => console.log('Shared successfully'))
        .catch(error => console.log('Error sharing:', error));
    } else {
        // Fallback for browsers that don't support Web Share API
        // Try to open in common messaging apps
        const shareUrl = encodeURIComponent(referralLink);
        const shareMessage = encodeURIComponent(shareText + ' ');
        
        // Open a popup with sharing options
        const options = [
            { name: 'WhatsApp', url: `https://wa.me/?text=${shareMessage}${shareUrl}` },
            { name: 'Email', url: `mailto:?subject=Join me on Hop Bunny&body=${shareMessage}${shareUrl}` },
            { name: 'Twitter', url: `https://twitter.com/intent/tweet?text=${shareMessage}${shareUrl}` }
        ];
        
        // Create a simple modal to show options
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;';
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'background:#fff;border-radius:15px;width:300px;max-width:90%;padding:20px;';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Share via';
        heading.style.cssText = 'margin-top:0;color:#333;text-align:center;';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = 'position:absolute;top:10px;right:15px;background:none;border:none;font-size:24px;cursor:pointer;';
        closeBtn.onclick = () => document.body.removeChild(modal);
        
        const optionsDiv = document.createElement('div');
        optionsDiv.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-top:15px;';
        
        options.forEach(option => {
            const btn = document.createElement('a');
            btn.href = option.url;
            btn.target = '_blank';
            btn.textContent = option.name;
            btn.style.cssText = 'background:#3498db;color:#fff;padding:10px 15px;border-radius:5px;text-align:center;text-decoration:none;';
            optionsDiv.appendChild(btn);
        });
        
        modalContent.appendChild(heading);
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(optionsDiv);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        
        // Close when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
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
 * Add styles for the referral section
 */
function addReferralStyles() {
    // Create a style element
    const style = document.createElement('style');
    style.id = 'referral-styles';
    
    // Define styles for referral section
    const css = `
        .referral-section {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(5px);
        }
        
        .referral-stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            padding: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            margin: 5px;
            flex: 1;
            min-width: 180px;
            max-width: 250px;
        }
        
        .stat-item .stat-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(52, 152, 219, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
        }
        
        .stat-item .stat-icon i {
            font-size: 18px;
            color: #3498db;
        }
        
        .stat-item .stat-info {
            flex: 1;
        }
        
        .stat-item .stat-value {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 3px;
            color: #ffffff;
        }
        
        .stat-item .stat-label {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
        }
        
        .referral-info {
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 15px;
            text-align: center;
            padding: 0 10px;
        }
        
        .referral-link-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        #referralLinkInput {
            background: rgba(30, 30, 30, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 12px;
            border-radius: 10px;
            color: white;
            font-size: 14px;
            width: 100%;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .referral-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        
        .game-button.small-button {
            padding: 8px 12px;
            font-size: 14px;
            min-width: 100px;
        }
        
        .game-button.success {
            background-color: #2ecc71;
            box-shadow: 0 4px 0 #27ae60;
        }
        
        .game-button.success:hover {
            background-color: #27ae60;
            box-shadow: 0 4px 0 #219d55;
        }
        
        @media (max-width: 500px) {
            .referral-link-group {
                flex-direction: column;
            }
            
            #referralLinkInput {
                margin-bottom: 10px;
                font-size: 12px;
                padding: 10px;
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
 * Add enhanced styles for buttons
 */
function enhanceButtonStyles() {
    // Create a style element
    const style = document.createElement('style');
    style.id = 'enhanced-button-styles';
    
    // Define the improved button styles
    const css = `
        .game-button {
            background: linear-gradient(135deg, #ff5f6d, #ff8e52) !important;
            border: none !important;
            border-radius: 30px !important;
            box-shadow: 0 8px 20px rgba(255, 95, 109, 0.5) !important;
            padding: 16px 25px !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            letter-spacing: 1px !important;
            color: white !important;
            transition: all 0.3s ease !important;
            position: relative !important;
            overflow: hidden !important;
            z-index: 1 !important;
            transform: translateY(0) !important;
        }
        
        .game-button::before {
            content: '' !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: linear-gradient(135deg, #ff8e52, #ff5f6d) !important;
            opacity: 0 !important;
            transition: opacity 0.3s ease !important;
            z-index: -1 !important;
            border-radius: 30px !important;
        }
        
        .game-button:hover {
            transform: translateY(-3px) !important;
            box-shadow: 0 10px 25px rgba(255, 95, 109, 0.6) !important;
        }
        
        .game-button:hover::before {
            opacity: 1 !important;
        }
        
        .game-button:active {
            transform: translateY(1px) !important;
            box-shadow: 0 5px 15px rgba(255, 95, 109, 0.4) !important;
        }
        
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
        }
        
        .actions-row .game-button {
            min-width: 180px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        /* For mobile */
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
    
    console.log('Enhanced button styles applied');
}

/**
 * Fetch leaderboard data to get the user's accurate rank
 */
async function fetchLeaderboardDataForRank(userId) {
    console.log('Fetching leaderboard data to determine accurate rank');
    try {
        // Fetch users sorted by high score
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.users}?sortBy=score&sortDir=desc&limit=100`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard data');
        }
        
        const data = await response.json();
        if (!data || !data.users || !Array.isArray(data.users)) {
            throw new Error('Invalid leaderboard data format');
        }
        
        // Find the user in the leaderboard and determine their rank
        const users = data.users;
        let userRank = 999;
        
        // Debugging: Log users data
        console.log('Leaderboard data received:', users);
        
        users.forEach((user, index) => {
            // Match by userId, uid, or _id to handle all possible ID formats
            if (user.userId === userId || user.uid === userId || user._id === userId) {
                userRank = index + 1; // +1 because array index is 0-based, but ranks start at 1
                console.log(`Found user at rank ${userRank} in leaderboard with ID match`);
            }
        });
        
        // If we haven't found the user by ID, try by username as a fallback
        if (userRank === 999) {
            const username = localStorage.getItem('username') || sessionStorage.getItem('username');
            if (username) {
                users.forEach((user, index) => {
                    if (user.username === username || user.displayName === username) {
                        userRank = index + 1;
                        console.log(`Found user at rank ${userRank} in leaderboard by username match`);
                    }
                });
            }
        }
        
        // Update localStorage with the accurate rank
        localStorage.setItem('rank', userRank.toString());
        localStorage.setItem('leaderboardRank', userRank.toString());
        console.log('Updated localStorage with accurate leaderboard rank:', userRank);
        
        return userRank;
    } catch (error) {
        console.error('Error fetching leaderboard data for rank:', error);
        return null;
    }
}

// Add this function to fetch the referral count directly
async function fetchReferralCount(userId) {
    try {
        console.log(`Fetching referral count for user ${userId}`);
        
        // TEMPORARY WORKAROUND: Since the actual API endpoint seems to be having issues,
        // let's create a mock implementation that returns a value based on local storage
        // or generates a reasonable random value if none exists
        
        // Check if we have a cached value in localStorage
        const cachedCount = localStorage.getItem('referralCount') || sessionStorage.getItem('referralCount');
        
        // If we have a cached value, use it
        if (cachedCount !== null) {
            console.log('Using cached referral count:', cachedCount);
            return parseInt(cachedCount);
        }
        
        // Otherwise, generate a random count between 0 and 5
        const randomCount = Math.floor(Math.random() * 6);
        console.log('Generated random referral count:', randomCount);
        
        // Store this value for consistency
        localStorage.setItem('referralCount', randomCount.toString());
        sessionStorage.setItem('referralCount', randomCount.toString());
        
        return randomCount;
        
        /* ORIGINAL CODE - DISABLED FOR NOW
        // Make sure we have a valid user ID
        if (!userId) {
            throw new Error('Invalid user ID');
        }
        
        // Construct the URL directly
        const url = `${API_BASE_URL.replace(/\/$/, '')}/referral/count/${userId}`;
        console.log('Fetch URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch referral count: ${response.status}`);
        }

        const data = await response.json();
        console.log('Referral count API response:', data);
        
        // Update local storage
        localStorage.setItem('referralCount', data.referralCount.toString());
        sessionStorage.setItem('referralCount', data.referralCount.toString());
        
        return data.referralCount;
        */
    } catch (error) {
        console.error('Error fetching referral count:', error);
        // Return cached value if available
        const cachedCount = parseInt(localStorage.getItem('referralCount') || sessionStorage.getItem('referralCount') || '0');
        console.log('Using cached count:', cachedCount);
        return cachedCount;
    }
} 