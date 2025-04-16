require('dotenv').config();
const axios = require('axios');

async function testUsersAPI() {
    try {
        console.log('Testing Users API...');
        
        // Base URL - adjust this based on your server configuration
        const baseURL = 'http://localhost:3000'; // or whatever port your server runs on
        
        console.log('\n1. Testing GET /api/users (default parameters)');
        const response = await axios.get(`${baseURL}/api/users`);
        
        console.log('Response status:', response.status);
        console.log('Users found:', response.data.users.length);
        console.log('Pagination:', response.data.pagination);
        
        if (response.data.users.length > 0) {
            console.log('\nSample user data:');
            console.log(JSON.stringify(response.data.users[0], null, 2));
        }
        
        // Test with parameters
        console.log('\n2. Testing GET /api/users with parameters');
        const paramsResponse = await axios.get(`${baseURL}/api/users`, {
            params: {
                limit: 5,
                sortBy: 'highScore',
                sortDir: 'desc'
            }
        });
        
        console.log('Response status:', paramsResponse.status);
        console.log('Top 5 users by high score:');
        paramsResponse.data.users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username || user.email}: ${user.highScore}`);
        });
        
    } catch (error) {
        console.error('\n❌ API test failed');
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received. Is the server running?');
        } else {
            // Something happened in setting up the request
            console.error('Error:', error.message);
        }
    }
}

// Run the test
testUsersAPI(); 