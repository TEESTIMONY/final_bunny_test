/**
 * Player class for the game
 */
class Player {
    /**
     * Create a new player
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {number} width - Player width
     * @param {number} height - Player height
     */
    constructor(x, y, width, height) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        // Physics
        this.velocityY = 0;
        this.velocityX = 0;
        this.gravity = 0.5;
        this.jumpForce = -15;
        this.maxVelocityY = 15;
        this.terminalVelocity = 15;
        
        // Movement
        this.speed = 6;
        this.direction = 0; // -1: left, 0: neutral, 1: right
        
        // State
        this.isJumping = false;
        this.isFalling = false;
        this.isAlive = true;
        
        // Power-ups
        this.hasPowerUp = false;
        this.powerUpType = null;
        this.powerUpTimer = 0;
        this.hasShield = false;
        
        // Animation
        this.frame = 0;
        this.frameCount = 3;
        this.frameDelay = 5;
        this.frameTimer = 0;
        
        // Create sprite image, but don't rely on it loading
        this.sprite = new Image();
        this.spriteLoaded = false;
        this.sprite.onload = () => {
            console.log("Player sprite loaded successfully!");
            this.spriteLoaded = true;
        };
        this.sprite.onerror = (e) => {
            console.warn('Failed to load player sprite', e);
            this.spriteLoaded = false;
        };
        this.sprite.src = 'assets/player.png'; // Using the bunny image from the HTML file
        
        // Controls
        this.setupControls();
    }
    
    /**
     * Set up keyboard and touch controls
     */
    setupControls() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                this.direction = -1;
            } else if (e.key === 'ArrowRight' || e.key === 'd') {
                this.direction = 1;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if ((e.key === 'ArrowLeft' || e.key === 'a') && this.direction === -1) {
                this.direction = 0;
            } else if ((e.key === 'ArrowRight' || e.key === 'd') && this.direction === 1) {
                this.direction = 0;
            }
        });
        
        // Disable device orientation controls as they can interfere with touch controls
        // Enable only on desktop for a better experience
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!isMobile && window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => {
                if (e.gamma) {
                    // Convert gamma rotation to direction (-90 to 90)
                    this.direction = e.gamma / 45;
                    // Clamp between -1 and 1
                    this.direction = Math.max(-1, Math.min(1, this.direction));
                }
            }, true);
        }
    }
    
    /**
     * Update player state
     * @param {number} deltaTime - Time since last update
     * @param {Object} game - Game instance for reference
     */
    update(deltaTime, game) {
        // Special handling for critical score range (300-310)
        const isInCriticalRange = game && game.score >= 300 && game.score <= 310;
        
        // Apply horizontal movement
        this.velocityX = this.direction * this.speed;
        this.x += this.velocityX;
        
        // Wall collision - bounce off the sides instead of wrapping
        if (this.x < 0) {
            this.x = 0;
            this.velocityX = Math.abs(this.velocityX) * 0.5; // Bounce with reduced velocity
            this.direction = Math.abs(this.direction) * 0.5; // Dampen direction
        } else if (this.x + this.width > game.canvas.width) {
            this.x = game.canvas.width - this.width;
            this.velocityX = -Math.abs(this.velocityX) * 0.5; // Bounce with reduced velocity
            this.direction = -Math.abs(this.direction) * 0.5; // Dampen direction
        }
        
        // Apply gravity
        if (this.powerUpType !== 'jetpack') {
            this.velocityY += this.gravity;
        } else {
            // Jetpack makes player go up
            this.velocityY = -10;
        }
        
        // Cap falling speed
        if (this.velocityY > this.terminalVelocity) {
            this.velocityY = this.terminalVelocity;
        }
        
        // If in critical range (score 300-310), limit jump height
        if (isInCriticalRange && this.velocityY < -10) {
            this.velocityY = -10; // Limit maximum upward velocity
        }
        
        // Update position with safety checks
        if (!isNaN(this.velocityY)) {
            // Store previous Y position for debugging
            const prevY = this.y;
            
            this.y += this.velocityY;
            
            // In critical range, make sure we don't go off-screen
            if (isInCriticalRange) {
                const screenY = this.y - game.camera.y;
                if (screenY < 50) {
                    // Too high, move back down
                    this.y = game.camera.y + 50;
                    this.velocityY = 0; // Stop upward momentum
                }
                
                // Debug log if position changed significantly
                if (Math.abs(this.y - prevY) > 20) {
                    console.log(`Player Y jumped from ${prevY} to ${this.y}, velocityY: ${this.velocityY}`);
                }
            }
        } else {
            console.warn("Invalid vertical velocity detected");
            this.velocityY = 0;
        }
        
        // Add randomness to bouncing for more lively movement
        if (this.velocityY < 0 && !isInCriticalRange) { // Skip random movement in critical range
            // Random horizontal wiggle when jumping
            this.x += (Math.random() - 0.5) * 0.5;
            
            // Ensure wall constraints after random movement
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > game.canvas.width) this.x = game.canvas.width - this.width;
        }
        
        // Update state
        this.isFalling = this.velocityY > 0;
        
        // Handle power-up timer
        if (this.hasPowerUp) {
            this.powerUpTimer -= deltaTime;
            if (this.powerUpTimer <= 0) {
                this.deactivatePowerUp();
            }
        }
        
        // Set frame to 0 to prevent blinking animation
        this.frame = 0;
        
        // Log position periodically for debugging
        if (Math.random() < 0.01 || isInCriticalRange) {
            Utils.debug(`Player pos: ${Math.round(this.x)},${Math.round(this.y)} vel: ${this.velocityY.toFixed(1)}`);
        }
        
        // Check if player has fallen off the screen - with special handling for critical range
        if (this.y > game.camera.y + game.canvas.height) {
            // In critical range, don't let the player die from falling
            if (isInCriticalRange) {
                console.log("Preventing fall at critical score range");
                this.y = game.camera.y + game.canvas.height * 0.7;
                this.velocityY = this.jumpForce * 0.7;
                return;
            }
            
            if (!this.hasShield) {
                this.isAlive = false;
            } else {
                // Use shield to save the player
                this.hasShield = false;
                this.y = game.camera.y + game.canvas.height - this.height * 2;
                this.velocityY = this.jumpForce;
            }
        }
    }
    
    /**
     * Handle collision with a platform
     * @param {Platform} platform - The platform collided with
     */
    onPlatformCollision(platform) {
        // Only collide when falling and feet touch the platform
        if (this.velocityY > 0) { // Player is falling
            const playerBottom = this.y + this.height;
            const platformTop = platform.y;
            
            // Check if player's feet are near the platform top
            if (playerBottom >= platformTop && playerBottom <= platformTop + platform.height / 2) {
                // Snap player to the platform top
                this.y = platformTop - this.height;
                
                // Handle different platform types
                switch (platform.type) {
                    case 'normal':
                        this.jump();
                        break;
                    case 'bouncy':
                        this.jump(1.5); // Stronger jump
                        break;
                    case 'breakable':
                        this.jump();
                        platform.break();
                        break;
                    case 'moving':
                        this.jump();
                        // Apply slight horizontal velocity based on platform movement
                        this.velocityX += platform.velocityX * 0.5;
                        break;
                    case 'disappearing':
                        this.jump();
                        platform.startDisappearing();
                        break;
                }
                
                // Debug log
                if (window.Utils) {
                    Utils.debug(`Jumped on ${platform.type} platform at y=${platform.y}`);
                }
                
                return true;
            }
        }
        return false;
    }
    
    /**
     * Make the player jump
     * @param {number} multiplier - Force multiplier (default: 1)
     */
    jump(multiplier = 1) {
        this.isJumping = true;
        this.isFalling = false;
        
        // Check if we're in the critical score range
        const isInCriticalRange = window.game && window.game.score >= 300 && window.game.score <= 310;
        
        // Apply jump force with a cap for critical range
        if (isInCriticalRange) {
            // Use a gentler jump in the critical range
            this.velocityY = Math.max(-10, this.jumpForce * multiplier * 0.7);
            console.log(`Critical range jump: ${this.velocityY}`);
        } else {
            this.velocityY = this.jumpForce * multiplier;
        }
        
        // Try to play jump sound if available
        try {
            if (window.game && window.game.sounds && window.game.sounds.jump) {
                window.game.sounds.jump.currentTime = 0; // Reset sound position
                const playPromise = window.game.sounds.jump.play();
                
                // Handle the promise properly to avoid uncaught exceptions
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn('[DEBUG] Could not play jump sound', error);
                    });
                }
            }
        } catch (e) {
            console.warn('[DEBUG] Jump sound error:', e);
        }
    }
    
    /**
     * Activate a power-up
     * @param {string} type - Type of power-up ('jetpack', 'spring', 'shield')
     * @param {number} duration - Duration in milliseconds
     */
    activatePowerUp(type, duration) {
        this.hasPowerUp = true;
        this.powerUpType = type;
        this.powerUpTimer = duration;
        
        if (type === 'shield') {
            this.hasShield = true;
        }
        
        // TODO: Play power-up sound effect
    }
    
    /**
     * Deactivate the current power-up
     */
    deactivatePowerUp() {
        this.hasPowerUp = false;
        this.powerUpType = null;
        // Note: Shield stays active until used
    }
    
    /**
     * Draw the player
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraY - Camera Y position for scroll offset
     */
    draw(ctx, cameraY) {
        const screenY = this.y - cameraY;
        
        ctx.save();
        
        // Draw player trail/afterimage effect to make movement more visible
        for (let i = 1; i <= 3; i++) {
            const trailOpacity = 0.1 * (4 - i);
            const trailOffsetY = i * this.velocityY * 0.2;
            
            // Only draw trail when moving significantly
            if (Math.abs(this.velocityY) > 2) {
                ctx.globalAlpha = trailOpacity;
                
                // Draw trail markers (small dots instead of circles)
                ctx.fillStyle = '#39547B'; // Bunny blue trail
                ctx.beginPath();
                ctx.arc(
                    this.x + this.width/2, 
                    screenY + this.height/2 - trailOffsetY, 
                    3, 
                    0, Math.PI * 2
                );
                ctx.fill();
            }
        }
        
        ctx.globalAlpha = 1.0;
        
        // Try to use the sprite image if it exists
        if (this.sprite.complete) {
            // Sprite exists, draw it scaled to fit player dimensions
            ctx.drawImage(
                this.sprite, 
                0, 0, 
                this.sprite.width, this.sprite.height,
                this.x, screenY, 
                this.width, this.height
            );
            
            // Draw direction indicator to show movement
            if (this.direction !== 0) {
                const arrowColor = this.direction > 0 ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
                ctx.fillStyle = arrowColor;
                ctx.beginPath();
                
                if (this.direction > 0) {
                    // Right arrow
                    ctx.moveTo(this.x + this.width, screenY + this.height/2);
                    ctx.lineTo(this.x + this.width + 20, screenY + this.height/2);
                    ctx.lineTo(this.x + this.width + 10, screenY + this.height/2 - 10);
                } else {
                    // Left arrow
                    ctx.moveTo(this.x, screenY + this.height/2);
                    ctx.lineTo(this.x - 20, screenY + this.height/2);
                    ctx.lineTo(this.x - 10, screenY + this.height/2 - 10);
                }
                
                ctx.fill();
            }
        } else {
            // Draw Bunny character based on the image
            
            // Body - blue hoodie
            ctx.fillStyle = '#39547B'; // Blue hoodie color
            ctx.beginPath();
            ctx.roundRect(
                this.x + this.width * 0.1, 
                screenY + this.height * 0.3, 
                this.width * 0.8, 
                this.height * 0.6, 
                [10]
            );
            ctx.fill();
            
            // Head - white rabbit
            ctx.fillStyle = '#FFFFFF'; // White rabbit color
            ctx.beginPath();
            ctx.arc(
                this.x + this.width/2, 
                screenY + this.height * 0.25, 
                this.width * 0.25, 
                0, Math.PI * 2
            );
            ctx.fill();
            
            // Ears
            ctx.beginPath();
            // Left ear
            ctx.moveTo(this.x + this.width * 0.35, screenY + this.height * 0.15);
            ctx.bezierCurveTo(
                this.x + this.width * 0.3, screenY - this.height * 0.15, 
                this.x + this.width * 0.15, screenY - this.height * 0.15,
                this.x + this.width * 0.25, screenY + this.height * 0.1
            );
            
            // Right ear
            ctx.moveTo(this.x + this.width * 0.65, screenY + this.height * 0.15);
            ctx.bezierCurveTo(
                this.x + this.width * 0.7, screenY - this.height * 0.15, 
                this.x + this.width * 0.85, screenY - this.height * 0.15,
                this.x + this.width * 0.75, screenY + this.height * 0.1
            );
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = '#555555'; // Gray-blue eyes
            ctx.beginPath();
            ctx.arc(
                this.x + this.width * 0.4, 
                screenY + this.height * 0.23, 
                this.width * 0.06, 
                0, Math.PI * 2
            );
            ctx.arc(
                this.x + this.width * 0.6, 
                screenY + this.height * 0.23, 
                this.width * 0.06, 
                0, Math.PI * 2
            );
            ctx.fill();
            
            // Nose
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(
                this.x + this.width * 0.5, 
                screenY + this.height * 0.3, 
                this.width * 0.03, 
                0, Math.PI * 2
            );
            ctx.fill();
            
            // Mouth expression based on movement
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            if (this.velocityY < 0) {
                // Happy mouth when jumping up
                ctx.arc(
                    this.x + this.width * 0.5, 
                    screenY + this.height * 0.35, 
                    this.width * 0.12, 
                    0, Math.PI
                );
                
                // Teeth
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(
                    this.x + this.width * 0.45,
                    screenY + this.height * 0.3,
                    this.width * 0.04,
                    this.width * 0.05
                );
                ctx.fillRect(
                    this.x + this.width * 0.51,
                    screenY + this.height * 0.3,
                    this.width * 0.04,
                    this.width * 0.05
                );
            } else {
                // Neutral mouth when falling
                ctx.moveTo(this.x + this.width * 0.4, screenY + this.height * 0.35);
                ctx.lineTo(this.x + this.width * 0.6, screenY + this.height * 0.35);
            }
            ctx.stroke();
            
            // Gold chain necklace
            ctx.strokeStyle = '#FFD700'; // Gold color
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
                this.x + this.width/2,
                screenY + this.height * 0.4,
                this.width * 0.25,
                Math.PI * 0.3,
                Math.PI * 0.7
            );
            ctx.stroke();
            
            // Chain pendants
            for (let i = 0; i < 3; i++) {
                const pendantX = this.x + this.width * (0.4 + i * 0.1);
                const pendantY = screenY + this.height * 0.45;
                
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(
                    pendantX,
                    pendantY,
                    this.width * 0.03,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
        }
        
        // Draw power-up effects
        if (this.hasPowerUp) {
            switch (this.powerUpType) {
                case 'jetpack':
                    // Draw jetpack flames
                    ctx.fillStyle = 'orange';
                    ctx.beginPath();
                    ctx.moveTo(this.x + this.width/4, screenY + this.height);
                    ctx.lineTo(this.x + this.width/2, screenY + this.height + 30);
                    ctx.lineTo(this.x + this.width*3/4, screenY + this.height);
                    ctx.fill();
                    break;
                    
                case 'spring':
                    // Draw spring indicator
                    ctx.fillStyle = 'green';
                    ctx.fillRect(this.x, screenY + this.height - 5, this.width, 5);
                    break;
            }
        }
        
        // Draw shield effect
        if (this.hasShield) {
            // Create a glowing shield effect with umbrella-like appearance
            const gradient = ctx.createRadialGradient(
                this.x + this.width/2, 
                screenY + this.height/2, 
                this.width/2,
                this.x + this.width/2, 
                screenY + this.height/2, 
                this.width * 0.9
            );
            gradient.addColorStop(0, 'rgba(139, 58, 58, 0)');
            gradient.addColorStop(0.7, 'rgba(139, 58, 58, 0.2)');
            gradient.addColorStop(1, 'rgba(139, 58, 58, 0.7)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(
                this.x + this.width/2, 
                screenY + this.height/2, 
                this.width * 0.9, 
                0, Math.PI * 2
            );
            ctx.fill();
            
            // Add shield border - like umbrella
            ctx.strokeStyle = 'rgba(139, 58, 58, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
                this.x + this.width/2, 
                screenY + this.height/2, 
                this.width * 0.9, 
                0, Math.PI * 2
            );
            ctx.stroke();
            
            // Draw umbrella handle
            ctx.strokeStyle = '#8B3A3A';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, screenY + this.height/2);
            ctx.lineTo(this.x + this.width/2, screenY + this.height);
            ctx.stroke();
        }
        
        ctx.restore();
    }
} 