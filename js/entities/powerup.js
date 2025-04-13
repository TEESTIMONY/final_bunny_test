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

        // Don't try to load the sprite image since it doesn't exist
        // Just use canvas-drawn shapes instead
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
    
    /**
     * Draw the power-up
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraY - Camera Y position for scroll offset
     */
    draw(ctx, cameraY) {
        if (!this.active) return;
        
        // Calculate screen position
        const screenY = this.y - cameraY;
        
        ctx.save();
        
        // Apply animation effects
        const bobOffset = Math.sin(this.bobHeight) * 5;
        const scale = 1 + Math.sin(this.bobHeight * 2) * 0.05;
        
        // Apply collection animation
        if (this.isCollected) {
            ctx.globalAlpha = 1 - this.collectTimer;
            const collectScale = 1 + this.collectTimer * 2;
            ctx.translate(this.x + this.width / 2, screenY + this.height / 2);
            ctx.scale(collectScale, collectScale);
            ctx.translate(-(this.x + this.width / 2), -(screenY + this.height / 2));
        } else {
            ctx.translate(this.x + this.width / 2, screenY + this.height / 2 + bobOffset);
            ctx.rotate(this.rotationAngle);
            ctx.scale(scale, scale);
            ctx.translate(-(this.x + this.width / 2), -(screenY + this.height / 2));
        }
        
        // Draw power-up based on type
        switch (this.type) {
            case 'shield':
                // Draw umbrella shield
                ctx.fillStyle = this.colors[this.type];
                
                // Umbrella top
                ctx.beginPath();
                ctx.arc(
                    this.x + this.width/2,
                    screenY + this.height/3,
                    this.width/2.5,
                    Math.PI,
                    0
                );
                ctx.fill();
                
                // Umbrella handle
                ctx.strokeStyle = '#5E2727';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x + this.width/2, screenY + this.height/3);
                ctx.lineTo(this.x + this.width/2, screenY + this.height/1.2);
                ctx.stroke();
                
                // Umbrella ribs
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 1;
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.moveTo(this.x + this.width/2, screenY + this.height/3);
                    ctx.lineTo(
                        this.x + this.width/2 + Math.cos(Math.PI + (i * Math.PI/4)) * this.width/2.5,
                        screenY + this.height/3 + Math.sin(Math.PI + (i * Math.PI/4)) * this.width/2.5
                    );
                    ctx.stroke();
                }
                break;
                
            case 'jetpack':
                // Draw Pepe-themed jetpack
                ctx.fillStyle = this.colors[this.type];
                
                // Jetpack body
                ctx.beginPath();
                ctx.roundRect(
                    this.x + this.width * 0.2,
                    screenY + this.height * 0.2,
                    this.width * 0.6,
                    this.height * 0.6,
                    [5]
                );
                ctx.fill();
                
                // Pepe face on jetpack
                ctx.fillStyle = '#4B5320';
                ctx.beginPath();
                ctx.arc(
                    this.x + this.width/2,
                    screenY + this.height/2,
                    this.width/4,
                    0, Math.PI * 2
                );
                ctx.fill();
                
                // Pepe eyes
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(
                    this.x + this.width/2 - this.width/8,
                    screenY + this.height/2 - this.height/10,
                    this.width/10,
                    0, Math.PI * 2
                );
                ctx.arc(
                    this.x + this.width/2 + this.width/8,
                    screenY + this.height/2 - this.height/10,
                    this.width/10,
                    0, Math.PI * 2
                );
                ctx.fill();
                
                // Flames
                ctx.fillStyle = 'orange';
                ctx.beginPath();
                ctx.moveTo(this.x + this.width/3, screenY + this.height * 0.8);
                ctx.lineTo(this.x + this.width/2, screenY + this.height * 1.1);
                ctx.lineTo(this.x + this.width * 2/3, screenY + this.height * 0.8);
                ctx.fill();
                break;
                
            case 'spring':
                // Draw gold spring
                ctx.fillStyle = this.colors[this.type];
                
                // Spring base
                ctx.fillRect(
                    this.x + this.width * 0.2,
                    screenY + this.height * 0.7,
                    this.width * 0.6,
                    this.height * 0.2
                );
                
                // Spring coils
                ctx.strokeStyle = this.colors[this.type];
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x + this.width * 0.3, screenY + this.height * 0.7);
                
                // Draw zigzag
                const segments = 4;
                const coilHeight = this.height * 0.5;
                for (let i = 0; i <= segments; i++) {
                    const segX = this.x + this.width * 0.3 + (this.width * 0.4 * i / segments);
                    const segY = screenY + this.height * 0.7 - (i % 2 === 0 ? 0 : coilHeight / 2);
                    ctx.lineTo(segX, segY);
                }
                
                ctx.stroke();
                
                // Spring top
                ctx.fillRect(
                    this.x + this.width * 0.2,
                    screenY + this.height * 0.2,
                    this.width * 0.6,
                    this.height * 0.1
                );
                break;
                
            case 'coin':
                // Draw gold coin
                ctx.fillStyle = this.colors[this.type];
                ctx.beginPath();
                ctx.arc(
                    this.x + this.width/2,
                    screenY + this.height/2,
                    this.width/2.5,
                    0, Math.PI * 2
                );
                ctx.fill();
                
                // Coin edge
                ctx.strokeStyle = '#D4AF37';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(
                    this.x + this.width/2,
                    screenY + this.height/2,
                    this.width/2.5,
                    0, Math.PI * 2
                );
                ctx.stroke();
                
                // Dollar sign
                ctx.fillStyle = '#FFF';
                ctx.font = `${this.width/2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', this.x + this.width/2, screenY + this.height/2);
                break;
                
            default:
                // Generic power-up
                ctx.fillStyle = this.colors[this.type] || '#FFF';
                ctx.beginPath();
                ctx.arc(
                    this.x + this.width/2,
                    screenY + this.height/2,
                    this.width/2.5,
                    0, Math.PI * 2
                );
                ctx.fill();
                break;
        }
        
        // Draw glow effect
        ctx.globalAlpha = 0.3 + this.glowIntensity * 0.2;
        ctx.filter = 'blur(5px)';
        ctx.fillStyle = this.colors[this.type];
        ctx.beginPath();
        ctx.arc(
            this.x + this.width / 2, 
            screenY + this.height / 2, 
            this.width / 1.5, 
            0, Math.PI * 2
        );
        ctx.fill();
        ctx.filter = 'none';
        
        ctx.restore();
    }
}

/**
 * PowerUpManager class for handling power-up generation and management
 */
class PowerUpManager {
    /**
     * Create a new power-up manager
     * @param {number} canvasWidth - Width of the game canvas
     * @param {number} canvasHeight - Height of the game canvas
     */
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.powerUps = [];
        this.powerUpSize = 40; // Default power-up size
        
        // Power-up spawn settings
        this.minHeight = 500; // Minimum height before power-ups start spawning
        this.spawnInterval = 3000; // Height interval between power-up spawns
        this.lastSpawnHeight = this.minHeight;
        this.powerUpTypes = ['jetpack', 'spring', 'shield'];
        this.powerUpChance = 0.5; // Chance of spawning a power-up at a spawn point
    }
    
    /**
     * Generate a new power-up
     * @param {number} height - Current game height
     * @returns {PowerUp|null} The newly generated power-up or null if no power-up was generated
     */
    generatePowerUp(height) {
        if (height < this.minHeight) return null;
        
        // Check if we've reached a new spawn interval
        if (height - this.lastSpawnHeight < this.spawnInterval) return null;
        
        // Random chance to not spawn a power-up
        if (Math.random() > this.powerUpChance) {
            this.lastSpawnHeight = height;
            return null;
        }
        
        // Choose a random power-up type
        const type = Utils.randomItem(this.powerUpTypes);
        
        // Generate position
        const x = Utils.randomBetween(0, this.canvasWidth - this.powerUpSize);
        const y = -height - Utils.randomBetween(0, 100); // Position above the current view
        
        // Create the power-up
        const powerUp = new PowerUp(x, y, this.powerUpSize, type);
        this.powerUps.push(powerUp);
        
        // Update last spawn height
        this.lastSpawnHeight = height;
        
        return powerUp;
    }
    
    /**
     * Update all power-ups
     * @param {number} deltaTime - Time since last update
     * @param {number} cameraY - Camera Y position
     * @param {number} height - Current game height
     */
    update(deltaTime, cameraY, height) {
        // Generate new power-ups based on height
        this.generatePowerUp(Math.abs(cameraY));
        
        // Update existing power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            // Update power-up behavior
            powerUp.update(deltaTime);
            
            // Remove power-ups that are no longer active or are too far below the camera
            if (!powerUp.active || powerUp.y > cameraY + this.canvasHeight + 100) {
                this.powerUps.splice(i, 1);
            }
        }
    }
    
    /**
     * Draw all power-ups
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraY) {
        for (const powerUp of this.powerUps) {
            if (Utils.isVisible(powerUp, this.canvasHeight, cameraY)) {
                powerUp.draw(ctx, cameraY);
            }
        }
    }
    
    /**
     * Check for collisions with the player
     * @param {Player} player - The player object
     */
    checkCollisions(player) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (!powerUp.active || powerUp.isCollected) continue;
            
            if (Utils.isColliding(player, powerUp)) {
                // Player collected the power-up
                const duration = powerUp.collect();
                
                // Check if player exists and has the activatePowerUp method
                if (player && typeof player.activatePowerUp === 'function') {
                    // Safely activate the power-up on the player
                    try {
                        player.activatePowerUp(powerUp.type, duration);
                        console.log(`[DEBUG] PowerUp collected: ${powerUp.type}, duration: ${duration}`);
                    } catch (e) {
                        console.error('[DEBUG] Error activating power-up:', e);
                    }
                } else {
                    console.warn('[DEBUG] Player cannot activate power-up - missing method');
                }
            }
        }
    }
} 