require('dotenv').config();

console.log('Checking environment variables...');
console.log('APPWRITE_ENDPOINT:', process.env.APPWRITE_ENDPOINT);
console.log('APPWRITE_PROJECT_ID:', process.env.APPWRITE_PROJECT_ID);
console.log('APPWRITE_DATABASE_ID:', process.env.APPWRITE_DATABASE_ID);
console.log('APPWRITE_USERS_COLLECTION_ID:', process.env.APPWRITE_USERS_COLLECTION_ID);
console.log('APPWRITE_SCORES_COLLECTION_ID:', process.env.APPWRITE_SCORES_COLLECTION_ID);
console.log('APPWRITE_REFERRALS_COLLECTION_ID:', process.env.APPWRITE_REFERRALS_COLLECTION_ID); 