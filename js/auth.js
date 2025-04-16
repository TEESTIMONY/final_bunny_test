// Authentication functionality with backend integration

import config from './config/appwrite.js';

// Use the global Appwrite object instead of importing
const client = new Appwrite.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

const account = new Appwrite.Account(client);

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
    
    // API URLs - Using the new backend URL
    const API_BASE_URL = 'https://final-again-backend.vercel.app';
    const REGISTER_URL = `${API_BASE_URL}/api/auth/register`;
    const LOGIN_URL = `${API_BASE_URL}/api/auth/login`;

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
        }
    };

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
    loginButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
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
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <div class="success-content">
                    <i class="fas fa-check-circle"></i>
                    <p>Login successful! Redirecting to game...</p>
                </div>
            `;
            document.querySelector('#loginForm').prepend(successMessage);
            
            // Set login redirect flag to prevent flashing
            localStorage.setItem('loginRedirect', 'true');
            
            // Redirect to index page after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = error.message;
            if (error.message.includes('Invalid credentials')) {
                errorMessage = 'Invalid email or password';
            }
            loginError.textContent = errorMessage;
            loginError.style.display = 'block';
        }
    });

    registerButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            registerError.textContent = 'Passwords do not match';
            registerError.style.display = 'block';
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
            registerError.textContent = errorMessage;
            registerError.style.display = 'block';
        }
    });

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
});

// Export the updateUsernameFromDatabase function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateUsernameFromDatabase: window.updateUsernameFromDatabase
    };
} 