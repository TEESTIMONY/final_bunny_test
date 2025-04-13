/**
 * Main entry point for the game
 */
// Create a global game reference that can be used by other components
let game;

// Fix for mobile viewport height issues
function fixViewportHeight() {
    // First we get the viewport height and multiply it by 1% to get a value for a vh unit
    let vh = window.innerHeight * 0.01;
    // Then we set the value in the --vh custom property to the root of the document
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Function to handle viewport height for small screens
function setViewportHeight() {
    // First, get the viewport height and multiply it by 1% to get a value for a vh unit
    let vh = window.innerHeight * 0.01;
    // Then set the value in the --vh custom property to the root of the document
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Handle extremely small heights by adding a class to the body
    if (window.innerHeight < 500) {
        document.body.classList.add('very-small-height');
    } else {
        document.body.classList.remove('very-small-height');
    }
    
    // Handle tiny screens with different layout approach
    if (window.innerHeight < 400) {
        document.body.classList.add('tiny-screen');
    } else {
        document.body.classList.remove('tiny-screen');
    }
    
    // Add a check specifically for the leaderboard button visibility
    const leaderboardButton = document.getElementById('leaderboardButton');
    if (leaderboardButton) {
        // Force layout to horizontal buttons on smaller height screens
        if (window.innerHeight < 550) {
            const buttonContainer = document.querySelector('.button-container');
            if (buttonContainer) {
                buttonContainer.style.flexDirection = 'row';
                buttonContainer.style.flexWrap = 'wrap';
                buttonContainer.style.gap = '8px';
            }
            leaderboardButton.style.marginTop = '0';
        }
        
        // Extra check for the smallest screens
        if (window.innerHeight < 450) {
            leaderboardButton.style.fontSize = '11px';
            leaderboardButton.style.padding = '5px 10px';
            
            const startButton = document.getElementById('startButton');
            if (startButton) {
                startButton.style.fontSize = '11px';
                startButton.style.padding = '5px 10px';
            }
        }
    }
}

// Call the function initially
setViewportHeight();

// Add event listener to recalculate on resize
window.addEventListener('resize', () => {
    setViewportHeight();
});

// Make sure the game initializes properly
function initGame() {
    try {
        // Fix viewport height for mobile
        fixViewportHeight();
        
        // Add resize event listener
        window.addEventListener('resize', () => {
            fixViewportHeight();
            if (game) {
                // Add a small delay to ensure the browser UI elements have adjusted
                setTimeout(() => game.resizeCanvas(), 100);
            }
        });
        
        // Add orientation change listener for mobile
        window.addEventListener('orientationchange', () => {
            // Wait for orientation change to complete
            setTimeout(() => {
                fixViewportHeight();
                if (game) game.resizeCanvas();
            }, 200);
        });
        
        // Get canvas element
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas element not found! Make sure the HTML has loaded properly.');
            return;
        }
        
        // Create game instance
        game = new Game(canvas);
        
        // Make game globally accessible for debugging and components that need it
        window.game = game;
        
        // Add debug overlay
        addDebugOverlay();
        
        // Don't start the game automatically, wait for start button click
        setupStartScreen();
        
        // Add touch controls for mobile devices
        addTouchControls(game);
        
        console.log('Bunny Runner game initialized successfully!');
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('There was an error starting the game. Please check the console for details.');
    }
}

// Setup the start screen and button functionality
function setupStartScreen() {
    const startButton = document.getElementById('startButton');
    const startScreen = document.getElementById('startScreen');
    const restartButton = document.getElementById('restartButton');
    const leaderboardButtonGameOver = document.getElementById('leaderboardButtonGameOver');
    const gameOverScreen = document.getElementById('gameOver');
    
    // Safe sound play function to avoid errors
    function playSoundSafely(sound) {
        if (sound) {
            try {
                // Create a clone of the audio to avoid issues with playing the same sound multiple times
                const soundClone = sound.cloneNode();
                soundClone.volume = 0.5;
                soundClone.play().catch(err => {
                    console.warn('Could not play sound:', err);
                });
            } catch (err) {
                console.warn('Error playing sound:', err);
            }
        }
    }
    
    // Add both click and touchend events to ensure mobile compatibility
    function startGameHandler(e) {
        e.preventDefault(); // Prevent any default behavior
        
        // Remove active-touch class if it exists
        startButton.classList.remove('active-touch');
        
        // Hide the start screen
        startScreen.classList.add('hidden');
        
        // Start the game
        game.start();
        
        // Play a sound effect if available
        if (game.sounds && game.sounds.jump) {
            playSoundSafely(game.sounds.jump);
        }
    }
    
    // Add multiple event listeners to ensure button works on all devices
    startButton.addEventListener('click', startGameHandler);
    startButton.addEventListener('touchend', startGameHandler);
    
    // Fix for iOS Safari where touch events might be blocked
    startButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent default to allow touchend to fire reliably
        startButton.classList.add('active-touch'); // Visual feedback
    });
    
    // Handle touch cancel
    startButton.addEventListener('touchcancel', () => {
        startButton.classList.remove('active-touch');
    });
    
    // Make sure restart button works with similar approach
    function restartGameHandler(e) {
        console.log('Restart button clicked');
        e.preventDefault();
        
        // Remove active-touch class if it exists
        restartButton.classList.remove('active-touch');
        
        // Hide game over screen
        gameOverScreen.classList.add('hidden');
        
        // Restart the game
        if (game && typeof game.restart === 'function') {
            game.restart();
            
            // Play a sound effect if available
            if (game.sounds && game.sounds.jump) {
                playSoundSafely(game.sounds.jump);
            }
        } else {
            console.error('Game restart function not available');
            // Fallback: reload the page
            window.location.reload();
        }
    }
    
    // Add event handlers for the leaderboard button in game over screen
    function leaderboardGameOverHandler(e) {
        console.log('Leaderboard button clicked');
        e.preventDefault();
        
        // Remove active-touch class if it exists
        leaderboardButtonGameOver.classList.remove('active-touch');
        
        // Navigate to leaderboard page
        window.location.href = 'leaderboard.html';
    }
    
    // Remove any existing event listeners to avoid duplicate handlers
    restartButton.removeEventListener('click', restartGameHandler);
    restartButton.removeEventListener('touchend', restartGameHandler);
    
    if (leaderboardButtonGameOver) {
        leaderboardButtonGameOver.removeEventListener('click', leaderboardGameOverHandler);
        leaderboardButtonGameOver.removeEventListener('touchend', leaderboardGameOverHandler);
    }
    
    // Add event listeners
    restartButton.addEventListener('click', restartGameHandler);
    restartButton.addEventListener('touchend', restartGameHandler);
    
    restartButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        restartButton.classList.add('active-touch'); // Visual feedback
        console.log('Restart button touch start');
    });
    
    // Handle touch cancel for restart button
    restartButton.addEventListener('touchcancel', () => {
        restartButton.classList.remove('active-touch');
    });
    
    // Add event listeners for leaderboard button
    if (leaderboardButtonGameOver) {
        leaderboardButtonGameOver.addEventListener('click', leaderboardGameOverHandler);
        leaderboardButtonGameOver.addEventListener('touchend', leaderboardGameOverHandler);
        
        leaderboardButtonGameOver.addEventListener('touchstart', (e) => {
            e.preventDefault();
            leaderboardButtonGameOver.classList.add('active-touch'); // Visual feedback
            console.log('Leaderboard button touch start');
        });
        
        // Handle touch cancel for leaderboard button
        leaderboardButtonGameOver.addEventListener('touchcancel', () => {
            leaderboardButtonGameOver.classList.remove('active-touch');
        });
    } else {
        console.warn('Leaderboard button not found in the DOM');
    }
    
    // Set up high score display for game over screen
    setupHighScoreDisplay();
    
    // Log initialization for debugging
    console.log('Start, restart, and leaderboard buttons initialized with mobile support');
}

// Set up high score display
function setupHighScoreDisplay() {
    const highScoreElement = document.getElementById('highScore');
    const savedHighScore = localStorage.getItem('highScore') || 0;
    
    // Update the high score element
    highScoreElement.textContent = savedHighScore;
    
    // No need to add another event listener here since we already handle 
    // high score updates in the game's gameOver method
    console.log('High score display set up with value:', savedHighScore);
}

// Add a debug overlay to help troubleshoot
function addDebugOverlay() {
    // Create debug div
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debugOverlay';
    document.querySelector('.game-container').appendChild(debugDiv);
    
    // Add debug styles
    const debugStyles = document.createElement('style');
    debugStyles.textContent = `
        #debugOverlay {
            position: absolute;
            top: 50px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 5px;
            border-radius: 3px;
            width: 180px;
            z-index: 100;
            pointer-events: none;
            white-space: pre;
            display: none;
        }
        
        .debug-enabled #debugOverlay {
            display: block;
        }
    `;
    document.head.appendChild(debugStyles);
    
    // Add key listener to toggle debug
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F2' || e.key === 'd') {
            document.body.classList.toggle('debug-enabled');
            updateDebugInfo();
        }
    });
    
    // Update debug info periodically
    function updateDebugInfo() {
        if (!document.body.classList.contains('debug-enabled')) return;
        
        const info = [];
        if (window.game) {
            const g = window.game;
            info.push(`FPS: ${Math.round(1000 / (performance.now() - g.lastTime))}`);
            info.push(`Player: ${Math.round(g.player.x)},${Math.round(g.player.y)}`);
            info.push(`VelY: ${g.player.velocityY.toFixed(1)}`);
            info.push(`Falling: ${g.player.isFalling}`);
            info.push(`Camera: ${Math.round(g.camera.y)}`);
            info.push(`Score: ${g.score}`);
            info.push(`Platforms: ${g.platformManager.platforms.length}`);
            info.push(`Press D to hide debug`);
        } else {
            info.push('Game not initialized');
        }
        
        debugDiv.textContent = info.join('\n');
        requestAnimationFrame(updateDebugInfo);
    }
    
    // Initial update
    updateDebugInfo();
}

// Wait for DOM to be fully loaded before initializing the game
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const authScreen = document.getElementById('authScreen');
    const startScreen = document.getElementById('startScreen'); 
    const gameOver = document.getElementById('gameOver');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const finalScore = document.getElementById('finalScore');
    const highScore = document.getElementById('highScore');
    const gameCanvas = document.getElementById('gameCanvas');
    
    // Game state
    let game = null;
    let isGameStarted = false;
    
    // Initialize the flow
    function init() {
        // Check if the user is already authenticated (can be implemented later)
        if (isUserAuthenticated()) {
            // If authenticated, show the start screen
            authScreen.classList.add('hidden');
            startScreen.classList.remove('hidden');
        } else {
            // If not authenticated, show the auth screen (already visible by default)
        }
        
        // Add event listeners
        setupEventListeners();
    }
    
    // Setup all event listeners
    function setupEventListeners() {
        // Start button
        startButton.addEventListener('click', startGame);
        
        // Restart button
        restartButton.addEventListener('click', restartGame);
        
        // For touchscreen devices - use passive: false to prevent scrolling
        gameCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        gameCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        gameCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // For keyboard controls
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        
        // For mouse controls
        gameCanvas.addEventListener('mousedown', handleMouseDown);
        gameCanvas.addEventListener('mousemove', handleMouseMove);
        gameCanvas.addEventListener('mouseup', handleMouseUp);
    }
    
    // Start the game
    function startGame() {
        startScreen.classList.add('hidden');
        isGameStarted = true;
        
        // Initialize the game
        game = new Game(gameCanvas);
        game.start();
        
        // Set up callback for game over
        game.onGameOver = showGameOver;
    }
    
    // Restart the game
    function restartGame() {
        gameOver.classList.add('hidden');
        
        // Reset game
        if (game) {
            game.reset();
        } else {
            game = new Game(gameCanvas);
        }
        
        game.start();
        isGameStarted = true;
    }
    
    // Show game over screen
    function showGameOver(score) {
        isGameStarted = false;
        gameOver.classList.remove('hidden');
        
        // Make sure the leaderboard button is visible and properly set up
        const leaderboardButton = document.getElementById('leaderboardButtonGameOver');
        if (leaderboardButton) {
            leaderboardButton.style.display = 'flex';
            leaderboardButton.style.opacity = '1';
            leaderboardButton.style.visibility = 'visible';
            
            // Define leaderboard handler function in this scope
            const handleLeaderboardClick = (e) => {
                e.preventDefault();
                console.log('Navigating to leaderboard from game over screen');
                window.location.href = 'leaderboard.html';
            };
            
            // Ensure it has the correct click handler
            leaderboardButton.removeEventListener('click', handleLeaderboardClick);
            leaderboardButton.removeEventListener('touchend', handleLeaderboardClick);
            
            leaderboardButton.addEventListener('click', handleLeaderboardClick);
            leaderboardButton.addEventListener('touchend', handleLeaderboardClick);
            
            // Add visual feedback for touch
            leaderboardButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                leaderboardButton.classList.add('active-touch');
            });
            
            // Handle touch cancel
            leaderboardButton.addEventListener('touchcancel', () => {
                leaderboardButton.classList.remove('active-touch');
            });
        } else {
            console.error('Leaderboard button not found in game over screen');
        }
        
        // Update score display
        finalScore.textContent = score;
        
        // Update high score
        const currentHighScore = localStorage.getItem('highScore') || 0;
        if (score > currentHighScore) {
            localStorage.setItem('highScore', score);
            highScore.textContent = score;
        } else {
            highScore.textContent = currentHighScore;
        }
    }
    
    // Input handlers
    function handleTouchStart(e) {
        if (isGameStarted && game) {
            e.preventDefault(); // Prevent default behavior like scrolling
            try {
                game.handleTouchStart(e);
            } catch (error) {
                console.error('Error in handleTouchStart:', error);
                // Fallback direct control if method fails
                if (game.player && e.touches && e.touches.length > 0) {
                    const touch = e.touches[0];
                    const rect = gameCanvas.getBoundingClientRect();
                    const touchX = touch.clientX - rect.left;
                    game.player.direction = touchX < rect.width / 2 ? -1 : 1;
                }
            }
        }
    }
    
    function handleTouchMove(e) {
        if (isGameStarted && game) {
            e.preventDefault(); // Prevent default behavior like scrolling
            try {
                game.handleTouchMove(e);
            } catch (error) {
                console.error('Error in handleTouchMove:', error);
                // Fallback direct control if method fails
                if (game.player && e.touches && e.touches.length > 0) {
                    const touch = e.touches[0];
                    const rect = gameCanvas.getBoundingClientRect();
                    const touchX = touch.clientX - rect.left;
                    game.player.direction = touchX < rect.width / 2 ? -1 : 1;
                }
            }
        }
    }
    
    function handleTouchEnd(e) {
        if (isGameStarted && game) {
            e.preventDefault(); // Prevent default behavior
            try {
                game.handleTouchEnd(e);
            } catch (error) {
                console.error('Error in handleTouchEnd:', error);
                // Fallback direct control if method fails
                if (game.player) {
                    game.player.direction = 0;
                }
            }
        }
    }
    
    function handleKeyDown(e) {
        if (isGameStarted && game) {
            game.handleKeyDown(e);
        }
    }
    
    function handleKeyUp(e) {
        if (isGameStarted && game) {
            game.handleKeyUp(e);
        }
    }
    
    function handleMouseDown(e) {
        if (isGameStarted && game) {
            game.handleMouseDown(e);
        }
    }
    
    function handleMouseMove(e) {
        if (isGameStarted && game) {
            game.handleMouseMove(e);
        }
    }
    
    function handleMouseUp(e) {
        if (isGameStarted && game) {
            game.handleMouseUp(e);
        }
    }
    
    // Helper function to check if user is authenticated
    // This would connect to your backend once implemented
    function isUserAuthenticated() {
        // For now, just check localStorage
        // Later this would check with your backend
        return localStorage.getItem('userToken') ? true : false;
    }
    
    // Initialize the game flow
    init();
});

/**
 * Add touch controls for mobile devices
 * @param {Game} game - Game instance
 */
function addTouchControls(game) {
    const gameContainer = document.querySelector('.game-container');
    
    // Touch event handlers
    gameContainer.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scrolling
        if (game && typeof game.handleTouchStart === 'function') {
            game.handleTouchStart(e);
        }
    }, { passive: false });
    
    gameContainer.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling
        if (game && typeof game.handleTouchMove === 'function') {
            game.handleTouchMove(e);
        }
    }, { passive: false });
    
    gameContainer.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent scrolling
        if (game && typeof game.handleTouchEnd === 'function') {
            game.handleTouchEnd(e);
        }
    }, { passive: false });
    
    gameContainer.addEventListener('touchcancel', (e) => {
        e.preventDefault(); // Prevent scrolling
        if (game && typeof game.handleTouchEnd === 'function') {
            game.handleTouchEnd(e);
        }
    }, { passive: false });
} 