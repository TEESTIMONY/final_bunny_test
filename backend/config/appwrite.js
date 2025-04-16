const { Client, Databases, Account, Teams } = require('node-appwrite');

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

// Initialize Appwrite services
const databases = new Databases(client);
const account = new Account(client);
const teams = new Teams(client);

// Database and collection IDs
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID;
const SCORES_COLLECTION_ID = process.env.APPWRITE_SCORES_COLLECTION_ID;
const REFERRALS_COLLECTION_ID = process.env.APPWRITE_REFERRALS_COLLECTION_ID;

module.exports = {
    client,
    databases,
    account,
    teams,
    DATABASE_ID,
    USERS_COLLECTION_ID,
    SCORES_COLLECTION_ID,
    REFERRALS_COLLECTION_ID
}; 