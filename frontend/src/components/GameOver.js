import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import './GameOver.css';

const GameOver = ({ score, userId, onPlayAgain, onBackToHome }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [scoreData, setScoreData] = useState(null);

  // Submit score automatically when component mounts
  useEffect(() => {
    submitScore();
  }, []);

  const submitScore = async () => {
    if (submitted || isSubmitting || !userId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await axios.post('/api/update-score', {
        userId,
        score
      });

      setScoreData(response.data);
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting score:', err);
      if (err.response?.status === 403) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to submit your score. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-5">
      <Card className="text-center shadow">
        <Card.Header as="h2">Game Over</Card.Header>
        <Card.Body>
          <Card.Title className="mb-4">Your Score: {score}</Card.Title>

          {isSubmitting ? (
            <div className="text-center my-3">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Submitting score...</span>
              </Spinner>
              <p className="mt-2">Submitting your score...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">
              {error}
              <div className="mt-2">
                <Button variant="outline-danger" onClick={submitScore}>Try Again</Button>
              </div>
            </Alert>
          ) : submitted && scoreData ? (
            <div className="score-summary">
              <Alert variant="success">Score submitted successfully!</Alert>
              <div className="stats-container my-4">
                <div className="stat-item">
                  <h5>Total Score</h5>
                  <p className="stat-value">{scoreData.totalScore}</p>
                </div>
                <div className="stat-item">
                  <h5>Highest Game</h5>
                  <p className="stat-value">{scoreData.highestSingleGameScore}</p>
                </div>
                <div className="stat-item">
                  <h5>Games Played</h5>
                  <p className="stat-value">{scoreData.gamesPlayed}</p>
                </div>
              </div>
              <p className="text-muted">
                {score > scoreData.highestSingleGameScore - score 
                  ? "New personal best!" 
                  : `+${score} points added to your total score`}
              </p>
            </div>
          ) : null}

          <div className="mt-4 d-flex justify-content-center gap-3">
            <Button variant="primary" onClick={onPlayAgain}>
              Play Again
            </Button>
            <Button variant="secondary" onClick={onBackToHome}>
              Back to Home
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default GameOver; 