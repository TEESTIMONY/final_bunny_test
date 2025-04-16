require('dotenv').config();
const express = require('express');
const cors = require('cors');
const usersRouter = require('./api/users');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', usersRouter);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Hop Bunny API is running!' });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 