import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import GamePage from './pages/GamePage'; 
import Navigation from './components/Navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Import other pages as needed
// import Home from './pages/Home';
// import Login from './pages/Login';
// import Register from './pages/Register';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navigation />
        <Routes>
          {/* Define your routes here */}
          {/* <Route path="/" element={<Home />} /> */}
          {/* <Route path="/login" element={<Login />} /> */}
          {/* <Route path="/register" element={<Register />} /> */}
          
          {/* Game Route */}
          <Route path="/play" element={<GamePage />} />
          
          {/* Admin Dashboard Route */}
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; 