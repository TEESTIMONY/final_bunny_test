// Auth checker - Checks if user is authenticated and redirects to auth page if not

document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('startScreen');
    
    // Check if we're in development mode (running locally)
    const isDevelopment = window.location.hostname === "127.0.0.1" || 
                           window.location.hostname === "localhost";
    
    // Check for referral parameter in URL
    checkForReferral();
    
    // Check if user is authenticated
    function checkAuthentication() {
        // Check localStorage and sessionStorage for token
        const tokenFromStorage = localStorage.getItem('token');
        const tokenFromSession = sessionStorage.getItem('token');
        
        // If no token found in either storage, redirect to auth page
        if (!tokenFromStorage && !tokenFromSession) {
            console.log('No authentication token found, redirecting to auth page');
            window.location.href = 'auth.html';
            return false;
        }
        
        return true;
    }
    
    // Function to display username in top right corner
    function displayUsername() {
        // Get user ID from storage
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (userId && token) {
            // API URL - Using the backend URL
            const API_BASE_URL = 'https://new-backend-hop.vercel.app';
            
            // Fetch user data from the database
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
                let username = userData.username || userData.displayName;
                
                // If we have valid username from the database, update storage
                if (username) {
                    console.log('Username fetched from database:', username);
                    
                    // Update the username in storage for other pages
                    if (localStorage.getItem('token')) {
                        localStorage.setItem('username', username);
                    } else {
                        sessionStorage.setItem('username', username);
                    }
                } else {
                    // Fall back to stored username if database didn't return it
                    username = localStorage.getItem('username') || sessionStorage.getItem('username');
                }
                
                // If still no username, generate one based on userId
                if (!username || username === 'undefined') {
                    username = `User-${userId.substring(0, 5)}`;
                    console.log(`Generated temporary username from userId: ${username}`);
                }
                
                // Create and display the username element
                displayUsernameElement(username);
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                
                // Fall back to stored username on error
                let username = localStorage.getItem('username') || sessionStorage.getItem('username');
                
                // If still no username, generate one based on userId
                if (!username || username === 'undefined') {
                    username = `User-${userId.substring(0, 5)}`;
                    console.log(`Error fetching username, using generated: ${username}`);
                }
                
                // Create and display the username element
                displayUsernameElement(username);
            });
        } else {
            // If no userId or token, use stored username or Guest Player
            let username = localStorage.getItem('username') || sessionStorage.getItem('username');
            
            if (!username || username === 'undefined') {
                username = 'Guest Player';
                console.log('No userId or token found, using "Guest Player"');
            }
            
            // Create and display the username element
            displayUsernameElement(username);
        }
    }
    
    // Helper function to create and display the username element
    function displayUsernameElement(username) {
        // Remove any existing username display first
        const existingDisplay = document.querySelector('.username-display');
        if (existingDisplay && existingDisplay.parentNode) {
            existingDisplay.parentNode.removeChild(existingDisplay);
        }
        
        // Create username element for the top right corner
        const usernameElement = document.createElement('div');
        usernameElement.classList.add('username-display', 'top-right', 'user-display-name');
        usernameElement.innerHTML = `<i class="fas fa-user"></i> ${username}`;
        
        // Add directly to body for highest z-index and positioning
        document.body.appendChild(usernameElement);
        
        // Make the element clickable to go to profile
        usernameElement.style.cursor = 'pointer';
        usernameElement.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
        
        // Add tooltip
        usernameElement.title = "Click to view profile";
        
        // Ensure styles are applied
        addUsernameDisplayStyles();
    }
    
    // Function to add styles for username display
    function addUsernameDisplayStyles() {
        if (document.getElementById('username-display-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'username-display-styles';
        style.textContent = `
            .username-display {
                position: fixed;
                background: rgba(41, 128, 185, 0.75);
                backdrop-filter: blur(5px);
                -webkit-backdrop-filter: blur(5px);
                color: white;
                border-radius: 50px;
                padding: 8px 15px;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: 500;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.2);
                z-index: 1000;
                transition: all 0.2s ease;
            }
            
            .username-display.top-right {
                top: 15px;
                right: 15px;
                left: auto;
                bottom: auto;
                animation: slide-in-right 0.5s ease-out forwards;
            }
            
            .username-display:hover {
                background: rgba(52, 152, 219, 0.9);
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            }
            
            .username-display:active {
                transform: translateY(0px);
                background: rgba(41, 128, 185, 0.85);
            }
            
            .username-display i {
                color: #ffffff;
            }
            
            @keyframes slide-in-right {
                0% {
                    opacity: 0;
                    transform: translateX(20px);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Function to check for referral parameter in URL
    function checkForReferral() {
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode = urlParams.get('ref');
        
        if (referralCode) {
            console.log('Referral code found:', referralCode);
            
            try {
                // Decode the referral code
                const decodedRef = decodeURIComponent(atob(referralCode));
                const [referrerId, referrerUsername] = decodedRef.split(':');
                
                // Store referral info in sessionStorage
                sessionStorage.setItem('referrerId', referrerId);
                sessionStorage.setItem('referrerUsername', referrerUsername);
                
                console.log(`Referred by: ${referrerUsername} (${referrerId})`);
                
                // Create a notification element to show the referral bonus
                const notification = document.createElement('div');
                notification.className = 'referral-notification';
                notification.innerHTML = `
                    <div class="notification-icon"><i class="fas fa-gift"></i></div>
                    <div class="notification-content">
                        <div class="notification-title">Referral Bonus!</div>
                        <div class="notification-message">You were invited by ${referrerUsername}. Sign up to get 500 bonus points!</div>
                    </div>
                    <div class="notification-close"><i class="fas fa-times"></i></div>
                `;
                
                // Add notification styles
                addReferralNotificationStyles();
                
                // Add to body after a short delay
                setTimeout(() => {
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
                    
                    // Auto-hide after 10 seconds
                    setTimeout(() => {
                        notification.classList.add('hiding');
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.parentNode.removeChild(notification);
                            }
                        }, 300);
                    }, 10000);
                }, 1000);
                
                // Clean up the URL without refreshing
                const newUrl = window.location.protocol + "//" + 
                               window.location.host + 
                               window.location.pathname;
                window.history.replaceState({path: newUrl}, '', newUrl);
            } catch (error) {
                console.error('Error processing referral code:', error);
            }
        }
    }
    
    // Function to add styles for referral notification
    function addReferralNotificationStyles() {
        if (document.getElementById('referral-notification-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'referral-notification-styles';
        style.textContent = `
            .referral-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(46, 204, 113, 0.9);
                color: white;
                border-radius: 10px;
                padding: 15px;
                display: flex;
                align-items: center;
                max-width: 350px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                z-index: 9999;
                animation: slideIn 0.5s ease forwards;
                backdrop-filter: blur(5px);
            }
            
            .referral-notification.hiding {
                animation: slideOut 0.3s ease forwards;
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
            
            @keyframes slideIn {
                from {
                    transform: translateX(120%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(120%);
                    opacity: 0;
                }
            }
            
            @media (max-width: 500px) {
                .referral-notification {
                    bottom: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Call the authentication check function
    const isAuthenticated = checkAuthentication();
    
    // In development mode, we can still require authentication
    // Remove or comment out this block to enforce authentication in all environments
    if (isDevelopment && false) { // Set to false to enforce auth even in development
        console.log('Development mode: Bypassing authentication check');
        startScreen.classList.remove('hidden');
        return;
    }
    
    // Check authentication and redirect if needed
    if (!isAuthenticated) {
        return; // Stop execution if redirecting
    }
    
    // If we get here, the user is authenticated
    console.log('User is authenticated, showing start screen');
    
    // Display the username after confirming authentication
    displayUsername();
    
    // Show the start screen
    startScreen.classList.remove('hidden');
    
    // Set up logout functionality
    const logoutButton = document.createElement('button');
    logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> LOGOUT';
    logoutButton.classList.add('game-button', 'logout-game-button');
    
    logoutButton.addEventListener('click', () => {
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('highScore');
        
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('highScore');
        
        // Redirect to auth page
        window.location.href = 'auth.html';
    });
    
    // Find the play and leaderboard buttons
    const startButton = document.getElementById('startButton');
    const leaderboardButton = document.getElementById('leaderboardButton');
    
    if (startButton && leaderboardButton) {
        // Get or create the button container
        let buttonContainer = document.querySelector('.button-container');
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.classList.add('button-container');
            
            // Replace the current play button with the container
            if (startButton.parentNode) {
                startButton.parentNode.insertBefore(buttonContainer, startButton);
            }
        } else {
            // Remove the leaderboard button from its current position
            if (leaderboardButton.parentNode) {
                leaderboardButton.parentNode.removeChild(leaderboardButton);
            }
        }
        
        // Clear the button container and add the buttons in the desired order
        buttonContainer.innerHTML = '';
        buttonContainer.appendChild(startButton);
        buttonContainer.appendChild(logoutButton);
        buttonContainer.appendChild(leaderboardButton);
        
        // Add some spacing between buttons
        startButton.style.marginBottom = '15px';
        logoutButton.style.marginBottom = '5px';
    }
    
    // Display high score if available
    const highScore = localStorage.getItem('highScore') || sessionStorage.getItem('highScore') || 0;
    const highScoreElement = document.getElementById('highScore');
    if (highScoreElement) {
        highScoreElement.textContent = highScore;
    }
}); 