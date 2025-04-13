import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check if we have a token in localStorage
        const token = localStorage.getItem('authToken');
        
        if (token) {
          // Set default auth header for all axios requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Try to get the user profile using the token
          const response = await axios.get('/api/auth/me');
          setCurrentUser(response.data);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        // If token is invalid, clear it
        localStorage.removeItem('authToken');
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post('/api/auth/login', { email, password });
      
      // Save the token to localStorage
      localStorage.setItem('authToken', response.data.token);
      
      // Set the authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      // Set the user state
      setCurrentUser(response.data.user);
      
      return response.data.user;
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout API call failed, but proceeding with local logout:', err);
    } finally {
      // Remove token from localStorage
      localStorage.removeItem('authToken');
      
      // Remove authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      // Clear user state
      setCurrentUser(null);
    }
  };

  // Register function
  const register = async (email, password, username) => {
    try {
      setError(null);
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        username
      });
      
      // Auto login after successful registration
      localStorage.setItem('authToken', response.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      setCurrentUser(response.data.user);
      
      return response.data.user;
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    }
  };

  // Value object with all auth-related data and functions
  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    register
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 