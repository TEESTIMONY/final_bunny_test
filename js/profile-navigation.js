/**
 * Profile Navigation JavaScript for Hop Bunny
 * Handles making the user info bar clickable on any page to navigate to the user's profile
 */

document.addEventListener('DOMContentLoaded', function() {
    // Make the user info bar clickable to navigate to profile
    makeUserInfoBarClickable();
});

/**
 * Make the user info bar clickable to navigate to user's profile
 */
function makeUserInfoBarClickable() {
    // Get the user info bar element
    const userInfoBar = document.querySelector('.user-info-bar');
    
    if (userInfoBar) {
        userInfoBar.style.cursor = 'pointer';
        userInfoBar.classList.add('clickable-profile');
        
        // Add click event to navigate to the profile page
        userInfoBar.addEventListener('click', () => {
            // Simply navigate to the profile page
            window.location.href = 'profile.html';
        });
        
        // Add hover effect styles for the user info bar
        addUserInfoBarStyles();
    }
}

/**
 * Add hover effect styles for the user info bar
 */
function addUserInfoBarStyles() {
    // Check if styles have already been added
    if (document.getElementById('user-info-bar-styles')) {
        return;
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'user-info-bar-styles';
    
    // Define styles
    const css = `
        .user-info-bar.clickable-profile {
            transition: transform 0.2s ease, box-shadow 0.3s ease, background-color 0.3s ease;
            position: relative;
        }
        
        .user-info-bar.clickable-profile:hover {
            transform: translateY(-3px);
            background-color: rgba(52, 152, 219, 0.3);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .user-info-bar.clickable-profile:after {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            border-radius: inherit;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        
        .user-info-bar.clickable-profile:hover:after {
            opacity: 1;
        }
        
        .user-info-bar.clickable-profile:before {
            content: "View Profile";
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
        }
        
        .user-info-bar.clickable-profile:hover:before {
            opacity: 1;
            transform: translateX(-50%) translateY(-3px);
        }
    `;
    
    // Add the styles to the style element
    style.textContent = css;
    
    // Append the style element to the head
    document.head.appendChild(style);
} 