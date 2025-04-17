import config from './config/appwrite.js';

// Initialize Appwrite client
const client = new Appwrite.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

const account = new Appwrite.Account(client);

// Function to check if user is authenticated
async function checkAuth() {
    try {
        // Check if we have a session
        const session = await account.getSession('current');
        if (!session) {
            throw new Error('No active session');
        }

        // Get user data
        const user = await account.get();
        
        // Store user info in session storage
        sessionStorage.setItem('userId', user.$id);
        sessionStorage.setItem('userEmail', user.email);
        sessionStorage.setItem('username', user.name || user.email.split('@')[0]);
        
        // Also store in localStorage to ensure persistence
        localStorage.setItem('userId', user.$id);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('username', user.name || user.email.split('@')[0]);
        
        // Set initial game stats if they don't exist
        if (!sessionStorage.getItem('score')) {
            sessionStorage.setItem('score', '0');
            sessionStorage.setItem('highScore', '0');
            sessionStorage.setItem('gamesPlayed', '0');
        }
        
        return true;
    } catch (error) {
        console.log('Auth check failed:', error);
        return false;
    }
}

// Function to handle logout
async function handleLogout() {
    try {
        await account.deleteSession('current');
        
        // Clear session storage
        sessionStorage.clear();
        
        // Clear localStorage too
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('username');
        localStorage.removeItem('loginRedirect');
        
        // Redirect to auth page
        window.location.href = '/auth';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Check authentication when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // First, check for referral parameters in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
        console.log('Auth-check: Referral code detected in URL:', refCode);
        
        // Store in both localStorage for persistence 
        const decodedRefCode = decodeURIComponent(refCode);
        localStorage.setItem('pendingReferral', decodedRefCode);
        console.log('Auth-check: Stored referral code in localStorage:', decodedRefCode);
        
        // If we're not on the auth page, redirect there with the referral code
        if (!window.location.pathname.includes('/auth')) {
            console.log('Auth-check: Redirecting to auth with referral code');
            window.location.href = '/auth?ref=' + encodeURIComponent(decodedRefCode);
            return;
        }
    }

    // Don't check auth on auth page
    if (window.location.pathname.includes('/auth')) {
        return;
    }

    // Check if we're already redirecting
    const isRedirecting = sessionStorage.getItem('loginRedirect');
    if (isRedirecting) {
        sessionStorage.removeItem('loginRedirect');
        return;
    }

    // Check authentication
    const isAuthenticated = await checkAuth();
    
    // If not authenticated and not on auth page, redirect to auth
    if (!isAuthenticated) {
        sessionStorage.setItem('loginRedirect', 'true');
        window.location.href = '/auth';
    } else {
        // Update username display if available
        if (typeof window.setupUsernameDisplay === 'function') {
            window.setupUsernameDisplay();
        } else if (document.getElementById('usernameDisplay')) {
            // Fallback if setupUsernameDisplay isn't globally available
            const usernameDisplay = document.getElementById('usernameDisplay');
            const usernameText = document.getElementById('usernameText');
            if (usernameText) {
                const username = localStorage.getItem('username') || sessionStorage.getItem('username');
                if (username) {
                    usernameText.textContent = username;
                    
                    // Special styling for "emma"
                    if (username.toLowerCase() === 'emma') {
                        usernameDisplay.classList.add('emma-style');
                    }
                    
                    usernameDisplay.style.display = 'inline-flex';
                }
            }
        }
    }

    // Add logout button event listener
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}); 