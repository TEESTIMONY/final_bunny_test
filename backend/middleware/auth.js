const { account } = require('../config/appwrite');

/**
 * Middleware to verify Appwrite session
 * Attaches the user to the request object if successful
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Verify the session
      const session = await account.getSession(token);
      const user = await account.get();
      req.user = {
        uid: user.$id,
        email: user.email,
        name: user.name
      };
      next();
    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { verifyToken }; 