# Hop Bunny Game

A fun vertical platformer game featuring an unlikely friendship between a frog and rabbit!

## Development Setup

### Frontend Development

1. Open the project in your favorite code editor
2. Use a local server to run the game (e.g., Live Server extension for VS Code)
3. Access the game at http://localhost:5500 (or whatever port your local server uses)

### Backend Development

To avoid CORS errors during development, you need to run the backend locally:

1. Navigate to the backend folder:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the backend folder with your Firebase credentials (see `backend/FIREBASE_SETUP.md` for details)

4. Start the backend server in development mode:
   ```
   npm run dev
   ```

5. The backend will run at http://localhost:3000

### Production Deployment

1. Deploy the backend to Vercel:
   ```
   cd backend
   npm run deploy
   ```

2. Update the `API_BASE_URL` in `js/auth.js` with your deployed API URL (currently set to `https://new-backend-hop.vercel.app`)

3. Deploy the frontend to your preferred hosting provider

## Troubleshooting CORS Issues

If you encounter CORS errors:

1. Ensure the backend is running locally during development
2. Check that the `API_BASE_URL` in `js/auth.js` is set correctly (should be `https://new-backend-hop.vercel.app`)
3. Make sure your backend has proper CORS headers configured

## Game Features

- Endless vertical jumping gameplay
- Power-ups and obstacles
- High score tracking
- User accounts and leaderboards

## Credits

- Art: [Your Name]
- Programming: [Your Name]
- Sound: [Your Name]

## License

[Your License]

## How to Play

1. Open `index.html` in a modern web browser.
2. Control the bunny with left and right arrow keys (or A/D keys).
3. Jump on platforms to climb higher.
4. Collect power-ups to gain special abilities.
5. Avoid or jump on enemies to defeat them.
6. Don't fall off the bottom of the screen!

## Controls

- **Desktop:** 
  - Left/Right Arrow Keys or A/D Keys: Move left/right
  - Fullscreen button: Toggle fullscreen mode

- **Mobile:** 
  - Touch left/right side of the screen to move
  - Device tilt: Control movement
  - Fullscreen button: Toggle fullscreen mode

## Features

- **Procedurally generated** platforms and obstacles
- **Multiple platform types**:
  - Normal: Standard jumping platforms
  - Bouncy: Higher jumps
  - Breakable: Breaks after jumping on it
  - Moving: Moves horizontally
  - Disappearing: Disappears shortly after landing on it
- **Power-ups**:
  - Jetpack: Fly upward for a few seconds
  - Spring: Higher jumps for a limited time
  - Shield: Protection from one enemy or fall
- **Enemies** that can be defeated by jumping on top of them
- **Score system** based on height reached
- **Responsive design** for both desktop and mobile devices
- **Sound effects** for gameplay events (jump, power-up, etc.)

## Technical Details

This game is built using:
- Vanilla JavaScript (no frameworks)
- HTML5 Canvas
- CSS for styling

The code is structured in a modular way with separate classes for:
- `Player`: Player character logic
- `Platform`: Different platform types
- `Enemy`: Enemy behaviors
- `PowerUp`: Power-up effects
- `Game`: Main game loop and logic

## Credits

Created as a coding exercise inspired by the popular game Doodle Jump. 