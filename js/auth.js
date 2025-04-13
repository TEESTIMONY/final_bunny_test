// Authentication functionality with backend integration

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
    
    // API URLs - Using the new backend URL
    const API_BASE_URL = 'https://new-backend-hop.vercel.app';
    const REGISTER_URL = `${API_BASE_URL}/api/auth/register`;
    const LOGIN_URL = `${API_BASE_URL}/api/auth/login`;

    // Tab switching functionality
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // Check if user is already logged in - do this check only once
    const isAlreadyAuthenticated = checkExistingAuth();
    if (isAlreadyAuthenticated) {
        // If already authenticated, redirect immediately and stop script execution
        window.location.href = 'index.html';
        return; // Stop further execution
    }

    // Form submission
    loginButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!loginEmail.value || !loginPassword.value) {
            showError('Please fill in all fields');
            return;
        }

        if (!isValidEmail(loginEmail.value)) {
            showError('Please enter a valid email');
            return;
        }

        // Call the login API
        login(loginEmail.value, loginPassword.value);
    });

    registerButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!registerUsername.value || !registerEmail.value || 
            !registerPassword.value || !confirmPassword.value) {
            showError('Please fill in all fields');
            return;
        }

        if (!isValidEmail(registerEmail.value)) {
            showError('Please enter a valid email');
            return;
        }

        if (registerPassword.value !== confirmPassword.value) {
            showError('Passwords do not match');
            return;
        }

        if (registerPassword.value.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        // Call the register API
        register(registerUsername.value, registerEmail.value, registerPassword.value);
    });

    // Login function
    async function login(email, password) {
        loginButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Logging in...';
        loginButton.disabled = true;
        
        try {
            if (isDevelopment && false) { // Set to false to always use the real API
                // For development, simulate a successful login
                simulateLogin();
                return;
            }

            const response = await fetch(LOGIN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Extract token and user ID from response
            const token = data.token;
            const userId = data.userId;
            
            // First, save these essential items
            if (rememberMe.checked) {
                localStorage.setItem('token', token);
                localStorage.setItem('userId', userId);
                localStorage.setItem('highScore', data.highScore || '0');
                localStorage.setItem('score', data.score || '0');
                localStorage.setItem('referralCount', data.referralCount || '0');
                localStorage.setItem('referralBonus', data.referralBonus || '0');
            } else {
                sessionStorage.setItem('token', token);
                sessionStorage.setItem('userId', userId);
                sessionStorage.setItem('highScore', data.highScore || '0');
                sessionStorage.setItem('score', data.score || '0');
                sessionStorage.setItem('referralCount', data.referralCount || '0');
                sessionStorage.setItem('referralBonus', data.referralBonus || '0');
            }
            
            // Now fetch the latest user data from the database to ensure we have the correct username
            try {
                const userDataResponse = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (userDataResponse.ok) {
                    const userData = await userDataResponse.json();
                    const username = userData.username || userData.displayName;
                    
                    // Store the username from database
                    if (username) {
                        if (rememberMe.checked) {
                            localStorage.setItem('username', username);
                        } else {
                            sessionStorage.setItem('username', username);
                        }
                        console.log('Username fetched from database after login:', username);
                    }
                } else {
                    // If API call fails, fall back to the username from login response
                    const fallbackUsername = data.username || 
                                             (data.user && data.user.displayName) || 
                                             (data.user && data.user.username) || 
                                             email.split('@')[0];
                                             
                    if (rememberMe.checked) {
                        localStorage.setItem('username', fallbackUsername);
                    } else {
                        sessionStorage.setItem('username', fallbackUsername);
                    }
                    console.warn('Could not fetch username from database, using fallback:', fallbackUsername);
                }
            } catch (fetchError) {
                console.error('Error fetching user data after login:', fetchError);
                // Fall back to username from login response
                const fallbackUsername = data.username || 
                                         (data.user && data.user.displayName) || 
                                         (data.user && data.user.username) || 
                                         email.split('@')[0];
                                         
                if (rememberMe.checked) {
                    localStorage.setItem('username', fallbackUsername);
                } else {
                    sessionStorage.setItem('username', fallbackUsername);
                }
                console.warn('Could not fetch username from database, using fallback:', fallbackUsername);
            }

            // Flag to force a fresh fetch when visiting the profile page
            sessionStorage.setItem('forceProfileRefresh', 'true');

            // Check for new referral bonuses
            const username = rememberMe.checked ? 
                              localStorage.getItem('username') : 
                              sessionStorage.getItem('username');
            
            let welcomeMessage = `Login successful! Welcome, ${username}!`;
            if (data.newReferralBonus) {
                welcomeMessage += ` You've earned ${data.newReferralBonus} bonus points from ${data.newReferrals || 'new'} referrals since your last login!`;
            }

            // Show success message
            showSuccess(welcomeMessage);

            // Redirect to game page with a flag to prevent flashing
            localStorage.setItem('loginRedirect', 'true');
            
            // Use direct redirect without setTimeout to avoid flashing
            window.location.href = 'index.html';
            
        } catch (error) {
            showError(error.message || 'Login failed');
            console.error('Login error:', error);
        } finally {
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> LOGIN';
            loginButton.disabled = false;
        }
    }

    // Register function
    async function register(username, email, password) {
        registerButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Registering...';
        registerButton.disabled = true;
        
        try {
            // Check if this user was referred by someone
            const referrerId = sessionStorage.getItem('referrerId');
            const referrerUsername = sessionStorage.getItem('referrerUsername');
            
            // Create the registration payload
            const registrationData = { 
                username, 
                email, 
                password 
            };
            
            // Add referral data if available
            if (referrerId && referrerUsername) {
                registrationData.referrerId = referrerId;
                registrationData.referrerUsername = referrerUsername;
                console.log(`Including referral data: Referred by ${referrerUsername} (${referrerId})`);
                console.log('Registration payload with referral:', JSON.stringify(registrationData));
            } else if (referrerId) {
                // If we only have referrer ID without username
                registrationData.referrerId = referrerId;
                console.log(`Including referral data with ID only: Referred by ID ${referrerId}`);
                console.log('Registration payload with referral ID only:', JSON.stringify(registrationData));
            }
            
            if (isDevelopment && false) { // Set to false to always use the real API
                // For development, simulate a successful registration
                simulateRegistration(referrerId, referrerUsername);
                return;
            }

            const response = await fetch(REGISTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registrationData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }
            
            // Log the complete response data
            console.log('Registration response from server:', JSON.stringify(data));
            
            // Save the username in session storage for use after login
            sessionStorage.setItem('registeredUsername', username);
            sessionStorage.setItem('userId', data.userId || (data.user && data.user.uid));
            sessionStorage.setItem('username', username);
            
            console.log('Registration successful. Username saved:', username);

            // Flag to track if we've processed the referral
            let referralProcessed = false;

            // If registration was successful and there was a referral, update the referral count
            if (referrerId && !referralProcessed && data.userId) {
                try {
                    referralProcessed = true; // Mark as processed
                    
                    // Store a flag to prevent duplicate referral bonus processing
                    const referralProcessKey = `ref_${data.userId}_${referrerId}`;
                    if (localStorage.getItem(referralProcessKey)) {
                        console.log('Referral bonus already processed. Skipping.', referralProcessKey);
                        return;
                    }
                    
                    // Set flag to indicate this referral has been processed
                    localStorage.setItem(referralProcessKey, 'true');
                    
                    const hasUsername = !!referrerUsername;
                    console.log(`Referral registered: ${username} was referred by ${hasUsername ? referrerUsername : 'ID ' + referrerId}`);
                    
                    // Make the update-score API call to add points to both users
                    const updateScoreUrl = 'https://new-backend-hop.vercel.app/api/update-score';
                    
                    // Add a unique request identifier to prevent duplicate processing
                    const uniqueRequestId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
                    console.log('Using unique request ID to prevent duplicate processing:', uniqueRequestId);
                    
                    // First update the referrer's score
                    fetch(updateScoreUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: referrerId,
                            score: 0,  // 500 points for the referrer
                            isReferral: true,  // Flag to indicate this is a referral bonus
                            incrementReferralCount: true,  // Add this to increment the referral count
                            uniqueRequestId: uniqueRequestId // Add a unique request ID to prevent duplicate processing
                        })
                    })
                    .then(response => response.json())
                    .then(referrerData => {
                        // Check if the request was identified as a duplicate
                        if (referrerData.isDuplicate) {
                            console.warn('Duplicate referral bonus request detected and prevented by server');
                            return Promise.reject(new Error('Duplicate request'));
                        }
                        
                        console.log('Referrer score update successful:', referrerData);
                        console.log('Referrer referralCount before:', (referrerData.previousReferralCount || 0));
                        console.log('Referrer referralCount after:', referrerData.referralCount);
                        
                        // Then update the new user's score using the correct userId
                        const newUserId = sessionStorage.getItem('userId'); // Get the new user's ID from session storage
                        console.log('Updating new user score with ID:', newUserId);
                        
                        // Use a different unique ID for the referred user
                        const referredUniqueId = `${uniqueRequestId}_referred`;
                        
                        return fetch(updateScoreUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                userId: newUserId,
                                score: 0,  // 200 points for the new user
                                isReferral: true,  // Flag to indicate this is a referral bonus
                                uniqueRequestId: referredUniqueId // Add a unique request ID to prevent duplicate processing
                            })
                        });
                    })
                    .then(response => response.json())
                    .then(data => {
                        // Check if the request was identified as a duplicate
                        if (data.isDuplicate) {
                            console.warn('Duplicate referred user bonus request detected and prevented by server');
                            return;
                        }
                        
                        console.log('New user score update successful:', data);
                        // Verify that game stats are not affected
                        if (data.highestSingleGameScore > 0) {
                            console.warn('Warning: highestSingleGameScore should be 0 for referral bonuses');
                            data.highestSingleGameScore = 0;
                        }
                        if (data.gamesPlayed !== (data.previousGamesPlayed || 0)) {
                            console.warn('Warning: gamesPlayed was incremented for a referral bonus');
                            data.gamesPlayed = 0;
                        }
                        
                        // Show the referral bonus notification
                        showReferralBonusNotification(500, 200);
                        
                        // Clear the referral data after successful processing
                        sessionStorage.removeItem('referrerId');
                        sessionStorage.removeItem('referrerUsername');
                    })
                    .catch(error => {
                        if (error.message === 'Duplicate request') {
                            console.log('Skipping duplicate referral bonus processing');
                        } else {
                            console.error('Error updating scores:', error);
                            
                            // Even if there's an error, we should clear the referral data 
                            // to prevent repeated attempts that might eventually succeed
                            sessionStorage.removeItem('referrerId');
                            sessionStorage.removeItem('referrerUsername');
                        }
                    });
                } catch (referralError) {
                    // Log the error but don't interrupt the registration flow
                    console.error('Error with referral:', referralError);
                }
            }

            // Handle referral bonus display if applicable
            let successMessage = data.message || 'Registration successful! You can now log in.';
            if (referrerId && data.referralBonus) {
                successMessage += ` You received a ${data.referralBonus} point bonus from your referral!`;
                
                // Clear the referral data after successful use
                sessionStorage.removeItem('referrerId');
                sessionStorage.removeItem('referrerUsername');
            }

            // Show success message
            showSuccess(successMessage);

            // Clear form fields manually instead of using reset()
            if (registerUsername) registerUsername.value = '';
            if (registerEmail) registerEmail.value = '';
            if (registerPassword) registerPassword.value = '';
            if (confirmPassword) confirmPassword.value = '';
            
            // Switch to login tab after successful registration
            setTimeout(() => {
                loginTab.click();
            }, 1500);
            
        } catch (error) {
            showError(error.message || 'Registration failed');
            console.error('Registration error:', error);
        } finally {
            registerButton.innerHTML = '<i class="fas fa-user-plus"></i> REGISTER';
            registerButton.disabled = false;
        }
    }

    // Simulate login for development
    function simulateLogin() {
        console.log('Development mode: Simulating login success');
        
        // Extract a username from the email
        const username = loginEmail.value.split('@')[0];
        console.log('Development login: Using username', username);
        
        // Store user data for development
        if (rememberMe.checked) {
            localStorage.setItem('token', 'dev-token');
            localStorage.setItem('userId', 'dev-user-123');
            localStorage.setItem('username', username);
            localStorage.setItem('highScore', '0');
        } else {
            sessionStorage.setItem('token', 'dev-token');
            sessionStorage.setItem('userId', 'dev-user-123');
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('highScore', '0');
        }

        setTimeout(() => {
            // Redirect to game page
            window.location.href = 'index.html';
            
            // Reset form
            loginForm.reset();
            
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> LOGIN';
            loginButton.disabled = false;
        }, 1500);
    }

    // Simulate registration for development
    function simulateRegistration(referrerId, referrerUsername) {
        console.log('Development mode: Simulating registration success');
        
        // Use the provided username for consistent display
        const username = registerUsername.value;
        console.log('Development registration: Using username', username);
        
        // Store username in session storage
        sessionStorage.setItem('registeredUsername', username);
        sessionStorage.setItem('userId', 'dev-user-456');
        sessionStorage.setItem('username', username);
        
        let successMessage = 'Registration successful! You can now log in.';
        
        if (referrerId && referrerUsername) {
            successMessage += ` You received a 500 point bonus from ${referrerUsername}'s referral!`;
        }
        
        showSuccess(successMessage);
        
        setTimeout(() => {
            // Switch to login tab
            loginTab.click();
            
            // Prefill the login form with the registration email for convenience
            if (loginEmail) {
                loginEmail.value = registerEmail.value;
            }
            
            // Reset register form
            registerForm.reset();
            
            registerButton.innerHTML = '<i class="fas fa-user-plus"></i> REGISTER';
            registerButton.disabled = false;
        }, 1500);
    }

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
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
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
        } catch (error) {
            console.error('Error fetching user data:', error);
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
});

// Export the updateUsernameFromDatabase function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateUsernameFromDatabase: window.updateUsernameFromDatabase
    };
} 