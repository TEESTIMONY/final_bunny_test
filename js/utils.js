/**
 * Utility functions for the game
 */

const Utils = {
    /**
     * Generate a random number between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number between min and max
     */
    randomBetween: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },

    /**
     * Check if two rectangles are colliding
     * @param {Object} rect1 - First rectangle {x, y, width, height}
     * @param {Object} rect2 - Second rectangle {x, y, width, height}
     * @returns {boolean} True if colliding, false otherwise
     */
    isColliding: (rect1, rect2) => {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    },

    /**
     * Check if an object is visible on screen
     * @param {Object} obj - Object with position and size {x, y, width, height}
     * @param {number} canvasHeight - Height of the canvas
     * @param {number} cameraY - Current camera Y position
     * @returns {boolean} True if visible, false otherwise
     */
    isVisible: (obj, canvasHeight, cameraY) => {
        return obj.y > cameraY - obj.height && obj.y < cameraY + canvasHeight;
    },

    /**
     * Create an HTML5 Audio element for a sound effect
     * @param {string} src - Source path for the audio file
     * @returns {HTMLAudioElement} Audio element
     */
    createAudio: (src) => {
        const audio = new Audio(src);
        audio.preload = 'auto';
        return audio;
    },

    /**
     * Ease a value toward a target value
     * @param {number} current - Current value
     * @param {number} target - Target value
     * @param {number} ease - Ease factor (0-1)
     * @returns {number} Eased value
     */
    ease: (current, target, ease) => {
        return current + (target - current) * ease;
    },

    /**
     * Get a random item from an array
     * @param {Array} array - Array to choose from
     * @returns {*} Random item from the array
     */
    randomItem: (array) => {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * Debug logging function
     * @param {string} message - Debug message
     * @param {any} data - Optional data to log
     */
    debug: (message, data = null) => {
        const DEBUG = true; // Set to false to disable debug messages
        if (DEBUG) {
            if (data) {
                console.log(`[DEBUG] ${message}`, data);
            } else {
                console.log(`[DEBUG] ${message}`);
            }
        }
    },
    
    /**
     * Simple game status check to help troubleshoot issues
     */
    checkGameStatus: () => {
        if (!window.game) {
            console.error('Game not initialized!');
            return false;
        }
        
        try {
            const g = window.game;
            console.log('=== GAME STATUS ===');
            console.log('Game running:', g.isRunning);
            console.log('Player position:', {x: g.player.x, y: g.player.y});
            console.log('Player velocity:', {vx: g.player.velocityX, vy: g.player.velocityY});
            console.log('Camera position:', g.camera.y);
            console.log('Platform count:', g.platformManager.platforms.length);
            console.log('Enemy count:', g.enemyManager.enemies.length);
            console.log('PowerUp count:', g.powerUpManager.powerUps.length);
            console.log('==================');
            return true;
        } catch (e) {
            console.error('Error checking game status:', e);
            return false;
        }
    }
}; 