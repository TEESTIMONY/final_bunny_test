require('dotenv').config();
const { account, databases, DATABASE_ID, USERS_COLLECTION_ID } = require('./config/appwrite');
const { ID } = require('node-appwrite');

async function createTestUser() {
    try {
        console.log('Creating test user...');

        // First, create an account
        const email = `test${Date.now()}@example.com`; // Unique email
        const password = 'TestPassword123!'; // Strong password for testing

        console.log('1. Creating Appwrite account...');
        const newAccount = await account.create(
            ID.unique(),
            email,
            password,
            'Test User'
        );
        console.log('✅ Account created:', {
            id: newAccount.$id,
            email: newAccount.email,
            name: newAccount.name
        });

        // Then, create a user document with additional information
        console.log('\n2. Creating user document...');
        const userData = {
            userId: newAccount.$id, // Link to Appwrite account
            email: newAccount.email,
            name: newAccount.name,
            score: 0,
            referralCode: ID.unique(), // Generate unique referral code
            referredBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const newUser = await databases.createDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            ID.unique(),
            userData
        );

        console.log('✅ User document created:', {
            documentId: newUser.$id,
            userId: newUser.userId,
            email: newUser.email,
            name: newUser.name,
            referralCode: newUser.referralCode
        });

        console.log('\n✅ Test user creation successful!');
        console.log('You can now try logging in with:');
        console.log('Email:', email);
        console.log('Password:', password);

        return newUser;
    } catch (error) {
        console.error('\n❌ User creation failed');
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            type: error.type,
            response: error.response
        });
        throw error;
    }
}

// Run the test
createTestUser(); 