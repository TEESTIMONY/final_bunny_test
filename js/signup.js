import config from './config/appwrite.js';

// Use the global Appwrite object instead of importing
const client = new Appwrite.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);

// Function to extract referral code from URL
function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    const param = urlParams.get(name);
    return param ? decodeURIComponent(param) : null;
}

// Check for referral code on page load
document.addEventListener('DOMContentLoaded', function() {
    const refCode = getURLParameter('ref');
    
    if (refCode) {
        try {
            // Store referral code in localStorage to use after registration
            localStorage.setItem('pendingReferral', refCode);
            console.log('Stored referral code in localStorage:', refCode);
            
            // Add UI element to show user they're signing up with a referral
            const signupBox = document.querySelector('.signup-box');
            if (!signupBox) {
                console.error('Signup box not found in DOM');
                return;
            }
            
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
        // Show loading state
        const submitButton = document.getElementById('registerButton') || document.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Creating account...';
        }
        
        console.log('Starting signup process');
        
        // Create user account in Appwrite
        const user = await account.create(
            Appwrite.ID.unique(),
            email,
            password,
            username
        );
        
        console.log('User created in Appwrite:', user);
        
        // Get the referral ID if it exists - check both localStorage and sessionStorage
        const pendingReferral = localStorage.getItem('pendingReferral') || sessionStorage.getItem('pendingReferral');
        let referrerId = null;
        
        console.log('Checking for referral in storage:', { 
            pendingReferral, 
            fromLocalStorage: localStorage.getItem('pendingReferral'),
            fromSessionStorage: sessionStorage.getItem('pendingReferral')
        });
        
        // Process referral if exists
        if (pendingReferral) {
            referrerId = pendingReferral;
            console.log('IS REFERRAL REGISTRATION: YES');
            console.log('Detected referral for referrer ID:', referrerId);
        }
        
        // Set initial score (with bonus if referred)
        const initialScore = referrerId ? 200 : 0;
        
        // Create user profile in the database
        await databases.createDocument(
            config.databaseId,
            config.usersCollectionId,
            user.$id,
            {
                email: email,
                username: username,
                displayName: username,
                score: initialScore,
                highScore: initialScore,
                gamesPlayed: 0,
                referralCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );
        
        console.log('User document created in database');
        
        // Process referral rewards if there's a referral
        if (referrerId) {
            try {
                console.log('📣 Processing referral for new user');
                console.log('👉 Referrer ID:', referrerId);
                console.log('👉 New User ID:', user.$id);
                
                // Try the direct API approach first (similar to update-score endpoint)
                try {
                    console.log('🔄 Using update-score API for referral processing...');
                    
                    const apiResult = await fetch(`${config.apiEndpoint}/update-score`, {
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
                        await processFallbackReferralUpdate(referrerId, user.$id, username);
                    }
                } catch (apiError) {
                    console.error('❌ API referral processing error:', apiError.message);
                    // Fallback to direct database update
                    await processFallbackReferralUpdate(referrerId, user.$id, username);
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

        // Show success message
        showSuccess('Account created successfully! Logging you in...');
        
        // Create a session (log the user in)
        await account.createEmailSession(email, password);
        
        // Redirect to profile page or game page
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
        
    } catch (error) {
        console.error('Error during signup:', error);
        
        // Re-enable the submit button
        const submitButton = document.getElementById('registerButton') || document.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Register';
        }
        
        showError(error.message);
    }
});

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function showSuccess(message) {
    // Create success message element if it doesn't exist
    let successDiv = document.getElementById('success-message');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'success-message';
        successDiv.style.cssText = 'background-color: #4CAF50; color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px; text-align: center;';
        const form = document.getElementById('signupForm');
        form.parentNode.insertBefore(successDiv, form);
    }
    
    successDiv.textContent = message;
    successDiv.style.display = 'block';
}

// Add this function after the form event listener
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