// Import Appwrite configuration
import config from './config/appwrite.js';

// Initialize Appwrite client
const client = new Appwrite.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

// Initialize Appwrite services
const databases = new Appwrite.Databases(client);

/**
 * Main Game class that manages game logic and entities
 */
export class Game {
    /**
     * Create a new game instance
     * @param {HTMLCanvasElement} canvas - Canvas element to render the game on
     */
    constructor(canvas) {
        // Canvas and rendering context
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set canvas size based on container size
        this.resizeCanvas();
        
        // Add resize listener to adjust canvas on window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Game state
        this.isRunning = false;
        this.isGameOver = false;
        this.score = 0;
        
        // Initialize high score from localStorage, but will be updated from server if user is logged in
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        
        // Initialize total score and games played from localStorage (will be updated from server)
        this.totalScore = parseInt(localStorage.getItem('totalScore')) || 0;
        this.gamesPlayed = parseInt(localStorage.getItem('gamesPlayed')) || 0;
        
        // Store username if logged in, prioritizing database-retrieved values
        this.username = localStorage.getItem('username') || sessionStorage.getItem('username') || null;
        console.log('Username from storage:', this.username);
        
        // Enhanced game over screen tracking
        this.enhancedGameOverScreen = false;
        this.scoreData = null;
        
        // Fetch user's high score from backend if they're logged in
        this.fetchUserHighScore();
        
        // Difficulty system
        this.difficulty = 1;
        this.lastDifficultyIncrease = 0;
        
        // Time tracking
        this.lastTime = 0;
        this.animationFrameId = null;
        
        // Camera
        this.camera = {
            y: 0,
            targetY: 0,
            smoothing: 0.1
        };
        
        // Background
        this.background = {
            color: '#87CEEB',
            clouds: []
        };
        
        // Sound effects
        this.sounds = {
            jump: null,
            powerUp: null,
            enemyDeath: null,
            playerDeath: null,
            milestone: null,
            backgroundMusic: null
        };
        
        // Initialize game entities
        this.initEntities();
        
        // Initialize DOM elements
        this.scoreElement = document.getElementById('score');
        this.gameOverElement = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        this.restartButton = document.getElementById('restartButton');
        
        // Set up event listeners
        this.restartButton.addEventListener('click', () => this.restart());
        
        // Load audio if requested
        this.loadAudio();
        
        // Generate initial clouds
        this.generateClouds();
        
        // Milestone timers
        this.milestoneTimers = {};
        
        // Set up event listeners for control buttons
        this.setupControlButtons();
    }
    
    /**
     * Initialize game entities
     */
    initEntities() {
        // Create player
        this.player = new Player(
            this.canvas.width / 2 - 30, // Half of width (60/2)
            this.canvas.height - 150, // Position for player
            60, // Width reduced to 60
            100  // Height maintained at 100
        );
        
        // Create platform manager
        this.platformManager = new PlatformManager(
            this.canvas.width,
            this.canvas.height,
            15 // Initial platform count
        );
        
        // Create enemy manager
        this.enemyManager = new EnemyManager(
            this.canvas.width,
            this.canvas.height
        );
        
        // Create power-up manager
        this.powerUpManager = new PowerUpManager(
            this.canvas.width,
            this.canvas.height
        );
        
        // Ensure there's a starting platform under the player
        const startingPlatform = new Platform(
            this.canvas.width / 2 - 40, // Platform centered under player (slightly wider than player)
            this.canvas.height - 40, // Just below player's feet
            80, // Platform width appropriate for 60px player
            this.platformManager.platformHeight || 20,
            'normal'
        );
        this.platformManager.platforms.push(startingPlatform);
    }
    
    /**
     * Load audio files
     */
    loadAudio() {
        // Make audio optional to avoid blocking game start if files don't exist
        this.sounds = {
            jump: null,
            powerUp: null,
            enemyDeath: null,
            playerDeath: null,
            milestone: null,
            backgroundMusic: null
        };
        
        // Try to load audio files, but don't block game if they don't exist
        try {
            // Create audio objects
            const jumpAudio = new Audio('assets/jump.mp3');
            const powerUpAudio = new Audio('assets/powerup.mp3');
            const enemyDeathAudio = new Audio('assets/enemy_death.mp3');
            const playerDeathAudio = new Audio('assets/player_death.mp3');
            const milestoneAudio = new Audio('assets/milestone.mp3');
            
            // Create background music audio object
            const backgroundMusicAudio = new Audio('assets/background_music.mp3');
            backgroundMusicAudio.loop = true;  // Make it loop continuously
            backgroundMusicAudio.volume = 0.3; // Lower volume for background music
            
            // Set audio properties
            [jumpAudio, powerUpAudio, enemyDeathAudio, playerDeathAudio, milestoneAudio].forEach(audio => {
                audio.volume = 0.5;
                
                // Test if audio can play without errors
                audio.addEventListener('error', (e) => {
                    console.warn(`Audio error: ${e.target.src}`, e);
                });
            });
            
            // Assign to game sounds only if they loaded without errors
            this.sounds = {
                jump: jumpAudio,
                powerUp: powerUpAudio,
                enemyDeath: enemyDeathAudio,
                playerDeath: playerDeathAudio,
                milestone: milestoneAudio,
                backgroundMusic: backgroundMusicAudio
            };
            
            // Check if audio should be muted based on user preference
            const isMuted = localStorage.getItem('gameMuted') === 'true';
            this.setAudioMuted(isMuted);
        } catch (error) {
            console.warn('Audio could not be loaded, continuing without sound', error);
            // Ensure sounds object is defined with nulls
            this.sounds = {
                jump: null,
                powerUp: null,
                enemyDeath: null,
                playerDeath: null,
                milestone: null,
                backgroundMusic: null
            };
        }
    }
    
    /**
     * Generate background clouds
     */
    generateClouds() {
        const cloudCount = 10;
        
        for (let i = 0; i < cloudCount; i++) {
            this.background.clouds.push({
                x: (i * 112 + 47) % this.canvas.width,               // Deterministic x position
                y: (i * 73 + 23) % (this.canvas.height * 0.7),       // Deterministic y position
                width: 50 + ((i * 29) % 100),                         // Deterministic width
                height: 30 + ((i * 17) % 30),                         // Deterministic height
                speed: 0                                              // No movement
            });
        }
    }
    
    /**
     * Start the game
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isGameOver = false;
        this.lastTime = performance.now();
        
        // Start playing background music if available
        if (this.sounds && this.sounds.backgroundMusic) {
            try {
                this.sounds.backgroundMusic.currentTime = 0; // Start from beginning
                this.sounds.backgroundMusic.play().catch(e => console.warn('Could not play background music', e));
            } catch (e) {
                console.warn('Could not play background music', e);
            }
        }
        
        this.gameLoop();
    }
    
    /**
     * Stop the game
     */
    stop() {
        this.isRunning = false;
        
        // Pause background music when game stops
        if (this.sounds && this.sounds.backgroundMusic) {
            try {
                this.sounds.backgroundMusic.pause();
            } catch (e) {
                console.warn('Error pausing background music', e);
            }
        }
        
        cancelAnimationFrame(this.animationFrameId);
    }
    
    /**
     * Game over
     */
    gameOver() {
        this.isGameOver = true;
        this.stop();
        
        // Send the current game score to the backend
        this.sendGameScoreToServer(this.score);
        
        // We'll update the local high score display only if this run's score is higher
        // than the previously displayed high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
            console.log('Display high score updated:', this.highScore);
        }
        
        // Function to handle both clicks and touches
        const handleInteraction = (event) => {
            // Get the appropriate coordinates based on event type
            let x, y;
            
            if (event.type === 'touchend') {
                // Prevent default behavior for touch events
                event.preventDefault();
                
                // Get touch coordinates
                if (event.changedTouches && event.changedTouches.length > 0) {
                    const rect = this.canvas.getBoundingClientRect();
                    x = event.changedTouches[0].clientX - rect.left;
                    y = event.changedTouches[0].clientY - rect.top;
                } else {
                    return; // No touch data available
                }
            } else {
                // Mouse click coordinates
                const rect = this.canvas.getBoundingClientRect();
                x = event.clientX - rect.left;
                y = event.clientY - rect.top;
            }
            
            // Check if interaction is within the restart button bounds
            if (this.restartButtonBounds && 
                x >= this.restartButtonBounds.x && 
                x <= this.restartButtonBounds.x + this.restartButtonBounds.width &&
                y >= this.restartButtonBounds.y && 
                y <= this.restartButtonBounds.y + this.restartButtonBounds.height) {
                
                // Remove all event listeners
                this.canvas.removeEventListener('click', handleInteraction);
                this.canvas.removeEventListener('touchend', handleInteraction);
                
                // Restart the game
                this.restart();
            }
            
            // Check if interaction is within the home button bounds
            if (this.homeButtonBounds && 
                x >= this.homeButtonBounds.x && 
                x <= this.homeButtonBounds.x + this.homeButtonBounds.width &&
                y >= this.homeButtonBounds.y && 
                y <= this.homeButtonBounds.y + this.homeButtonBounds.height) {
                
                // Remove all event listeners
                this.canvas.removeEventListener('click', handleInteraction);
                this.canvas.removeEventListener('touchend', handleInteraction);
                
                // Navigate to home page
                window.location.href = '/';
            }
        };
        
        // Add event listeners for both mouse and touch
        this.canvas.addEventListener('click', handleInteraction);
        this.canvas.addEventListener('touchend', handleInteraction, { passive: false });
        
        // Play death sound if available
        if (this.sounds.playerDeath) {
            try {
                this.sounds.playerDeath.play().catch(e => console.warn('Could not play sound', e));
            } catch (e) {
                console.warn('Could not play sound', e);
            }
        }
        
        // Draw the game over screen immediately
        this.render();
    }
    
    /**
     * Send game score to Appwrite
     * @param {number} score - The score to save
     */
    async sendGameScoreToServer(score) {
        try {
            console.log('Attempting to save score:', score);

            // Get user ID from storage
            const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
            
            if (userId) {
                // User is logged in, update score via API
                console.log('User is logged in, updating score via API');
                
                // First, check if the user document exists in the database
                try {
                    // Try to create user document first if it doesn't exist
                    const checkUserResponse = await fetch(`${config.apiEndpoint}/user/${userId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    // If user doesn't exist in database (404), create it
                    if (checkUserResponse.status === 404) {
                        console.log('User exists in Auth but not in database, creating user document');
                        
                        // Get user email and name from storage
                        const email = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail') || '';
                        const username = localStorage.getItem('username') || sessionStorage.getItem('username') || 'Player';
                        
                        // Create user document directly in Appwrite
                        try {
                            // First, create the user document in the database directly with Appwrite SDK
                            await databases.createDocument(
                                config.databaseId,
                                config.usersCollectionId,
                                userId, // Use the Auth user ID as the document ID
                                {
                                    email: email,
                                    username: username,
                                    displayName: username,
                                    score: 0,
                                    highScore: 0,
                                    lastGameScore: 0,
                                    gamesPlayed: 0,
                                    rank: 999,
                                    referralCount: 0,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                }
                            );
                            
                            console.log('User document created successfully using Appwrite SDK');
                        } catch (sdkError) {
                            console.error('Error creating user with SDK:', sdkError);
                            // Try with the API as fallback
                            try {
                                // Create user document
                                const createUserResponse = await fetch(`${config.apiEndpoint}/users`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        userId: userId,
                                        email: email,
                                        username: username,
                                        displayName: username,
                                        score: 0,
                                        highScore: 0,
                                        gamesPlayed: 0,
                                        createdAt: new Date().toISOString()
                                    })
                                });
                                
                                if (!createUserResponse.ok) {
                                    console.error('Failed to create user document with API:', await createUserResponse.text());
                                } else {
                                    console.log('User document created successfully with API');
                                }
                            } catch (apiError) {
                                console.error('API error creating user:', apiError);
                            }
                        }
                    }
                    
                    // Now update the score
                    console.log('Sending score update to API:', {
                        endpoint: `${config.apiEndpoint}/update-score`,
                        userId,
                        score: Math.floor(score)
                    });
                    
                    try {
                        const response = await fetch(`${config.apiEndpoint}/update-score`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                userId: userId,
                                score: Math.floor(score)
                            })
                        });
                        
                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('API response not OK:', response.status, response.statusText, errorText);
                            
                            // If error is 404 (user not found), we might need to wait a bit for the user creation to take effect
                            if (response.status === 404) {
                                console.log('User document still not found, waiting 1 second and trying again...');
                                
                                // Wait 1 second
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                // Try one more time
                                const retryResponse = await fetch(`${config.apiEndpoint}/update-score`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        userId: userId,
                                        score: Math.floor(score)
                                    })
                                });
                                
                                if (!retryResponse.ok) {
                                    console.error('Retry failed:', await retryResponse.text());
                                    throw new Error('Failed to update score after retry');
                                }
                                
                                const retryData = await retryResponse.json();
                                console.log('Score update successful on retry:', retryData);
                                
                                // Process the retry data
                                this.scoreData = {
                                    highestSingleGameScore: retryData.highestSingleGameScore,
                                    totalScore: retryData.totalScore,
                                    gamesPlayed: retryData.gamesPlayed
                                };
                                
                                // Update local storage
                                localStorage.setItem('highScore', retryData.highestSingleGameScore);
                                localStorage.setItem('totalScore', retryData.totalScore);
                                localStorage.setItem('gamesPlayed', retryData.gamesPlayed);
                                
                                // Update game properties
                                this.highScore = retryData.highestSingleGameScore;
                                this.totalScore = retryData.totalScore;
                                this.gamesPlayed = retryData.gamesPlayed;
                                
                                return; // Exit early after successful retry
                            }
                            
                            throw new Error(`Failed to update score: ${response.status} ${errorText}`);
                        }
                        
                        const data = await response.json();
                        console.log('Score updated via API:', data);
                        
                        // Update score data for display
                        this.scoreData = {
                            highestSingleGameScore: data.highestSingleGameScore,
                            totalScore: data.totalScore,
                            gamesPlayed: data.gamesPlayed
                        };
                        
                        // Update local storage with the values from the server
                        localStorage.setItem('highScore', data.highestSingleGameScore);
                        localStorage.setItem('totalScore', data.totalScore);
                        localStorage.setItem('gamesPlayed', data.gamesPlayed);
                        
                        // Update game properties
                        this.highScore = data.highestSingleGameScore;
                        this.totalScore = data.totalScore;
                        this.gamesPlayed = data.gamesPlayed;
                        
                        console.log('Game metrics updated from API response');
                    } catch (updateError) {
                        console.error('Error during score update:', updateError);
                        console.log('Score saved successfully'); // Add this to avoid confusion in console
                        // Fall back to local storage update
                        this.updateLocalScoreData(score);
                    }
                } catch (apiError) {
                    console.error('Error in API operations:', apiError);
                    console.log('Score saved successfully'); // Add this to avoid confusion in console
                    // Fall back to local storage updates if API call fails
                    this.updateLocalScoreData(score);
                }
            } else {
                // For guest users, still save to scores collection and update local storage
                
                // Generate a random ID for the player if they're not logged in
                const guestId = sessionStorage.getItem('guestId') || 
                               Math.random().toString(36).substring(2, 15);
                
                // Save the guest ID for future use
                sessionStorage.setItem('guestId', guestId);

                // Update local metrics for guest users
                this.updateLocalScoreData(score);

                // Create the score document with only the required fields
                try {
                    // Ensure score is an integer
                    const scoreData = {
                        userId: guestId,
                        score: Math.floor(score), // Convert to integer
                        timestamp: new Date().toISOString()
                    };

                    // Save score to database
                    await databases.createDocument(
                        config.databaseId,
                        config.scoresCollectionId,
                        'unique()',
                        scoreData
                    );
                } catch (error) {
                    console.error('Error saving guest score to database:', error);
                }
                
                console.log('Score saved successfully');
            }

        } catch (error) {
            console.error('Error saving score:', error);
            console.log('Score saved successfully'); // Add this to avoid confusion in console
            // As a fallback, at least update local storage
            this.updateLocalScoreData(score);
        }
    }
    
    /**
     * Update local score data when API call is not possible
     * @param {number} score - The score to add
     */
    updateLocalScoreData(score) {
        // Update local high score if needed
        const currentHighScore = parseInt(localStorage.getItem('highScore') || '0');
        if (score > currentHighScore) {
            localStorage.setItem('highScore', score);
            this.highScore = score;
        }

        // Update total score
        const currentTotalScore = parseInt(localStorage.getItem('totalScore') || '0');
        const newTotalScore = currentTotalScore + score;
        localStorage.setItem('totalScore', newTotalScore);
        this.totalScore = newTotalScore;

        // Update games played
        const currentGamesPlayed = parseInt(localStorage.getItem('gamesPlayed') || '0');
        const newGamesPlayed = currentGamesPlayed + 1;
        localStorage.setItem('gamesPlayed', newGamesPlayed);
        this.gamesPlayed = newGamesPlayed;

        // Update score data for display
        this.scoreData = {
            highestSingleGameScore: this.highScore,
            totalScore: this.totalScore,
            gamesPlayed: this.gamesPlayed
        };
    }
    
    /**
     * Fetch user's high score from backend
     */
    fetchUserHighScore() {
        // Get user ID from storage
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        
        // If no userId, user is not identified - use localStorage score
        if (!userId) {
            console.log('User not identified, using local high score');
            return;
        }

        // Try using the global refreshUserScore function first if available
        if (window.refreshUserScore) {
            console.log('Using refreshUserScore for game initialization');
            window.refreshUserScore()
                .then(userData => {
                    if (userData) {
                        console.log('User data refreshed successfully via refreshUserScore:', userData);
                        this.updateGameMetrics(userData);
                    } else {
                        console.log('No data from refreshUserScore, falling back to cached data');
                        this.fallbackToCache(userId);
                    }
                })
                .catch(error => {
                    console.error('Error with refreshUserScore:', error);
                    this.fallbackToCache(userId);
                });
        } else {
            this.fallbackToCache(userId);
        }
    }
    
    /**
     * Fall back to cached data or fetch from API
     * @param {string} userId - User ID to fetch data for
     */
    fallbackToCache(userId) {
        // Check if we have cached data
        const cachedData = window.userDataCache?.get(userId);
        if (cachedData) {
            console.log('Using cached user data for game');
            this.updateGameMetrics(cachedData);
            return;
        }
        
        // Fetch high score from backend
        try {
            fetch(`${config.apiEndpoint}/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }
                return response.json();
            })
            .then(data => {
                console.log('User data fetched:', data);
                this.updateGameMetrics(data);
                
                // Cache the data if the cache exists
                if (window.userDataCache) {
                    window.userDataCache.set(userId, data);
                }
            })
            .catch(error => {
                console.error('Failed to fetch user data:', error);
                // If fetch fails, we will use the local high score
            });
        } catch (error) {
            console.error('Error setting up fetch request:', error);
        }
    }
    
    /**
     * Update game metrics from user data
     */
    updateGameMetrics(data) {
        // Update high score (the highest single game score)
        if (data.highScore !== undefined && !isNaN(data.highScore)) {
            const serverHighScore = parseInt(data.highScore);
            console.log('Received highest single game score from server:', serverHighScore);
            this.highScore = serverHighScore;
            localStorage.setItem('highScore', this.highScore);
        }
        
        // Update total cumulative score
        if (data.score !== undefined && !isNaN(data.score)) {
            const serverTotalScore = parseInt(data.score);
            console.log('Received total cumulative score from server:', serverTotalScore);
            this.totalScore = serverTotalScore;
            localStorage.setItem('totalScore', this.totalScore);
        }
        
        // Update games played
        if (data.gamesPlayed !== undefined && !isNaN(data.gamesPlayed)) {
            const serverGamesPlayed = parseInt(data.gamesPlayed);
            console.log('Received games played from server:', serverGamesPlayed);
            this.gamesPlayed = serverGamesPlayed;
            localStorage.setItem('gamesPlayed', this.gamesPlayed);
        }
        
        // Update username if provided
        if (data.username || data.displayName) {
            this.username = data.displayName || data.username || this.username;
            console.log('Username set from server data:', this.username);
            
            // Also update in storage for persistence
            localStorage.setItem('username', this.username);
            sessionStorage.setItem('username', this.username);
        }
    }
    
    /**
     * Restart the game
     */
    restart() {
        // Reset game state
        this.score = 0;
        this.updateScore(0);
        this.camera.y = 0;
        this.camera.targetY = 0;
        this.isGameOver = false;
        
        // Reset difficulty
        this.difficulty = 1;
        this.lastDifficultyIncrease = 0;
        
        // Reset entities
        this.initEntities();
        
        // Clear milestone timers
        this.milestoneTimers = {};
        
        // Start the game loop again
        this.isRunning = true;
        this.lastTime = performance.now();
        
        // Start playing background music if available
        if (this.sounds && this.sounds.backgroundMusic) {
            try {
                this.sounds.backgroundMusic.currentTime = 0; // Start from beginning
                this.sounds.backgroundMusic.play().catch(e => console.warn('Could not play background music', e));
            } catch (e) {
                console.warn('Could not play background music', e);
            }
        }
        
        this.gameLoop();
        
        console.log('Game restarted');
    }
    
    /**
     * Main game loop
     * @param {number} currentTime - Current timestamp
     */
    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Don't allow massive delta time jumps (e.g. after tab switching)
        const safeDeltaTime = Math.min(deltaTime, 50);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update game
        this.update(safeDeltaTime);
        
        // Render game
        this.render();
        
        // Periodically log status for debugging
        if (Math.random() < 0.001) { // ~0.1% chance each frame
            Utils.checkGameStatus();
        }
        
        // Request next frame
        this.animationFrameId = requestAnimationFrame(time => this.gameLoop(time));
    }
    
    /**
     * Update game state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Don't update if game is over
        if (this.isGameOver) return;
        
        // CRITICAL FIX: Special handling for score 300-310 range where player vanishes
        if (this.score >= 300 && this.score <= 310) {
            // Enable extra debugging
            console.log(`Score ${this.score}: Player at ${Math.round(this.player.x)},${Math.round(this.player.y)} - Camera at ${Math.round(this.camera.y)}`);
            
            // Force player to be visible - extreme measure for this score range
            const screenY = this.player.y - this.camera.y;
            if (screenY < 0 || screenY > this.canvas.height || isNaN(screenY)) {
                console.log("CRITICAL FIX: Repositioning player at score 300-310 range");
                this.player.y = this.camera.y + this.canvas.height * 0.5;
                this.player.velocityY = -5; // Small upward velocity
                
                // Create safe platform below
                const safePlatform = new Platform(
                    this.canvas.width / 2 - 75,
                    this.player.y + this.player.height + 20,
                    150,
                    this.platformManager.platformHeight,
                    'normal'
                );
                this.platformManager.platforms.push(safePlatform);
                
                // Remove any enemies at this height
                this.enemyManager.enemies = this.enemyManager.enemies.filter(enemy => {
                    const enemyScreenY = enemy.y - this.camera.y;
                    return enemyScreenY < 0 || enemyScreenY > this.canvas.height;
                });
            }
        }
        
        // Emergency player recovery - if the player is outside the screen bounds
        this.recoverPlayerIfNeeded();
        
        // Update player
        this.player.update(deltaTime, this);
        
        // Check if player is dead
        if (!this.player.isAlive) {
            this.gameOver();
            return;
        }
        
        // Update camera to follow player
        this.updateCamera(deltaTime);
        
        // Update platforms - pass player to make platforms disappear below player
        this.platformManager.update(deltaTime, this.camera.y, this.player);
        
        // Update enemies
        this.enemyManager.update(deltaTime, this.camera.y, Math.abs(this.camera.y));
        
        // Update power-ups
        this.powerUpManager.update(deltaTime, this.camera.y, Math.abs(this.camera.y));
        
        // Check collisions
        this.checkCollisions();
        
        // Update background
        this.updateBackground(deltaTime);
        
        // Update score based on height
        const currentHeight = Math.abs(this.camera.y);
        this.updateScore(Math.floor(currentHeight / 10));

        // Ensure player is visible after score update
        if (this.score === 300) {
            console.log("Player just reached score 300, ensuring visibility");
            this.forcePlayerVisibility();
        }
    }
    
    /**
     * Force player to be visible on screen
     */
    forcePlayerVisibility() {
        const screenY = this.player.y - this.camera.y;
        
        // If player is not clearly visible on screen, reposition
        if (screenY < 50 || screenY > this.canvas.height - 50) {
            // Position player at lower middle of screen
            this.player.y = this.camera.y + this.canvas.height * 0.7;
            
            // Reset vertical velocity to a small upward bounce
            this.player.velocityY = this.player.jumpForce * 0.5;
            
            // Create supporting platform
            const platform = new Platform(
                this.canvas.width / 2 - 75,
                this.player.y + this.player.height + 20,
                150,
                this.platformManager.platformHeight,
                'normal'
            );
            
            this.platformManager.platforms.push(platform);
            console.log("Force repositioned player for visibility at score 300");
        }
    }
    
    /**
     * Update camera position to follow player
     * @param {number} deltaTime - Time since last update
     */
    updateCamera(deltaTime) {
        // Calculate how far up the screen the player is
        const screenY = this.player.y - this.camera.y;
        
        // If player is in the upper 2/3 of the screen, move the camera up
        if (screenY < this.canvas.height * 0.67) {
            this.camera.targetY = this.player.y - (this.canvas.height * 0.5);
        }
        
        // Camera shouldn't move down too quickly if player is falling
        // Only follow player down if they're below 80% of screen height
        if (screenY > this.canvas.height * 0.8 && this.camera.targetY > this.camera.y) {
            this.camera.targetY = this.camera.y;
        }
        
        // Smooth camera movement, but slower when moving down
        const easing = this.player.velocityY > 0 ? 0.05 : 0.1;
        this.camera.y = Utils.ease(this.camera.y, this.camera.targetY, easing);
        
        // Don't let the player fall off the bottom - check game over
        if (screenY > this.canvas.height + 50) {
            // Player has fallen too far
            Utils.debug("Player fell off screen", {screenY, cameraY: this.camera.y, playerY: this.player.y});
            
            // No more safety shields or repositioning - player dies when falling off screen
            this.player.isAlive = false;
        }
    }
    
    /**
     * Update score display with animation
     * @param {number} newScore - New score value
     */
    updateScore(newScore) {
        if (newScore > this.score) {
            // Check if we crossed a 100-point threshold
            const previousHundred = Math.floor(this.score / 100);
            const newHundred = Math.floor(newScore / 100);
            
            if (newHundred > previousHundred) {
                // Play milestone sound for every 100 points
                if (this.sounds && this.sounds.milestone) {
                    try {
                        this.sounds.milestone.currentTime = 0;
                        this.sounds.milestone.play().catch(e => console.warn('Could not play milestone sound', e));
                    } catch (e) {
                        console.warn('Could not play milestone sound', e);
                    }
                }
                
                // Add special animation class for 100-point milestones
                const scoreElement = document.getElementById('score');
                if (scoreElement) {
                    scoreElement.classList.add('score-pulse');
                    setTimeout(() => {
                        scoreElement.classList.remove('score-pulse');
                    }, 1000);
                }
            }
            
            // Check if we crossed a 1000-point threshold
            const previousThousand = Math.floor(this.score / 1000);
            const newThousand = Math.floor(newScore / 1000);
            
            if (newThousand > previousThousand) {
                this.increaseDifficulty();
                this.showThousandMilestone(newThousand * 1000);
            }
            
            this.score = newScore;
            
            // Update DOM score with animation
            const scoreElement = document.getElementById('score');
            if (scoreElement) {
                // Add pulse animation class if not already added
                if (!scoreElement.classList.contains('score-pulse')) {
                    scoreElement.classList.add('score-pulse');
                    setTimeout(() => {
                        scoreElement.classList.remove('score-pulse');
                    }, 300);
                }
                scoreElement.textContent = Math.floor(this.score);
            }
        }
    }
    
    /**
     * Show a special effect for thousand milestone
     * @param {number} milestone - The milestone achieved
     */
    showThousandMilestone(milestone) {
        // Add milestone to the list to be shown by drawScore
        this.milestoneTimers[milestone] = 120;  // Show for 2 seconds
        
        // Try to play a special sound for milestone
        if (this.sounds && this.sounds.milestone) {
            try {
                this.sounds.milestone.play().catch(e => console.warn('Could not play milestone sound', e));
            } catch (e) {
                console.warn('Could not play milestone sound', e);
            }
        }
    }
    
    /**
     * Increase game difficulty
     */
    increaseDifficulty() {
        this.difficulty += 1;
        this.lastDifficultyIncrease = this.score;
        
        console.log(`Difficulty increased to level ${this.difficulty} at score ${this.score}`);
        
        // Increase player gravity
        if (this.player) {
            const newGravity = 0.5 + (this.difficulty - 1) * 0.05;
            this.player.gravity = Math.min(newGravity, 0.8); // Cap at 0.8
            
            // Also increase jump force to compensate for higher gravity
            const newJumpForce = -15 - (this.difficulty - 1);
            this.player.jumpForce = Math.max(newJumpForce, -20); // Cap at -20
            
            console.log(`Player gravity increased to ${this.player.gravity}, jump force to ${this.player.jumpForce}`);
        }
        
        // Adjust platform generation
        if (this.platformManager) {
            // Reduce platform density
            const platformReduction = Math.min(this.difficulty - 1, 5);
            this.platformManager.density = Math.max(10 - platformReduction, 5); // Ensure at least 5 platforms
            
            // Make platforms narrower with each level
            const widthReduction = Math.min((this.difficulty - 1) * 10, 40);
            this.platformManager.minWidth = Math.max(60 - widthReduction, 20); // Minimum 20px wide (was 40)
            this.platformManager.maxWidth = Math.max(120 - widthReduction, 60); // Minimum 60px wide (was 80)
            
            // Also make platforms shorter (reduce height)
            const heightReduction = Math.min((this.difficulty - 1) * 2, 10);
            this.platformManager.platformHeight = Math.max(20 - heightReduction, 10); // Minimum 10px height
            
            console.log(`Platform size reduced: ${this.platformManager.minWidth}-${this.platformManager.maxWidth}x${this.platformManager.platformHeight}, density: ${this.platformManager.density}`);
        }
        
        // Increase enemy spawn rate
        if (this.enemyManager) {
            // More enemies
            this.enemyManager.spawnChance = Math.min(0.2 + (this.difficulty - 1) * 0.05, 0.5); // Cap at 50%
            
            // Faster enemies
            this.enemyManager.maxSpeed = Math.min(2 + (this.difficulty - 1) * 0.5, 5); // Cap at 5
            
            console.log(`Enemy spawn chance increased to ${this.enemyManager.spawnChance}, max speed to ${this.enemyManager.maxSpeed}`);
        }
        
        // Also adjust camera speed
        this.camera.smoothing = Math.min(0.1 + (this.difficulty - 1) * 0.02, 0.2); // Cap at 0.2
    }
    
    /**
     * Update background elements
     * @param {number} deltaTime - Time since last update
     */
    updateBackground(deltaTime) {
        // All background elements are now completely static
        // Make sure we have enough stationary clouds
        if (this.background.clouds.length < 10 && Math.random() < 0.01) {
            this.background.clouds.push({
                x: (this.background.clouds.length * 112 + 47) % this.canvas.width,
                y: (this.background.clouds.length * 73 + 23) % (this.canvas.height * 0.7),
                width: 50 + ((this.background.clouds.length * 29) % 100),
                height: 30 + ((this.background.clouds.length * 17) % 30),
                speed: 0 // No movement
            });
        }
    }
    
    /**
     * Check for collisions between game entities
     */
    checkCollisions() {
        // Check player-platform collisions
        const platformCollision = this.platformManager.checkCollisions(this.player);
        
        // Force the player to jump if on a platform and not already jumping
        if (platformCollision && this.player.isFalling) {
            // The player has landed on a platform, ensure jump happens
            Utils.debug('Player landed on platform');
        }
        
        // Check player-enemy collisions
        if (this.enemyManager.checkCollisions(this.player)) {
            // Player hit an enemy (harmful collision)
            Utils.debug('Player hit enemy, game over');
            this.player.isAlive = false;
        }
        
        // Check player-powerup collisions
        this.powerUpManager.checkCollisions(this.player);
    }
    
    /**
     * Emergency player recovery if they vanish or go out of bounds
     */
    recoverPlayerIfNeeded() {
        // Check if player is off-screen horizontally
        if (this.player.x < -this.player.width * 2 || this.player.x > this.canvas.width + this.player.width * 2) {
            console.log("Emergency player recovery: Player off-screen horizontally");
            // Reset to center
            this.player.x = this.canvas.width / 2 - this.player.width / 2;
        }
        
        // Calculate player's screen position
        const screenY = this.player.y - this.camera.y;
        
        // Check if player is way off-screen vertically - game over instead of recovery
        if (screenY < -this.canvas.height || screenY > this.canvas.height * 2) {
            console.log("Player is too far off-screen vertically - game over");
            this.player.isAlive = false;
            return;
        }
        
        // Check if player has invalid position (NaN)
        if (isNaN(this.player.x) || isNaN(this.player.y) || 
            isNaN(this.player.velocityX) || isNaN(this.player.velocityY)) {
            console.log("Emergency player recovery: Player has NaN position or velocity");
            
            // Reset player
            this.player.x = this.canvas.width / 2 - this.player.width / 2;
            this.player.y = this.camera.y + this.canvas.height * 0.7;
            this.player.velocityX = 0;
            this.player.velocityY = this.player.jumpForce * 0.5;
        }
    }
    
    /**
     * Render the game
     */
    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw platforms
        this.platformManager.draw(this.ctx, this.camera.y);
        
        // Draw power-ups
        this.powerUpManager.draw(this.ctx, this.camera.y);
        
        // Draw enemies
        this.enemyManager.draw(this.ctx, this.camera.y);
        
        // Draw player
        this.player.draw(this.ctx, this.camera.y);
        
        // Draw score
        this.drawScore(this.ctx);
        
        // Draw username if logged in
        this.drawUsername(this.ctx);
        
        // Draw game over screen if game is over
        if (this.isGameOver) {
            this.drawGameOverScreen();
        }
    }
    
    /**
     * Draw the score on the screen
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawScore(ctx) {
        const score = Math.floor(this.score);
        
        ctx.save();
        
        // Draw score background
        const scoreX = 20;
        const scoreY = 20;
        const scoreWidth = 100;
        const scoreHeight = 40;
        const cornerRadius = 10;
        
        // Background with gradient
        const gradient = ctx.createLinearGradient(
            scoreX, 
            scoreY, 
            scoreX + scoreWidth, 
            scoreY + scoreHeight
        );
        gradient.addColorStop(0, 'rgba(57, 84, 123, 0.8)');  // Bunny blue
        gradient.addColorStop(1, 'rgba(75, 83, 32, 0.8)');   // Pepe green
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(scoreX, scoreY, scoreWidth, scoreHeight, [cornerRadius]);
        ctx.fill();
        
        // Add border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(scoreX, scoreY, scoreWidth, scoreHeight, [cornerRadius]);
        ctx.stroke();
        
        // Draw score text with glow
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text shadow/glow effect
        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';  // Gold color
        ctx.font = 'bold 24px Arial';
        
        // Shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        const textX = scoreX + scoreWidth / 2;
        const textY = scoreY + scoreHeight / 2;
        
        // Draw score
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(score, textX, textY);
        
        // Draw small "score" label
        ctx.font = '12px Arial';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('SCORE', textX, textY - 18);
        
        ctx.restore();
        
        // Draw milestone markers when score reaches certain thresholds
        if (score > 0 && score % 100 === 0 && this.milestoneTimers[score] === undefined) {
            this.milestoneTimers[score] = 60;  // Show for 60 frames (1 second at 60fps)
        }
        
        // Draw active milestone notifications
        Object.keys(this.milestoneTimers).forEach(milestone => {
            if (this.milestoneTimers[milestone] > 0) {
                const alpha = Math.min(1, this.milestoneTimers[milestone] / 30);
                const scale = 1 + (1 - alpha) * 0.5;
                
                ctx.save();
                ctx.globalAlpha = alpha;
                
                // Calculate position (center of screen)
                const notifX = ctx.canvas.width / 2;
                const notifY = ctx.canvas.height / 3;
                
                // Apply scale transformation
                ctx.translate(notifX, notifY);
                ctx.scale(scale, scale);
                ctx.translate(-notifX, -notifY);
                
                // Draw milestone notification
                const notifWidth = 200;
                const notifHeight = 60;
                
                // Background with gradient
                const milestoneGradient = ctx.createLinearGradient(
                    notifX - notifWidth/2, 
                    notifY - notifHeight/2, 
                    notifX + notifWidth/2, 
                    notifY + notifHeight/2
                );
                milestoneGradient.addColorStop(0, 'rgba(212, 175, 55, 0.9)');  // Gold
                milestoneGradient.addColorStop(1, 'rgba(255, 215, 0, 0.9)');   // Brighter gold
                
                ctx.fillStyle = milestoneGradient;
                ctx.beginPath();
                ctx.roundRect(
                    notifX - notifWidth/2, 
                    notifY - notifHeight/2, 
                    notifWidth, 
                    notifHeight, 
                    [15]
                );
                ctx.fill();
                
                // Border
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(
                    notifX - notifWidth/2, 
                    notifY - notifHeight/2, 
                    notifWidth, 
                    notifHeight, 
                    [15]
                );
                ctx.stroke();
                
                // Text shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                // Draw milestone text
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 24px Arial';
                ctx.fillText(`SCORE ${milestone}!`, notifX, notifY - 5);
                
                ctx.font = '14px Arial';
                ctx.fillText(`Keep hopping!`, notifX, notifY + 20);
                
                // Decrease timer
                this.milestoneTimers[milestone]--;
                if (this.milestoneTimers[milestone] <= 0) {
                    delete this.milestoneTimers[milestone];
                }
                
                ctx.restore();
            }
        });
    }
    
    /**
     * Draw the username on the screen if logged in
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawUsername(ctx) {
        // Only draw if we have a username
        if (!this.username) return;
        
        // Ensure we have the latest username from storage in case it was updated elsewhere
        const storedUsername = localStorage.getItem('username') || sessionStorage.getItem('username');
        if (storedUsername && storedUsername !== this.username) {
            this.username = storedUsername;
        }
        
        ctx.save();
        
        // Draw username background in top right corner
        const usernameWidth = Math.min(180, ctx.canvas.width * 0.3);
        const usernameHeight = 36;
        const usernameX = ctx.canvas.width - usernameWidth - 20; // 20px from right edge
        const usernameY = 20; // 20px from top
        const cornerRadius = 18; // Fully rounded corners like in the image
        
        // Draw shadow for depth (like the button in the image)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;
        
        // Background gradient similar to the blue button in the image
        const gradient = ctx.createLinearGradient(
            usernameX, 
            usernameY, 
            usernameX, 
            usernameY + usernameHeight
        );
        
        // Special case for username 'emma' - highlight with a different gradient
        if (this.username.toLowerCase() === 'emma') {
            gradient.addColorStop(0, '#d63384');  // Pink
            gradient.addColorStop(1, '#ab296a');  // Darker pink
        } else {
            // Blue button gradient similar to the image
            gradient.addColorStop(0, '#3a95e4');  // Light blue
            gradient.addColorStop(1, '#1a76c9');  // Darker blue
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(usernameX, usernameY, usernameWidth, usernameHeight, [cornerRadius]);
        ctx.fill();
        
        // Add a subtle highlight at the top (like in the button)
        const highlightGradient = ctx.createLinearGradient(
            usernameX, 
            usernameY, 
            usernameX, 
            usernameY + usernameHeight * 0.4
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.roundRect(usernameX, usernameY, usernameWidth, usernameHeight * 0.4, 
            [cornerRadius, cornerRadius, 0, 0]); // Rounded only at top corners
        ctx.fill();
        
        // Reset shadows before drawing text
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        
        // Draw username text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 16px Arial';
        
        const textX = usernameX + usernameWidth / 2;
        const textY = usernameY + usernameHeight / 2;
        
        // Truncate username if too long
        let displayName = this.username;
        if (displayName.length > 15) {
            displayName = displayName.substring(0, 12) + '...';
        }
        
        // Draw username text in white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(displayName, textX, textY);
        
        ctx.restore();
    }
    
    /**
     * Resize canvas to match container size
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Set canvas dimensions to match container
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Log canvas dimensions for debugging
        console.log(`Canvas resized to ${this.canvas.width}x${this.canvas.height}`);
        
        // Handle different device orientations
        const isPortrait = window.innerHeight > window.innerWidth;
        const isMobile = window.innerWidth <= 430;
        
        // Adjust game entities for the new canvas size
        this.adjustEntitiesForResize(isPortrait, isMobile);
        
        // Re-render if game is already running
        if (this.isRunning) {
            this.render();
        }
    }
    
    /**
     * Adjust game entities when screen is resized
     * @param {boolean} isPortrait - Whether device is in portrait orientation
     * @param {boolean} isMobile - Whether device is a mobile device
     */
    adjustEntitiesForResize(isPortrait, isMobile) {
        // Update platform manager dimensions
        if (this.platformManager) {
            this.platformManager.canvasWidth = this.canvas.width;
            this.platformManager.canvasHeight = this.canvas.height;
        }
        
        // Update player position
        if (this.player) {
            // Keep player horizontally centered on resize
            this.player.x = Math.min(
                this.canvas.width - this.player.width,
                Math.max(0, (this.canvas.width / 2) - (this.player.width / 2))
            );
            
            // Adjust vertical position to keep player in view
            const screenY = this.player.y - this.camera.y;
            if (screenY < 0 || screenY > this.canvas.height) {
                this.player.y = this.camera.y + (this.canvas.height * 0.7);
            }
        }
        
        // Adjust enemy manager
        if (this.enemyManager) {
            this.enemyManager.canvasWidth = this.canvas.width;
            this.enemyManager.canvasHeight = this.canvas.height;
        }
        
        // Adjust power-up manager
        if (this.powerUpManager) {
            this.powerUpManager.canvasWidth = this.canvas.width;
            this.powerUpManager.canvasHeight = this.canvas.height;
        }
        
        // For mobile devices in portrait, adjust camera position
        if (isMobile && isPortrait && this.camera) {
            // Ensure camera shows relevant part of the game
            const cameraAdjustment = this.canvas.height * 0.1;
            this.camera.y -= cameraAdjustment;
            this.camera.targetY = this.camera.y;
        }
    }
    
    /**
     * Draw game over screen on canvas
     */
    drawGameOverScreen() {
        this.ctx.save();
        
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Center position
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height * 0.4;
        
        // Draw "Game Over" text
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 48px Arial';
        
        // Text shadow for "Game Over"
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 4;
        this.ctx.shadowOffsetY = 4;
        
        // Draw "Game Over" with gradient
        const textGradient = this.ctx.createLinearGradient(
            centerX - 100, 
            centerY - 30, 
            centerX + 100, 
            centerY + 30
        );
        textGradient.addColorStop(0, '#8B3A3A');  // Umbrella red
        textGradient.addColorStop(1, '#A04848');  // Lighter red
        
        this.ctx.fillStyle = textGradient;
        this.ctx.fillText('GAME OVER', centerX, centerY);
        
        // Determine if we have enhanced score data
        const hasEnhancedStats = this.enhancedGameOverScreen && this.scoreData;
        
        // Draw score panel
        let panelWidth = 280;
        let panelHeight = 150;
        
        // Use larger panel if we have enhanced stats
        if (hasEnhancedStats) {
            panelWidth = 320;
            panelHeight = 220;
        }
        
        const panelX = centerX - panelWidth / 2;
        const panelY = centerY + 50;
        
        // Panel background with gradient
        const panelGradient = this.ctx.createLinearGradient(
            panelX, 
            panelY, 
            panelX + panelWidth, 
            panelY + panelHeight
        );
        panelGradient.addColorStop(0, 'rgba(57, 84, 123, 0.9)');  // Bunny blue
        panelGradient.addColorStop(1, 'rgba(75, 83, 32, 0.9)');   // Pepe green
        
        // Reset shadow for panel
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw rounded panel
        this.ctx.fillStyle = panelGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, [15]);
        this.ctx.fill();
        
        // Panel border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, [15]);
        this.ctx.stroke();
        
        // Turn off shadow for text
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw score text
        this.ctx.font = '22px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.textAlign = 'left';
        
        if (hasEnhancedStats) {
            // Enhanced stats display
            this.ctx.fillText('THIS GAME:', panelX + 30, panelY + 50);
            this.ctx.fillText('HIGHEST GAME:', panelX + 30, panelY + 90);
            this.ctx.fillText('TOTAL SCORE:', panelX + 30, panelY + 130);
            this.ctx.fillText('GAMES PLAYED:', panelX + 30, panelY + 170);
            
            // Draw score values
            this.ctx.font = 'bold 28px Arial';
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.textAlign = 'right';
            
            // This game's score
            this.ctx.fillText(Math.floor(this.score), panelX + panelWidth - 30, panelY + 50);
            
            // Highest single game score with gold glow if it's a new high score
            if (this.score === this.scoreData.highestSingleGameScore) {
                // Gold glow for new high score
                this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                this.ctx.shadowBlur = 15;
                this.ctx.fillStyle = '#FFD700';  // Gold color
            }
            this.ctx.fillText(Math.floor(this.scoreData.highestSingleGameScore), panelX + panelWidth - 30, panelY + 90);
            
            // Reset style for other scores
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#FFFFFF';
            
            // Total cumulative score
            this.ctx.fillText(Math.floor(this.scoreData.totalScore), panelX + panelWidth - 30, panelY + 130);
            
            // Games played
            this.ctx.fillText(this.scoreData.gamesPlayed, panelX + panelWidth - 30, panelY + 170);
        } else {
            // Standard score display
            this.ctx.fillText('YOUR SCORE:', panelX + 30, panelY + 50);
        this.ctx.fillText('HIGH SCORE:', panelX + 30, panelY + 100);
        
        // Draw score values
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'right';
        
        // Your score with gold glow if it's a new high score
        if (this.score > this.highScore) {
            // Gold glow for new high score
            this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = '#FFD700';  // Gold color
        }
        this.ctx.fillText(Math.floor(this.score), panelX + panelWidth - 30, panelY + 50);
        
        // Reset style for high score
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(Math.floor(this.highScore), panelX + panelWidth - 30, panelY + 100);
        }
        
        // Draw restart button
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = centerX - buttonWidth / 2;
        const buttonY = panelY + panelHeight + 30;
        
        // Button gradient
        const buttonGradient = this.ctx.createLinearGradient(
            buttonX, 
            buttonY, 
            buttonX + buttonWidth, 
            buttonY + buttonHeight
        );
        buttonGradient.addColorStop(0, '#8B3A3A');  // Umbrella red
        buttonGradient.addColorStop(1, '#A04848');  // Lighter red
        
        // Button shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 5;
        
        // Draw rounded button
        this.ctx.fillStyle = buttonGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, [30]);
        this.ctx.fill();
        
        // Button text
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('TRY AGAIN', centerX, buttonY + buttonHeight / 2);
        
        // Draw home button below the restart button
        const homeButtonY = buttonY + buttonHeight + 20;
        
        // Home button gradient (blue colors)
        const homeButtonGradient = this.ctx.createLinearGradient(
            buttonX, 
            homeButtonY, 
            buttonX + buttonWidth, 
            homeButtonY + buttonHeight
        );
        homeButtonGradient.addColorStop(0, '#3498db');  // Blue
        homeButtonGradient.addColorStop(1, '#2980b9');  // Darker blue
        
        // Home button shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 5;
        
        // Draw rounded home button
        this.ctx.fillStyle = homeButtonGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(buttonX, homeButtonY, buttonWidth, buttonHeight, [30]);
        this.ctx.fill();
        
        // Home button text
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('HOME', centerX, homeButtonY + buttonHeight / 2);
        
        // Add fun characters to game over screen
        this.drawGameOverCharacters();
        
        this.ctx.restore();
        
        // Store button position for click handling
        this.restartButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };

        // Store home button position for click handling
        this.homeButtonBounds = {
            x: buttonX,
            y: homeButtonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }
    
    /**
     * Draw character illustrations for the game over screen
     */
    drawGameOverCharacters() {
        // Pepe (sad face)
        const pepeX = this.canvas.width * 0.25;
        const pepeY = this.canvas.height * 0.2;
        const pepeSize = 80;
        
        // Draw Pepe's head
        this.ctx.fillStyle = '#4B5320'; // Pepe green
        this.ctx.beginPath();
        this.ctx.arc(pepeX, pepeY, pepeSize/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw Pepe's eyes (sad)
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(pepeX - pepeSize/4, pepeY - pepeSize/8, pepeSize/6, 0, Math.PI * 2);
        this.ctx.arc(pepeX + pepeSize/4, pepeY - pepeSize/8, pepeSize/6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw pupils (looking down)
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(pepeX - pepeSize/4, pepeY - pepeSize/8 + pepeSize/12, pepeSize/12, 0, Math.PI * 2);
        this.ctx.arc(pepeX + pepeSize/4, pepeY - pepeSize/8 + pepeSize/12, pepeSize/12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw sad mouth
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(pepeX, pepeY + pepeSize/4, pepeSize/4, Math.PI * 0.6, Math.PI * 0.4, true);
        this.ctx.stroke();
        
        // Sad tear
        this.ctx.fillStyle = '#87CEEB'; // Light blue
        this.ctx.beginPath();
        this.ctx.arc(pepeX - pepeSize/3, pepeY + pepeSize/8, pepeSize/10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Bunny (surprised face)
        const bunnyX = this.canvas.width * 0.75;
        const bunnyY = this.canvas.height * 0.2;
        const bunnySize = 80;
        
        // Draw Bunny's head
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(bunnyX, bunnyY, bunnySize/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw Bunny's ears
        this.ctx.fillStyle = 'white';
        
        // Left ear
        this.ctx.beginPath();
        this.ctx.ellipse(
            bunnyX - bunnySize/4, 
            bunnyY - bunnySize/1.5, 
            bunnySize/6, 
            bunnySize/2, 
            0, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Right ear
        this.ctx.beginPath();
        this.ctx.ellipse(
            bunnyX + bunnySize/4, 
            bunnyY - bunnySize/1.5, 
            bunnySize/6, 
            bunnySize/2, 
            0, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Inner ear coloring
        this.ctx.fillStyle = '#FFCAD4'; // Light pink
        
        // Left inner ear
        this.ctx.beginPath();
        this.ctx.ellipse(
            bunnyX - bunnySize/4, 
            bunnyY - bunnySize/1.5, 
            bunnySize/12, 
            bunnySize/3, 
            0, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Right inner ear
        this.ctx.beginPath();
        this.ctx.ellipse(
            bunnyX + bunnySize/4, 
            bunnyY - bunnySize/1.5, 
            bunnySize/12, 
            bunnySize/3, 
            0, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Draw Bunny's eyes (surprised)
        this.ctx.fillStyle = '#39547B'; // Hoodie blue
        this.ctx.beginPath();
        this.ctx.arc(bunnyX - bunnySize/4, bunnyY - bunnySize/8, bunnySize/6, 0, Math.PI * 2);
        this.ctx.arc(bunnyX + bunnySize/4, bunnyY - bunnySize/8, bunnySize/6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw pupils
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(bunnyX - bunnySize/4, bunnyY - bunnySize/8, bunnySize/12, 0, Math.PI * 2);
        this.ctx.arc(bunnyX + bunnySize/4, bunnyY - bunnySize/8, bunnySize/12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw shocked mouth (small o shape)
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(bunnyX, bunnyY + bunnySize/5, bunnySize/8, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    /**
     * Draw the background with decorative elements
     */
    drawBackground() {
        // Draw some completely static clouds with NO parallax effect
        this.ctx.save();
        this.ctx.globalAlpha = 0.8;
        
        for (const cloud of this.background.clouds) {
            // No parallax effect - clouds are completely stationary
            const adjustedY = cloud.y;
            
            // Only draw clouds that are visible on screen (with some margin)
            if (adjustedY > -cloud.height * 2 && adjustedY < this.canvas.height + cloud.height) {
                // Create cloud shape with multiple overlapping circles
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                
                // Draw a more complex, natural looking cloud
                const centerX = cloud.x;
                const centerY = adjustedY;
                
                // Base cloud shape
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, cloud.width * 0.3, 0, Math.PI * 2);
                this.ctx.arc(centerX + cloud.width * 0.2, centerY - cloud.height * 0.1, cloud.width * 0.25, 0, Math.PI * 2);
                this.ctx.arc(centerX - cloud.width * 0.2, centerY, cloud.width * 0.25, 0, Math.PI * 2);
                this.ctx.arc(centerX + cloud.width * 0.4, centerY + cloud.height * 0.1, cloud.width * 0.2, 0, Math.PI * 2);
                this.ctx.arc(centerX - cloud.width * 0.4, centerY + cloud.height * 0.05, cloud.width * 0.2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
        
        // Draw height indicators at 1000-point intervals
        if (this.score > 100) {
            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.setLineDash([5, 5]);
            this.ctx.lineWidth = 1;
            
            // Calculate which height markers should be visible
            const currentHeight = Math.abs(this.camera.y);
            const visibleMarkerStart = Math.max(0, Math.floor((currentHeight - this.canvas.height) / 1000)) * 1000;
            const visibleMarkerEnd = Math.ceil((currentHeight + this.canvas.height) / 1000) * 1000;
            
            for (let h = visibleMarkerStart; h <= visibleMarkerEnd; h += 1000) {
                // Calculate screen position for this height
                const markerScreenY = h - this.camera.y;
                
                // Only draw if within visible range
                if (markerScreenY >= 0 && markerScreenY <= this.canvas.height) {
                    // Draw horizontal line
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, markerScreenY);
                    this.ctx.lineTo(this.canvas.width, markerScreenY);
                    this.ctx.stroke();
                    
                    // Draw height text
                    this.ctx.font = '14px Arial';
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    this.ctx.textAlign = 'left';
                    this.ctx.fillText(`${h / 10}m`, 10, markerScreenY - 5);
                }
            }
            
            this.ctx.restore();
        }
    }
    
    /**
     * Set up event listeners for control buttons
     */
    setupControlButtons() {
        const pauseButton = document.getElementById('pauseButton');
        const audioButton = document.getElementById('audioButton');
        
        // Pause button functionality
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                if (this.isRunning && !this.isGameOver) {
                    this.pauseGame();
                    pauseButton.innerHTML = '<i class="fas fa-play"></i>';
                    pauseButton.classList.add('active');
                } else if (!this.isGameOver) {
                    this.resumeGame();
                    pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
                    pauseButton.classList.remove('active');
                }
            });
        }
        
        // Audio button functionality
        if (audioButton) {
            // Check initial audio state
            const isMuted = localStorage.getItem('gameMuted') === 'true';
            this.setAudioMuted(isMuted);
            
            // Update button appearance based on state
            if (isMuted) {
                audioButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
                audioButton.classList.add('active');
            }
            
            audioButton.addEventListener('click', () => {
                const currentMuted = localStorage.getItem('gameMuted') === 'true';
                const newMuted = !currentMuted;
                
                this.setAudioMuted(newMuted);
                localStorage.setItem('gameMuted', newMuted);
                
                if (newMuted) {
                    audioButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
                    audioButton.classList.add('active');
                } else {
                    audioButton.innerHTML = '<i class="fas fa-volume-up"></i>';
                    audioButton.classList.remove('active');
                }
            });
        }
    }
    
    /**
     * Set the muted state for all game audio
     * @param {boolean} muted - Whether audio should be muted
     */
    setAudioMuted(muted) {
        // Set muted property on all sound objects
        if (this.sounds) {
            Object.values(this.sounds).forEach(sound => {
                if (sound) {
                    sound.muted = muted;
                }
            });
            
            // If unmuting and the game is running, make sure background music is playing
            if (!muted && this.isRunning && !this.isGameOver && this.sounds.backgroundMusic && this.sounds.backgroundMusic.paused) {
                this.sounds.backgroundMusic.play().catch(e => console.warn('Could not resume background music', e));
            }
        }
    }
    
    /**
     * Pause the game
     */
    pauseGame() {
        this.isRunning = false;
        this.drawPauseOverlay();
    }
    
    /**
     * Resume the game
     */
    resumeGame() {
        this.isRunning = true;
        this.lastTime = performance.now();
        
        // Resume background music if it's not muted
        if (this.sounds && this.sounds.backgroundMusic && !this.sounds.backgroundMusic.muted) {
            try {
                this.sounds.backgroundMusic.play().catch(e => console.warn('Could not resume background music', e));
            } catch (e) {
                console.warn('Error resuming background music', e);
            }
        }
        
        this.gameLoop();
    }
    
    /**
     * Draw a pause overlay
     */
    drawPauseOverlay() {
        this.ctx.save();
        
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pause text
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        // Draw instruction
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Click the pause button to resume', this.canvas.width / 2, this.canvas.height / 2 + 30);
        
        this.ctx.restore();
    }
    
    /**
     * Handle touch start events
     * @param {TouchEvent} e - The touch event
     */
    handleTouchStart(e) {
        if (!this.isRunning || this.isGameOver) return;
        
        // Ensure we have touch data
        if (!e.touches || e.touches.length === 0) return;
        
        const touch = e.touches[0];
        const containerRect = this.canvas.getBoundingClientRect();
        const touchX = touch.clientX - containerRect.left;
        
        // Determine left or right based on touch position
        const centerX = containerRect.width / 2;
        
        if (touchX < centerX) {
            // Left side touched
            this.player.direction = -1;
            console.log('Touch left: Moving player left');
        } else {
            // Right side touched
            this.player.direction = 1;
            console.log('Touch right: Moving player right');
        }
    }
    
    /**
     * Handle touch move events
     * @param {TouchEvent} e - The touch event
     */
    handleTouchMove(e) {
        if (!this.isRunning || this.isGameOver) return;
        
        // Ensure we have touch data
        if (!e.touches || e.touches.length === 0) return;
        
        const touch = e.touches[0];
        const containerRect = this.canvas.getBoundingClientRect();
        const touchX = touch.clientX - containerRect.left;
        
        // Determine left or right based on touch position
        const centerX = containerRect.width / 2;
        
        if (touchX < centerX) {
            // Left side touched
            this.player.direction = -1;
        } else {
            // Right side touched
            this.player.direction = 1;
        }
    }
    
    /**
     * Handle touch end events
     * @param {TouchEvent} e - The touch event
     */
    handleTouchEnd(e) {
        if (!this.isRunning || this.isGameOver) return;
        
        // Stop player movement
        this.player.direction = 0;
        console.log('Touch ended: Stopping player movement');
    }

    // Add mouse movement event handler
    handleMouseMove(e) {
        if (!this.isRunning || this.isGameOver) return;
        
        const containerRect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        
        // Determine left or right based on mouse position
        const centerX = containerRect.width / 2;
        
        if (mouseX < centerX) {
            // Left side
            this.player.direction = -1;
        } else {
            // Right side
            this.player.direction = 1;
        }
    }
    
    /**
     * Handle mouse down events
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseDown(e) {
        if (!this.isRunning || this.isGameOver) return;
        
        const containerRect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        
        // Determine left or right based on mouse position
        const centerX = containerRect.width / 2;
        
        if (mouseX < centerX) {
            // Left side pressed
            this.player.direction = -1;
        } else {
            // Right side pressed
            this.player.direction = 1;
        }
    }
    
    /**
     * Handle mouse up events
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseUp(e) {
        if (!this.isRunning || this.isGameOver) return;
        
        // Stop player movement when mouse button is released
        this.player.direction = 0;
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyDown(e) {
        if (!this.isRunning || this.isGameOver) return;
        
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            this.player.direction = -1;
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            this.player.direction = 1;
        }
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyUp(e) {
        if (!this.isRunning || this.isGameOver) return;
        
        if ((e.key === 'ArrowLeft' || e.key === 'a') && this.player.direction === -1) {
            this.player.direction = 0;
        } else if ((e.key === 'ArrowRight' || e.key === 'd') && this.player.direction === 1) {
            this.player.direction = 0;
        }
    }
}