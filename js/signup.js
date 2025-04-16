import config from './config/appwrite.js';

// Use the global Appwrite object instead of importing
const client = new Appwrite.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

const account = new Appwrite.Account(client);

// Function to extract referral code from URL
function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Check for referral code on page load
document.addEventListener('DOMContentLoaded', function() {
    const refCode = getURLParameter('ref');
    
    if (refCode) {
        try {
            // Store referral code in localStorage to use after registration
            localStorage.setItem('pendingReferral', refCode);
            
            // Add UI element to show user they're signing up with a referral
            const signupBox = document.querySelector('.signup-box');
            const referralBanner = document.createElement('div');
            referralBanner.className = 'referral-banner';
            referralBanner.innerHTML = `
                <div class="referral-info">
                    <i class="fas fa-gift"></i>
                    <span>You've been referred! Sign up to receive <strong>200 bonus points</strong>!</span>
                </div>
            `;
            
            // Add CSS for the banner
            const style = document.createElement('style');
            style.textContent = `
                .referral-banner {
                    background: linear-gradient(135deg, #74ebd5, #ACB6E5);
                    color: #2c3e50;
                    padding: 10px 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    animation: pulse 2s infinite;
                }
                
                .referral-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .referral-info i {
                    font-size: 1.2em;
                    color: #e74c3c;
                }
                
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(115, 232, 212, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(115, 232, 212, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(115, 232, 212, 0); }
                }
            `;
            
            document.head.appendChild(style);
            signupBox.insertBefore(referralBanner, signupBox.firstChild);
        } catch (error) {
            console.error('Error processing referral code:', error);
        }
    }
});

// Handle form submission
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    
    try {
        // Create user account in Appwrite
        const user = await account.create(
            Appwrite.ID.unique(),
            email,
            password,
            username
        );
        
        // Create user profile using our API
        const response = await fetch(`${config.apiEndpoint}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user.$id,
                email: email,
                username: username,
                displayName: username,
                score: 0,
                gamesPlayed: 0,
                referralCount: 0,
                createdAt: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create user profile');
        }

        // Process referral if exists
        const pendingReferral = localStorage.getItem('pendingReferral');
        if (pendingReferral) {
            try {
                // Decode referral code
                const decodedRef = decodeURIComponent(atob(pendingReferral));
                const [referrerId, referrerName] = decodedRef.split(':');
                
                // Store the referral info for processing after login
                sessionStorage.setItem('referrerId', referrerId);
                sessionStorage.setItem('referrerUsername', referrerName);
                
                // Clear the pending referral after storing the info
                localStorage.removeItem('pendingReferral');
            } catch (error) {
                console.error('Error processing referral code:', error);
            }
        }

        // Create a session
        await account.createEmailSession(email, password);
        
        // Redirect to profile page
        window.location.href = 'profile.html';
        
    } catch (error) {
        console.error('Error during signup:', error);
        showError(error.message);
    }
});

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
} 