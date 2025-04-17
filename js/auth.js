// Authentication functionality with backend integration

import config from './config/appwrite.js';

// Use the global Appwrite object instead of importing
const client = new Appwrite.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authScreen = document.getElementById('authScreen');
    const startScreen = document.getElementById('startScreen');
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');

    // Form inputs
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const registerUsername = document.getElementById('registerUsername');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const rememberMe = document.getElementById('rememberMe');

    // Check if we're in development mode (running locally)
    const isDevelopment = window.location.hostname === "127.0.0.1" || 
                           window.location.hostname === "localhost";
    
    // API URLs - Using the correct backend URL from config
    const API_BASE_URL = config.apiEndpoint;

    // Check for referral code in URL
    checkReferralCode();
    
    // Function to check for referral code in the URL
    async function checkReferralCode() {
        try {
            console.log('🔍 Checking for referral code in URL');
            
            // Check for referral in URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const refCode = urlParams.get('ref');
            
            // Log all URL parameters for debugging
            console.log('📝 URL parameters:', {
                url: window.location.href,
                search: window.location.search,
                allParams: Object.fromEntries(urlParams.entries())
            });
            
            if (refCode) {
                console.log('🎯 Referral code detected:', refCode);
                
                // Decode the referral code if it's encoded
                const decodedRefCode = decodeURIComponent(refCode);
                console.log('🔄 Decoded referral code:', decodedRefCode);
                
                // Store referral code in localStorage to use after registration
                localStorage.setItem('pendingReferral', decodedRefCode);
                // Also save in sessionStorage for redundancy
                sessionStorage.setItem('pendingReferral', decodedRefCode);
                
                console.log('💾 Stored referral codes:', {
                    localStorage: localStorage.getItem('pendingReferral'),
                    sessionStorage: sessionStorage.getItem('pendingReferral')
                });
                
                // Try to get referrer's name from Appwrite
                try {
                    console.log('🔍 Fetching referrer document for ID:', decodedRefCode);
                    const referrerDoc = await databases.getDocument(
                        config.databaseId,
                        config.usersCollectionId,
                        decodedRefCode
                    );
                    
                    console.log('✅ Referrer found:', referrerDoc);
                    
                    // Get referrer's username
                    const referrerName = referrerDoc.displayName || referrerDoc.username || 'a friend';
                    
                    // Show flash notification
                    showReferralWelcomeNotification(referrerName);
                    
                    // Auto-switch to register tab since they came from a referral link
                    registerTab.click();
                    
                } catch (error) {
                    console.error('❌ Error fetching referrer details:', error);
                    // Still show a generic notification if we couldn't fetch the referrer
                    showReferralWelcomeNotification('a friend');
                    registerTab.click();
                }
            } else {
                console.log('⚠️ No referral code found in URL');
            }
        } catch (error) {
            console.error('❌ Error processing referral code:', error);
        }
    }
    
    // Function to show welcome message for referred users
    function showReferralWelcomeNotification(referrerName) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'referral-welcome-notification';
        
        // Set content
        notification.innerHTML = `
            <div class="notification-icon"><i class="fas fa-gift"></i></div>
            <div class="notification-content">
                <div class="notification-title">You've been referred!</div>
                <div class="notification-message">
                    <p>You were referred by <strong>${referrerName}</strong>.</p>
                    <p>Sign up to get <strong>200 bonus points</strong>!</p>
                </div>
            </div>
            <div class="notification-close"><i class="fas fa-times"></i></div>
        `;
        
        // Add styles if they don't exist yet
        if (!document.getElementById('referral-welcome-styles')) {
            const style = document.createElement('style');
            style.id = 'referral-welcome-styles';
            style.textContent = `
                .referral-welcome-notification {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                    border-radius: 10px;
                    padding: 15px;
                    display: flex;
                    align-items: center;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    z-index: 9999;
                    animation: slideDown 0.5s ease forwards;
                }
                
                .referral-welcome-notification .notification-icon {
                    font-size: 24px;
                    margin-right: 15px;
                    background: rgba(255, 255, 255, 0.2);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .referral-welcome-notification .notification-content {
                    flex: 1;
                }
                
                .referral-welcome-notification .notification-title {
                    font-weight: 700;
                    font-size: 18px;
                    margin-bottom: 5px;
                }
                
                .referral-welcome-notification .notification-message {
                    font-size: 14px;
                    opacity: 0.95;
                }
                
                .referral-welcome-notification .notification-message p {
                    margin: 5px 0;
                }
                
                .referral-welcome-notification .notification-close {
                    cursor: pointer;
                    padding: 5px;
                    margin-left: 10px;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }
                
                .referral-welcome-notification .notification-close:hover {
                    opacity: 1;
                }
                
                @keyframes slideDown {
                    from {
                        transform: translate(-50%, -100%);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideUp {
                    from {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                    to {
                        transform: translate(-50%, -100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to body
        document.body.appendChild(notification);
        
        // Add close button functionality
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                notification.style.animation = 'slideUp 0.3s ease forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            });
        }
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 10000);
    }

    // Cache for user data with 5-minute expiration
    const userDataCache = {
        data: {},
        timestamps: {},
        expirationTime: 5 * 60 * 1000, // 5 minutes in milliseconds

        get(userId) {
            const timestamp = this.timestamps[userId];
            if (timestamp && Date.now() - timestamp < this.expirationTime) {
                return this.data[userId];
            }
            return null;
        },

        set(userId, data) {
            this.data[userId] = data;
            this.timestamps[userId] = Date.now();
        },

        clear(userId) {
            delete this.data[userId];
            delete this.timestamps[userId];
        },
        
        // Add a function to force refresh of user data
        forceRefresh(userId) {
            this.clear(userId);
            return fetchUserDataFromDB(userId);
        }
    };

    // Make userDataCache available globally for other scripts
    window.userDataCache = userDataCache;

    // Tab switching functionality
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        // Hide error messages when switching tabs
        loginError.style.display = 'none';
        registerError.style.display = 'none';
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        // Hide error messages when switching tabs
        loginError.style.display = 'none';
        registerError.style.display = 'none';
    });

    // Check if user is already logged in - do this check only once
    const isAlreadyAuthenticated = checkExistingAuth();
    if (isAlreadyAuthenticated) {
        // If already authenticated, redirect immediately and stop script execution
        window.location.href = '/';
        return; // Stop further execution
    }

    // Form submission
    loginButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Hide any previous error message
        loginError.style.display = 'none';
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            // First, try to delete any existing sessions
            try {
                await account.deleteSession('current');
            } catch (error) {
                // Ignore error if no session exists
                console.log('No existing session to delete');
            }

            // Create new email session
            await account.createEmailSession(email, password);
            
            // Get account info
            const user = await account.get();
            
            // Store user info in session storage
            sessionStorage.setItem('userId', user.$id);
            sessionStorage.setItem('userEmail', user.email);
            sessionStorage.setItem('username', user.name || email.split('@')[0]);
            
            // Also store in localStorage for persistence
            localStorage.setItem('userId', user.$id);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('username', user.name || email.split('@')[0]);
            
            // Set initial game stats
            sessionStorage.setItem('score', '0');
            sessionStorage.setItem('highScore', '0');
            sessionStorage.setItem('gamesPlayed', '0');

            // Ensure user document exists in database
            try {
                // First check if user document exists
                const userDocResponse = await fetch(`${API_BASE_URL}/user/${user.$id}`);
                
                if (!userDocResponse.ok && userDocResponse.status === 404) {
                    console.log('User document not found in database, creating...');
                    // Create user document if it doesn't exist
                    await createUserDocument(user);
                } else if (userDocResponse.ok) {
                    // If the user exists, get their data from the database
                    const userData = await userDocResponse.json();
                    // Update username in storage to use the one from database
                    if (userData.username || userData.displayName) {
                        const displayName = userData.displayName || userData.username;
                        sessionStorage.setItem('username', displayName);
                        localStorage.setItem('username', displayName);
                        console.log('Username updated from database:', displayName);
                    }
                }
            } catch (dbError) {
                console.error('Error checking/creating user document:', dbError);
                // Continue login flow even if document creation fails
            }

            // Check if we need to show referral bonus notification
            if (localStorage.getItem('showReferralBonus') === 'true') {
                const referrerBonus = localStorage.getItem('referrerBonus') || '500';
                const newUserBonus = localStorage.getItem('newUserBonus') || '200';
                
                // Show the notification
                showReferralBonusNotification(referrerBonus, newUserBonus);
                
                // Clear the flags
                localStorage.removeItem('showReferralBonus');
                localStorage.removeItem('referrerBonus');
                localStorage.removeItem('newUserBonus');
            }

            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <div class="success-content">
                    <i class="fas fa-check-circle"></i>
                    <p>Login successful! Starting game...</p>
                </div>
            `;
            document.querySelector('#loginForm').prepend(successMessage);
            
            // Set login redirect flag to prevent flashing
            localStorage.setItem('loginRedirect', 'true');
            
            // Clear any existing game state
            localStorage.removeItem('gameState');
            localStorage.removeItem('currentScore');
            
            // Redirect to game page after a short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = error.message;
            if (error.message.includes('Invalid credentials')) {
                errorMessage = 'Invalid email or password';
            }
            showErrorWithAutoHide(loginError, errorMessage);
        }
    });

    registerButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Hide any previous error message
        registerError.style.display = 'none';
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            showErrorWithAutoHide(registerError, 'Passwords do not match');
            return;
        }

        try {
            // Create user account in Appwrite
            const user = await account.create(
                Appwrite.ID.unique(),
                email,
                password,
                username
            );
            
            console.log('Appwrite user created:', user);
            
            // Create user document in database immediately after registration
            try {
                await createUserDocument(user);
                console.log('User document created in database');
            } catch (dbError) {
                console.error('Error creating user document:', dbError);
                // Continue registration flow even if document creation fails
            }

            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <div class="success-content">
                    <i class="fas fa-check-circle"></i>
                    <p>Registration successful! Redirecting to login...</p>
                </div>
            `;
            document.querySelector('#registerForm').prepend(successMessage);

            // Add success message styles if not already added
            if (!document.getElementById('success-message-styles')) {
                const style = document.createElement('style');
                style.id = 'success-message-styles';
                style.textContent = `
                    .success-message {
                        background: linear-gradient(135deg, #28a745, #20c997);
                        color: white;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                        text-align: center;
                        animation: slideDown 0.5s ease-out;
                    }
                    .success-content {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    }
                    .success-message i {
                        font-size: 1.2em;
                    }
                    @keyframes slideDown {
                        from {
                            transform: translateY(-20px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            // Clear the form
            document.getElementById('registerUsername').value = '';
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('confirmPassword').value = '';

            // Switch to login tab after a delay
            setTimeout(() => {
                document.getElementById('loginTab').click();
                // Pre-fill the login email field
                document.getElementById('loginEmail').value = email;
            }, 2000);
            
        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = error.message;
            if (error.message.includes('password')) {
                errorMessage = 'Password must be at least 8 characters long';
            }
            showErrorWithAutoHide(registerError, errorMessage);
        }
    });
    
    // Function to create user document in the database
    async function createUserDocument(user) {
        try {
            // Check for referral code
            const pendingReferral = localStorage.getItem('pendingReferral') || sessionStorage.getItem('pendingReferral');
            let referrerId = null;
            let initialScore = 0;
            
            console.log('Checking for referral in storage:', { 
                pendingReferral, 
                fromLocalStorage: localStorage.getItem('pendingReferral'),
                fromSessionStorage: sessionStorage.getItem('pendingReferral')
            });
            
            // Process referral if exists
            if (pendingReferral) {
                referrerId = pendingReferral;
                initialScore = 200; // Bonus points for referred user
                console.log('IS REFERRAL REGISTRATION: YES');
                console.log('Detected referral for referrer ID:', referrerId);
            }

            // First try with Appwrite SDK
            await databases.createDocument(
                config.databaseId,
                config.usersCollectionId,
                user.$id, // Use the Auth user ID as the document ID
                {
                    email: user.email,
                    username: user.name || user.email.split('@')[0],
                    displayName: user.name || user.email.split('@')[0],
                    score: initialScore,
                    highScore: initialScore,
                    lastGameScore: 0,
                    gamesPlayed: 0,
                    rank: 999,
                    referralCount: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            );
            console.log('User document created with SDK');
            
            // Process referral rewards if there's a referral
            if (referrerId) {
                try {
                    console.log('📣 Processing referral for new user');
                    console.log('👉 Referrer ID:', referrerId);
                    console.log('👉 New User ID:', user.$id);
                    
                    // Try the direct API approach first (similar to update-score endpoint)
                    try {
                        console.log('🔄 Using update-score API for referral processing...');
                        
                        const apiResult = await fetch(`${API_BASE_URL}/update-score`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                userId: referrerId,
                                score: 500, // 500 point bonus for referral
                                isReferral: true,
                                incrementReferralCount: true,
                                uniqueRequestId: `${user.$id}_${new Date().getTime()}`
                            })
                        });
                        
                        if (apiResult.ok) {
                            const response = await apiResult.json();
                            console.log('✅ API referral processing successful:', response);
                        } else {
                            console.log('⚠️ API referral processing failed, falling back to direct update');
                            // Fallback to direct database update
                            await processFallbackReferralUpdate(referrerId, user.$id, user.name || user.email.split('@')[0]);
                        }
                    } catch (apiError) {
                        console.error('❌ API referral processing error:', apiError.message);
                        // Fallback to direct database update
                        await processFallbackReferralUpdate(referrerId, user.$id, user.name || user.email.split('@')[0]);
                    }
                    
                    // Store referral info to show notification after login
                    localStorage.setItem('showReferralBonus', 'true');
                    localStorage.setItem('referrerBonus', '500');
                    localStorage.setItem('newUserBonus', '200');
                    
                    // Clear the referral data
                    localStorage.removeItem('pendingReferral');
                    sessionStorage.removeItem('pendingReferral');
                    
                } catch (referralError) {
                    console.error('❌ Error in referral process:', referralError.message);
                }
            }
        } catch (sdkError) {
            console.error('Error creating user with SDK:', sdkError);
            
            // Fallback to API endpoint if SDK fails
            try {
                const response = await fetch(`${API_BASE_URL}/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: user.$id,
                        email: user.email,
                        username: user.name || user.email.split('@')[0],
                        displayName: user.name || user.email.split('@')[0],
                        score: 0,
                        highScore: 0,
                        gamesPlayed: 0,
                        createdAt: new Date().toISOString()
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${await response.text()}`);
                }
                
                console.log('User document created with API');
            } catch (apiError) {
                console.error('API error creating user:', apiError);
                throw apiError; // Re-throw to be handled by caller
            }
        }
    }

    // Add this function for referral fallback
    async function processFallbackReferralUpdate(referrerId, newUserId, newUsername) {
        try {
            // First get the referrer's document
            console.log(`📄 Getting referrer document: ${referrerId}`);
            
            // Get the current document
            const referrerDoc = await databases.getDocument(
                config.databaseId,
                config.usersCollectionId,
                referrerId
            );
            
            console.log(`✅ Found referrer document for: ${referrerDoc.username || referrerId}`);
            
            // Calculate current and new values
            const currentCount = typeof referrerDoc.referralCount === 'number' 
                ? referrerDoc.referralCount 
                : parseInt(referrerDoc.referralCount || '0');
            
            const newCount = currentCount + 1;
            
            const currentScore = typeof referrerDoc.score === 'number'
                ? referrerDoc.score
                : parseInt(referrerDoc.score || '0');
                
            const newScore = currentScore + 500; // 500 point bonus for referral
            
            console.log(`📊 Updating referral count: ${currentCount} → ${newCount}`);
            console.log(`📊 Updating score: ${currentScore} → ${newScore}`);
            
            // Update the document with both changes
            const updateResult = await databases.updateDocument(
                config.databaseId,
                config.usersCollectionId,
                referrerId,
                {
                    referralCount: newCount,
                    score: newScore
                }
            );
            
            console.log('✅ Successfully updated referrer document!');
            console.log(`🏆 New referral count: ${updateResult.referralCount}`);
            
            // Create a record in the referrals collection if it exists
            if (config.referralsCollectionId) {
                try {
                    console.log(`📝 Creating record in referrals collection: ${config.referralsCollectionId}`);
                    
                    await databases.createDocument(
                        config.databaseId,
                        config.referralsCollectionId,
                        'unique()',
                        {
                            referrerId: referrerId,
                            referredId: newUserId,
                            referredUserId: newUserId,
                            referredUsername: newUsername,
                            status: 'completed',
                            createdAt: new Date().toISOString()
                        }
                    );
                    
                    console.log('✅ Referral record created successfully');
                } catch (recordError) {
                    console.error('⚠️ Could not create referral record:', recordError.message);
                }
            }
        } catch (error) {
            console.error('❌ Fallback referral update error:', error.message);

            // Try the process-signup-referral API as a final fallback
            try {
                console.log('🔄 Trying process-signup-referral API as final fallback...');
                
                const apiResult = await fetch(`${config.apiEndpoint}/referral/process-signup-referral`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        referrerId: referrerId,
                        newUserId: newUserId,
                        newUsername: newUsername
                    })
                });
                
                if (apiResult.ok) {
                    console.log('✅ Final API fallback successful');
                } else {
                    console.log('⚠️ Final API fallback failed');
                }
            } catch (apiError) {
                console.error('❌ Final API fallback error:', apiError.message);
            }
        }
    }

    // Add password input helper text
    const passwordHelper = document.createElement('div');
    passwordHelper.className = 'helper-text';
    passwordHelper.textContent = 'Password must be at least 8 characters long';
    passwordHelper.style.cssText = 'color: #666; font-size: 0.8em; margin-top: 4px;';
    registerPassword.parentNode.appendChild(passwordHelper);

    // Social login buttons functionality
    const socialButtons = document.querySelectorAll('.social-button');
    socialButtons.forEach(button => {
        button.addEventListener('click', () => {
            // For now, we'll just show an alert
            alert('Social login will be implemented in a future update');
        });
    });

    // Check if user is already authenticated
    function checkExistingAuth() {
        const tokenFromStorage = localStorage.getItem('token');
        const tokenFromSession = sessionStorage.getItem('token');
        
        // Don't redirect if we just got redirected from login (prevent flashing)
        const isRedirecting = localStorage.getItem('loginRedirect');
        if (isRedirecting) {
            localStorage.removeItem('loginRedirect');
            return true; // Already authenticated but we'll handle this differently
        }
        
        // If authenticated, fetch the username from the database
        if (tokenFromStorage || tokenFromSession) {
            const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
            if (userId) {
                // Fetch user data from the database
                fetchUserDataFromDB(userId);
            }
            return true;
        }
        
        // Return false if not authenticated
        return false;
    }
    
    // Function to fetch user data from the database
    async function fetchUserDataFromDB(userId) {
        // Check cache first
        const cachedData = userDataCache.get(userId);
        if (cachedData) {
            console.log('Using cached user data');
            return cachedData;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            
            const userData = await response.json();
            
            // Cache the data
            userDataCache.set(userId, userData);
            
            // Update the username in storage with the one from the database
            const username = userData.username || userData.displayName;
            if (username) {
                if (localStorage.getItem('token')) {
                    localStorage.setItem('username', username);
                } else {
                    sessionStorage.setItem('username', username);
                }
                console.log('Username fetched from database:', username);
            }

            return userData;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    }

    // Add a new function for flash notifications above the showSuccess function
    // Flash notification for referral bonuses
    function showReferralBonusNotification(referrerPoints, newUserPoints) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'referral-bonus-notification';
        
        // Set content based on points awarded
        notification.innerHTML = `
            <div class="notification-icon"><i class="fas fa-gift"></i></div>
            <div class="notification-content">
                <div class="notification-title">Referral Bonus!</div>
                <div class="notification-message">
                    <p>You received ${newUserPoints} points for signing up with a referral!</p>
                    <p>Your referrer received ${referrerPoints} points!</p>
                </div>
            </div>
            <div class="notification-close"><i class="fas fa-times"></i></div>
        `;
        
        // Add styles if they don't exist yet
        if (!document.getElementById('referral-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'referral-notification-styles';
            style.textContent = `
                .referral-bonus-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #2ecc71, #27ae60);
                    color: white;
                    border-radius: 10px;
                    padding: 15px;
                    display: flex;
                    align-items: center;
                    max-width: 350px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    z-index: 9999;
                    animation: slideInNotif 0.5s ease forwards;
                }
                
                .referral-bonus-notification.hiding {
                    animation: slideOutNotif 0.3s ease forwards;
                }
                
                .notification-icon {
                    font-size: 24px;
                    margin-right: 15px;
                    background: rgba(255, 255, 255, 0.2);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .notification-content {
                    flex: 1;
                }
                
                .notification-title {
                    font-weight: 700;
                    font-size: 16px;
                    margin-bottom: 5px;
                }
                
                .notification-message {
                    font-size: 14px;
                    opacity: 0.9;
                }
                
                .notification-message p {
                    margin: 5px 0;
                }
                
                .notification-close {
                    cursor: pointer;
                    padding: 5px;
                    margin-left: 10px;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }
                
                .notification-close:hover {
                    opacity: 1;
                }
                
                @keyframes slideInNotif {
                    from {
                        transform: translateX(120%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutNotif {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(120%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to body
        document.body.appendChild(notification);
        
        // Add close button functionality
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                notification.classList.add('hiding');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            });
        }
        
        // Auto-hide after 6 seconds
        setTimeout(() => {
            notification.classList.add('hiding');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 6000);
    }

    // Success message function
    function showSuccess(message) {
        // Create success element
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = message;
        
        // Get the form that's currently visible
        const currentForm = loginForm.classList.contains('hidden') ? registerForm : loginForm;
        
        // Remove any existing messages
        const existingMessage = currentForm.querySelector('.success-message, .error-message');
        if (existingMessage) existingMessage.remove();
        
        // Add the new success message at the top of the form
        currentForm.insertBefore(successElement, currentForm.firstChild);
        
        // Automatically remove after 3 seconds
        setTimeout(() => {
            successElement.remove();
        }, 3000);
    }

    // Error message function
    function showError(message) {
        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        // Get the form that's currently visible
        const currentForm = loginForm.classList.contains('hidden') ? registerForm : loginForm;
        
        // Remove any existing messages
        const existingMessage = currentForm.querySelector('.success-message, .error-message');
        if (existingMessage) existingMessage.remove();
        
        // Add the new error message at the top of the form
        currentForm.insertBefore(errorElement, currentForm.firstChild);
        
        // Automatically remove after 3 seconds
        setTimeout(() => {
            errorElement.remove();
        }, 3000);
    }

    // Validation helper functions
    function isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // Add animation classes to particles
    const particles = document.querySelectorAll('.particle');
    particles.forEach(particle => {
        // Random animation duration between 15-25s
        const duration = 15 + Math.random() * 10;
        // Random delay so they don't all move together
        const delay = Math.random() * 5;
        
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
    });

    // Add the updateUsernameFromDatabase function that can be called from outside
    function updateUsernameFromDatabase() {
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (userId && token) {
            fetch(`${API_BASE_URL}/api/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }
                return response.json();
            })
            .then(userData => {
                const username = userData.username || userData.displayName;
                if (username) {
                    // Update the username in storage
                    if (localStorage.getItem('token')) {
                        localStorage.setItem('username', username);
                    } else {
                        sessionStorage.setItem('username', username);
                    }
                    
                    // Update any UI elements displaying the username
                    const usernameDisplayElements = document.querySelectorAll('.user-display-name');
                    usernameDisplayElements.forEach(element => {
                        element.textContent = username;
                    });
                    
                    console.log('Username updated from database:', username);
                }
            })
            .catch(error => {
                console.error('Error updating username from database:', error);
            });
        }
    }

    // Expose the function to the global scope so it can be called from other scripts
    window.updateUsernameFromDatabase = updateUsernameFromDatabase;
    
    // Add a function to refresh user score data that can be called from any page
    window.refreshUserScore = async function() {
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        if (userId) {
            console.log('Forcing refresh of user data cache');
            try {
                // Clear the cache for this user
                if (window.userDataCache) {
                    const userData = await window.userDataCache.forceRefresh(userId);
                    
                    // Update UI elements that display score if they exist
                    const scoreElements = document.querySelectorAll('#currentUserScore, .user-score-display');
                    if (scoreElements.length > 0) {
                        const score = userData.score || userData.highScore || 0;
                        scoreElements.forEach(element => {
                            // Check if formatNumber function exists
                            if (window.formatNumber) {
                                element.textContent = window.formatNumber(score);
                            } else {
                                element.textContent = score.toString();
                            }
                        });
                    }
                    
                    return userData;
                }
            } catch (error) {
                console.error('Error refreshing user score:', error);
            }
        }
        return null;
    };

    // Add a function to show errors with auto-hide after 5 seconds
    function showErrorWithAutoHide(errorElement, errorMessage) {
        // Set the error message text
        errorElement.textContent = errorMessage;
        // Display the error
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
});

// Export the updateUsernameFromDatabase function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateUsernameFromDatabase: window.updateUsernameFromDatabase,
        refreshUserScore: window.refreshUserScore
    };
} 