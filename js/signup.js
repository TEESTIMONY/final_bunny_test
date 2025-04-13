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

// Modify the createUserWithEmailAndPassword function to process referrals
// Add this after successful user creation
firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        // Get the newly created user
        const user = userCredential.user;
        
        // Create a user profile document in firestore
        db.collection('users').doc(user.uid).set({
            displayName: username,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            score: 0,
            gamesPlayed: 0,
            avatarUrl: defaultAvatarUrl,
            referralCount: 0  // Initialize referral count
        })
        .then(() => {
            // Process referral if exists
            const pendingReferral = localStorage.getItem('pendingReferral');
            
            if (pendingReferral) {
                try {
                    // Decode referral code
                    const decodedRef = decodeURIComponent(atob(pendingReferral));
                    const [referrerId, referrerName] = decodedRef.split(':');
                    
                    // Store the referral info for the auth.js to use
                    sessionStorage.setItem('referrerId', referrerId);
                    sessionStorage.setItem('referrerUsername', referrerName);
                    console.log('Referral data stored in session for auth.js to process');
                    
                    /* 
                    // Removed: We're now handling referrals in auth.js instead
                    // Process the referral using our API
                    const apiUrl = API_ENDPOINTS.referral;
                    
                    fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            referrerId: referrerId,
                            newUserId: user.uid,
                            newUsername: username
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Referral processed successfully:', data);
                        // Clear the pending referral
                        localStorage.removeItem('pendingReferral');
                    })
                    .catch(error => {
                        console.error('Error processing referral:', error);
                    });
                    */
                    
                    // Clear the pending referral after storing the info
                    localStorage.removeItem('pendingReferral');
                } catch (error) {
                    console.error('Error processing referral code:', error);
                }
            }
            
            // Redirect to the profile page or show success message
            window.location.href = 'profile.html';
        })
        .catch((error) => {
            console.error("Error creating user profile: ", error);
            showError(error.message);
        });
    })
    .catch((error) => {
        console.error("Error creating user: ", error);
        showError(error.message);
    }); 