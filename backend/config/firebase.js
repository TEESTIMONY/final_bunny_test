const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Check if we already have an initialized app
if (!admin.apps.length) {
  // For local development, use a service account JSON file
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    } catch (error) {
      console.error('Error initializing Firebase admin with service account:', error);
      
      // Fallback to application default credentials if parsing fails
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  } else {
    // For Vercel deployment, use application default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
}

// Get Firebase Auth instance
const auth = admin.auth();
const db = admin.firestore();

module.exports = { admin, auth, db }; 