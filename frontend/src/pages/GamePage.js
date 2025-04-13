import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Button, ProgressBar } from 'react-bootstrap';
import GameOver from '../components/GameOver';
import { useAuth } from '../contexts/AuthContext'; // Assuming you have an auth context

const GamePage = () => {
  const [gameState, setGameState] = useState('playing'); // 'playing', 'gameover'
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30); // 30 second game
  const { currentUser } = useAuth(); // Get the current user from auth context
  const navigate = useNavigate();

  // Timer effect for the game
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setGameState('gameover');
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Handle clicking the bunny to earn points
  const handleBunnyClick = () => {
    if (gameState === 'playing') {
      setScore((prevScore) => prevScore + 10);
    }
  };

  // Handle Play Again button click
  const handlePlayAgain = () => {
    setScore(0);
    setTimeLeft(30);
    setGameState('playing');
  };

  // Handle Back to Home button click
  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <Container className="py-4">
      {gameState === 'playing' ? (
        <div className="game-container">
          <div className="game-header d-flex justify-content-between align-items-center mb-3">
            <h2>Score: {score}</h2>
            <div className="time-container">
              <h5>Time Left: {timeLeft}s</h5>
              <ProgressBar 
                now={timeLeft * 100 / 30} 
                variant={timeLeft < 10 ? "danger" : "primary"} 
                style={{ height: '10px', width: '200px' }}
              />
            </div>
          </div>

          <div className="game-board text-center">
            <div 
              className="bunny-character"
              onClick={handleBunnyClick}
              style={{
                width: '100px',
                height: '100px',
                background: '#87CEEB',
                borderRadius: '50%',
                margin: '0 auto',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              🐰 Click me!
            </div>
            <p className="mt-3">Click the bunny to earn points!</p>
          </div>
        </div>
      ) : (
        <GameOver 
          score={score}
          userId={currentUser?.uid}
          onPlayAgain={handlePlayAgain}
          onBackToHome={handleBackToHome}
        />
      )}
    </Container>
  );
};

export default GamePage; 