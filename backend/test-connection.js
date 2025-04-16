require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

async function testConnection() {
    try {
        console.log('Testing Appwrite connection...');
        
        // Log configuration
        console.log('Configuration:', {
            endpoint: process.env.APPWRITE_ENDPOINT,
            projectId: process.env.APPWRITE_PROJECT_ID,
            databaseId: process.env.APPWRITE_DATABASE_ID,
            usersCollectionId: 'users', // Using the known collection ID
            hasApiKey: !!process.env.APPWRITE_API_KEY
        });

        // Initialize Appwrite client
        const client = new Client();
        
        // Set up the client without any request body modifications
        client
            .setEndpoint(process.env.APPWRITE_ENDPOINT)
            .setProject(process.env.APPWRITE_PROJECT_ID)
            .setKey(process.env.APPWRITE_API_KEY);

        const databases = new Databases(client);

        // Test steps
        console.log('\n1. Testing database access...');
        const db = await databases.get(process.env.APPWRITE_DATABASE_ID);
        console.log('✅ Database access successful:', db.name);

        console.log('\n2. Testing collection access...');
        const collection = await databases.getCollection(
            process.env.APPWRITE_DATABASE_ID,
            'users'
        );
        console.log('✅ Collection access successful:', collection.name);

        console.log('\n3. Testing document listing...');
        const documents = await databases.listDocuments(
            process.env.APPWRITE_DATABASE_ID,
            'users'
        );
        console.log('✅ Document listing successful. Total documents:', documents.total);

        console.log('\n✅ All connection tests passed successfully!');
        return true;
    } catch (error) {
        console.error('\n❌ Connection test failed');
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            type: error.type,
            response: error.response
        });
        
        console.log('\nTroubleshooting steps:');
        console.log('1. Verify these values in your .env file:');
        console.log(`   APPWRITE_ENDPOINT=${process.env.APPWRITE_ENDPOINT}`);
        console.log(`   APPWRITE_PROJECT_ID=${process.env.APPWRITE_PROJECT_ID}`);
        console.log(`   APPWRITE_DATABASE_ID=${process.env.APPWRITE_DATABASE_ID}`);
        console.log('2. Confirm your API key has these permissions:');
        console.log('   - databases.read');
        console.log('   - collections.read');
        console.log('   - documents.read');
        console.log('3. Verify the users collection exists (we can see it does)');
        return false;
    }
}

// Run the test
testConnection(); 