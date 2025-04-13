/**
 * PowerUp class for the game
 */
class PowerUp {
    /**
     * Create a new power-up
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Size of the power-up (both width and height)
     * @param {string} type - Power-up type ('jetpack', 'spring', 'shield', 'coin')
     */
    constructor(x, y, size, type = 'shield') {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = size;
        this.height = size;
        
        // Power-up properties
        this.type = type;
        this.active = true;
        this.collectTimer = 0;
        this.isCollected = false;
        
        // Visual properties
        this.opacity = 1;
        this.bobHeight = 0;
        this.bobDirection = 1;
        this.rotationAngle = 0;
        this.glowIntensity = 0;
        this.glowDirection = 1;
        
        // Animation properties
        this.frame = 0;
        this.frameCount = 2;
        this.frameDelay = 10;
        this.frameTimer = 0;
        this.floatSpeed = 0.003;
        this.floatAmount = 5;
        this.floatOffset = 0;
        
        // Power-up durations in milliseconds
        this.durations = {
            'jetpack': 5000,
            'spring': 3000,
            'shield': 8000,
            'coin': 0 // coins are instant
        };
        
        // Define colors for each power-up type to match theme
        this.colors = {
            'shield': '#8B3A3A',     // Umbrella red for shield
            'jetpack': '#71A744',    // Grass green for jetpack
            'spring': '#D4AF37',     // Gold for spring
            'coin': '#FFD700'        // Gold for coins
        };

        // Create sprite image
        this.sprite = new Image();
        this.sprite.src = 'assets/powerup.png'; // Not used currently
        this.spriteLoaded = false;
    }
    
    /**
     * Update power-up state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        if (this.isCollected) {
            // Update collection animation
            this.collectTimer += deltaTime * 0.1;
            if (this.collectTimer >= 1) {
                this.active = false;
            }
            return;
        }
        
        // Update bob animation
        this.bobHeight += deltaTime * 0.01 * this.bobDirection;
        if (this.bobHeight > 1) {
            this.bobDirection = -1;
        } else if (this.bobHeight < 0) {
            this.bobDirection = 1;
        }
        
        // Update rotation
        this.rotationAngle += deltaTime * 0.001;
        
        // Update glow intensity
        this.glowIntensity += deltaTime * 0.005 * this.glowDirection;
        if (this.glowIntensity > 1) {
            this.glowDirection = -1;
        } else if (this.glowIntensity < 0) {
            this.glowDirection = 1;
        }
        
        // Animate floating effect
        this.floatOffset = Math.sin(Date.now() * this.floatSpeed) * this.floatAmount;
        
        // Animate sprite
        this.frameTimer++;
        if (this.frameTimer >= this.frameDelay) {
            this.frame = (this.frame + 1) % this.frameCount;
            this.frameTimer = 0;
        }
    }
    
    /**
     * Collect the power-up
     * @returns {number} Duration of the power-up effect
     */
    collect() {
        this.isCollected = true;
        this.collectTimer = 0.01;
        return this.durations[this.type];
    }
} 