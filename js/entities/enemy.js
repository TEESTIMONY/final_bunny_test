/**
 * Enemy class for the game
 */
class Enemy {
    /**
     * Create a new enemy
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Enemy width
     * @param {number} height - Enemy height
     * @param {string} type - Enemy type ('basic', 'flying', 'static')
     */
    constructor(x, y, width, height, type = 'basic') {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        // Type and behavior
        this.type = type;
        this.active = true;
        this.isDying = false;
        this.dyingProgress = 0;
        
        // Physics and movement
        this.velocityX = 0;
        this.velocityY = 0;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.movementSpeed = 2;
        this.movementRange = 100;
        this.startX = x;
        this.amplitude = 40; // For flying enemies
        this.frequency = 0.05; // For flying enemies
        this.phase = Math.random() * Math.PI * 2; // Random starting phase
        
        // Animation
        this.frame = 0;
        this.frameCount = 2;
        this.frameDelay = 10;
        this.frameTimer = 0;
        
        // Create sprite image
        this.sprite = new Image();
        this.sprite.src = 'assets/enemy.png'; // This will be a placeholder until an actual sprite is created
        
        // Add error handling for the sprite
        this.sprite.onerror = () => {
            console.warn('Enemy sprite could not be loaded, using fallback');
            this.spriteLoaded = false;
        };
        this.spriteLoaded = false;
    }
    
    /**
     * Update enemy state
     * @param {number} deltaTime - Time since last update
     * @param {number} canvasWidth - Width of the game canvas
     */
    update(deltaTime, canvasWidth) {
        if (this.isDying) {
            // Update dying animation
            this.dyingProgress += deltaTime * 0.1;
            if (this.dyingProgress >= 1) {
                this.active = false;
            }
            return;
        }
        
        // Update based on enemy type
        switch (this.type) {
            case 'basic':
                // Basic enemy moves left and right
                this.velocityX = this.direction * this.movementSpeed;
                this.x += this.velocityX;
                
                // Reverse direction at movement range limits
                if (Math.abs(this.x - this.startX) > this.movementRange) {
                    this.direction *= -1;
                }
                break;
                
            case 'flying':
                // Flying enemy moves in a sine wave pattern
                this.phase += this.frequency * deltaTime;
                this.velocityX = this.direction * this.movementSpeed;
                this.x += this.velocityX;
                
                // Sine wave vertical movement
                this.y = this.startX + Math.sin(this.phase) * this.amplitude;
                
                // Reverse direction at screen edges
                if (this.x <= 0 || this.x + this.width >= canvasWidth) {
                    this.direction *= -1;
                }
                break;
                
            case 'static':
                // Static enemy doesn't move, but may animate
                break;
        }
        
        // Animate sprite
        this.frameTimer++;
        if (this.frameTimer >= this.frameDelay) {
            this.frame = (this.frame + 1) % this.frameCount;
            this.frameTimer = 0;
        }
    }
    
    /**
     * Start the dying animation for the enemy
     */
    die() {
        this.isDying = true;
        this.dyingProgress = 0.01;
    }
    
    /**
     * Draw the enemy
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraY - Camera Y position for scroll offset
     */
    draw(ctx, cameraY) {
        if (!this.active) return;
        
        // Calculate screen position
        const screenY = this.y - cameraY;
        
        ctx.save();
        
        // Apply opacity for dying enemies
        if (this.isDying) {
            ctx.globalAlpha = 1 - this.dyingProgress;
        }
        
        // Determine base enemy color - Pepe Green
        let bodyColor = '#4B5320';
        let outlineColor = '#2F3816';
        let suitColor = '#333333';
        let tieColor = '#A83232';
        
        // Make enemies flash if flagged
        if (this.flashingColors && !this.isDying) {
            const flashRate = Date.now() % 1000 / 1000;
            if (flashRate > 0.7) {
                bodyColor = '#71A744'; // Brighter green for flashing
            }
        }
        
        // Draw Pepe the Frog enemy
        
        // Body - suit
        ctx.fillStyle = suitColor;
        ctx.beginPath();
        ctx.roundRect(
            this.x + this.width * 0.1, 
            screenY + this.height * 0.4, 
            this.width * 0.8, 
            this.height * 0.55, 
            [5]
        );
        ctx.fill();
        
        // Head - green
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(
            this.x + this.width/2, 
            screenY + this.height * 0.3, 
            this.width * 0.3,
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Eyes - white with black pupils
        ctx.fillStyle = '#FFFFFF';
        const eyeSize = this.width * 0.12;
        const eyeY = screenY + this.height * 0.25;
        
        // Left eye
        ctx.beginPath();
        ctx.arc(
            this.x + this.width * 0.35, 
            eyeY, 
            eyeSize, 
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Right eye
        ctx.beginPath();
        ctx.arc(
            this.x + this.width * 0.65, 
            eyeY, 
            eyeSize, 
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Pupils - follow player direction
        ctx.fillStyle = '#000000';
        const pupilSize = eyeSize * 0.6;
        const pupilOffset = this.direction * 2;
        
        // Left pupil
        ctx.beginPath();
        ctx.arc(
            this.x + this.width * 0.35 + pupilOffset, 
            eyeY, 
            pupilSize, 
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Right pupil
        ctx.beginPath();
        ctx.arc(
            this.x + this.width * 0.65 + pupilOffset, 
            eyeY, 
            pupilSize, 
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Mouth - Pepe's sad/neutral mouth
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        // Lip outline
        ctx.beginPath();
        ctx.arc(
            this.x + this.width * 0.5, 
            screenY + this.height * 0.4, 
            this.width * 0.2, 
            0.1 * Math.PI, 
            0.9 * Math.PI
        );
        ctx.stroke();
        
        // Tie
        ctx.fillStyle = tieColor;
        ctx.beginPath();
        // Triangle tie shape
        ctx.moveTo(this.x + this.width * 0.5, screenY + this.height * 0.4);
        ctx.lineTo(this.x + this.width * 0.4, screenY + this.height * 0.45);
        ctx.lineTo(this.x + this.width * 0.5, screenY + this.height * 0.65);
        ctx.lineTo(this.x + this.width * 0.6, screenY + this.height * 0.45);
        ctx.closePath();
        ctx.fill();
        
        // Warning indicator for flashing enemies
        if (this.flashingColors && !this.isDying && Date.now() % 1000 > 700) {
            // Draw warning triangle
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, screenY);
            ctx.lineTo(this.x + this.width/2 - 10, screenY - 20);
            ctx.lineTo(this.x + this.width/2 + 10, screenY - 20);
            ctx.closePath();
            ctx.fill();
            
            // Draw exclamation mark
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '15px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', this.x + this.width/2, screenY - 5);
        }
        
        // Add type-specific details
        switch (this.type) {
            case 'flying':
                // Add wings
                ctx.fillStyle = bodyColor;
                
                // Left wing
                ctx.beginPath();
                ctx.ellipse(
                    this.x, 
                    screenY + this.height * 0.3, 
                    this.width * 0.2, 
                    this.height * 0.3, 
                    Math.PI / 4, 
                    0, Math.PI * 2
                );
                ctx.fill();
                
                // Right wing
                ctx.beginPath();
                ctx.ellipse(
                    this.x + this.width, 
                    screenY + this.height * 0.3, 
                    this.width * 0.2, 
                    this.height * 0.3, 
                    -Math.PI / 4, 
                    0, Math.PI * 2
                );
                ctx.fill();
                break;
                
            case 'static':
                // Add spikes
                ctx.fillStyle = '#FF0000';
                const spikeCount = 8;
                
                for (let i = 0; i < spikeCount; i++) {
                    const angle = (i / spikeCount) * Math.PI * 2;
                    const spikeLength = this.width * 0.2;
                    
                    const startX = this.x + this.width/2 + Math.cos(angle) * this.width * 0.4;
                    const startY = screenY + this.height/2 + Math.sin(angle) * this.height * 0.4;
                    
                    const endX = startX + Math.cos(angle) * spikeLength;
                    const endY = startY + Math.sin(angle) * spikeLength;
                    
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
                break;
        }
        
        ctx.restore();
    }
}

/**
 * EnemyManager class for handling enemy generation and management
 */
class EnemyManager {
    /**
     * Create a new enemy manager
     * @param {number} canvasWidth - Width of the game canvas
     * @param {number} canvasHeight - Height of the game canvas
     */
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.enemies = [];
        this.enemySize = 30; // Default enemy size
        
        // Enemy spawn settings
        this.minHeight = 1000; // Minimum height before enemies start spawning
        this.spawnInterval = 2000; // Height interval between enemy spawns
        this.lastSpawnHeight = this.minHeight;
        this.enemyTypes = ['basic', 'flying', 'static'];
        this.enemyChance = 0.7; // Chance of spawning an enemy at a spawn point
        
        // Properties for difficulty scaling
        this.spawnChance = 0.2; // Base chance to spawn enemies (will increase with difficulty)
        this.maxSpeed = 2; // Maximum enemy movement speed (will increase with difficulty)
    }
    
    /**
     * Generate a new enemy
     * @param {number} height - Current game height
     * @returns {Enemy|null} The newly generated enemy or null if no enemy was generated
     */
    generateEnemy(height) {
        if (height < this.minHeight) return null;
        
        // Prevent enemy generation at the critical 300-310 score range
        const currentScore = Math.floor(height / 10);
        if (currentScore >= 300 && currentScore <= 310) {
            return null;
        }
        
        // Check if we've reached a new spawn interval
        if (height - this.lastSpawnHeight < this.spawnInterval) return null;
        
        // Random chance to not spawn an enemy - use difficulty-adjusted spawnChance
        if (Math.random() > this.spawnChance) {
            this.lastSpawnHeight = height;
            return null;
        }
        
        // Generate position - now place enemies only at screen edges
        // to make them easier to avoid
        let x;
        if (Math.random() < 0.5) {
            // Left side
            x = Utils.randomBetween(0, this.canvasWidth * 0.2);
        } else {
            // Right side
            x = Utils.randomBetween(this.canvasWidth * 0.8, this.canvasWidth - this.enemySize);
        }
        
        const y = -height - Utils.randomBetween(50, 150); // Position above the current view
        
        // Create the enemy with speed scaled by difficulty
        const enemy = new Enemy(x, y, this.enemySize, this.enemySize, 'basic');
        
        // Set enemy speed based on difficulty
        enemy.movementSpeed = Utils.randomBetween(1, this.maxSpeed);
        
        // Add flashing colors to make enemies super obvious
        enemy.flashingColors = true;
        
        this.enemies.push(enemy);
        
        // Update last spawn height
        this.lastSpawnHeight = height;
        
        return enemy;
    }
    
    /**
     * Update all enemies
     * @param {number} deltaTime - Time since last update
     * @param {number} cameraY - Camera Y position
     * @param {number} height - Current game height
     */
    update(deltaTime, cameraY, height) {
        // Clear all enemies in the critical 300-310 score range
        if (Math.floor(height / 10) >= 300 && Math.floor(height / 10) <= 310) {
            this.enemies = this.enemies.filter(enemy => {
                const enemyScreenY = enemy.y - cameraY;
                return enemyScreenY < -100 || enemyScreenY > 700;
            });
        }
        
        // Generate new enemies based on height
        this.generateEnemy(Math.abs(cameraY));
        
        // Update existing enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Update enemy behavior
            enemy.update(deltaTime, this.canvasWidth);
            
            // Remove enemies that are no longer active or are too far below the camera
            if (!enemy.active || enemy.y > cameraY + this.canvasHeight + 100) {
                this.enemies.splice(i, 1);
            }
        }
        
        // Make sure enemies don't get too dense at higher scores
        if (window.game && window.game.score > 300) {
            // Limit number of enemies on screen at once
            const visibleEnemies = this.enemies.filter(e => 
                e.y >= cameraY - 100 && e.y <= cameraY + this.canvasHeight + 100
            );
            
            if (visibleEnemies.length > 3) {
                // Remove some enemies if there are too many
                for (let i = this.enemies.length - 1; i >= 0 && visibleEnemies.length > 3; i--) {
                    if (!this.enemies[i].active || Math.random() < 0.3) {
                        this.enemies.splice(i, 1);
                        visibleEnemies.pop();
                    }
                }
            }
        }
    }
    
    /**
     * Draw all enemies
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraY) {
        for (const enemy of this.enemies) {
            if (Utils.isVisible(enemy, this.canvasHeight, cameraY)) {
                enemy.draw(ctx, cameraY);
            }
        }
    }
    
    /**
     * Check for collisions with the player
     * @param {Player} player - The player object
     * @returns {boolean} True if collision occurred
     */
    checkCollisions(player) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (!enemy.active || enemy.isDying) continue;
            
            // Calculate precise collision box 
            // Make the hitbox slightly smaller than visual to be more forgiving
            const enemyCollisionBox = {
                x: enemy.x + enemy.width * 0.2,
                y: enemy.y + enemy.height * 0.2,
                width: enemy.width * 0.6,
                height: enemy.height * 0.6
            };
            
            if (Utils.isColliding(player, enemyCollisionBox)) {
                // Check if player is jumping on top of the enemy
                const playerBottom = player.y + player.height;
                const enemyTop = enemy.y + (enemy.height * 0.2); // More forgiving top collision
                
                if (player.velocityY > 0 && playerBottom < enemyTop + enemy.height * 0.4) {
                    // Player is jumping on enemy - more forgiving check
                    enemy.die();
                    player.velocityY = player.jumpForce * 0.7; // Bounce off enemy
                    return false; // Not a harmful collision
                } else {
                    // Player collided with enemy (not from above)
                    if (player.hasShield) {
                        // Shield protects player and destroys enemy
                        enemy.die();
                        player.hasShield = false;
                        return false;
                    }
                    
                    // After score 300, make enemies weaker - only 50% chance of game over
                    if (window.game && window.game.score > 300 && Math.random() < 0.5) {
                        // The enemy just damages the player but doesn't cause game over
                        enemy.die();
                        
                        // Give a visual indication (flash the screen)
                        const gameContainer = document.querySelector('.game-container');
                        if (gameContainer) {
                            gameContainer.style.animation = 'none';
                            setTimeout(() => {
                                gameContainer.style.animation = 'damage-flash 0.5s';
                            }, 10);
                            
                            // Add the animation if it doesn't exist
                            if (!document.getElementById('damageAnimation')) {
                                const style = document.createElement('style');
                                style.id = 'damageAnimation';
                                style.textContent = `
                                    @keyframes damage-flash {
                                        0% { background-color: rgba(255, 0, 0, 0); }
                                        50% { background-color: rgba(255, 0, 0, 0.3); }
                                        100% { background-color: rgba(255, 0, 0, 0); }
                                    }
                                `;
                                document.head.appendChild(style);
                            }
                        }
                        
                        // Make player bounce away from enemy
                        const pushDirection = player.x < enemy.x ? -1 : 1;
                        player.velocityY = player.jumpForce * 0.5;
                        player.x += pushDirection * 30;
                        
                        return false;
                    }
                    
                    return true; // Harmful collision
                }
            }
        }
        
        return false;
    }
} 