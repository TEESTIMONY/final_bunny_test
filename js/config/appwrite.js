// Appwrite configuration
const config = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '67ffcfc5000ad67cf8c9',
    apiEndpoint: 'https://backend-jet-pi-38.vercel.app/api',
    hostURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? window.location.origin 
        : 'https://your-production-url.com' // Replace with your production URL when deploying
};

export default config; 