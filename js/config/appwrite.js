// Appwrite configuration
const config = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '67ffcfc5000ad67cf8c9',
    apiEndpoint: 'https://backend-jet-pi-38.vercel.app/api',
    databaseId: 'hopbunny',  // Matching .env APPWRITE_DATABASE_ID
    usersCollectionId: 'users', // Matching .env APPWRITE_USERS_COLLECTION_ID
    scoresCollectionId: '67ffd2fd002962b6c55c', // Adding scores collection ID
    referralsCollectionId: '67ffd36900293d48e87e', // Adding referrals collection ID
    hostURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? window.location.origin 
        : window.location.origin // Use the actual origin for both dev and production
};

export default config; 