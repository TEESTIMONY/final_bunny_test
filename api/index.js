module.exports = (req, res) => {
  res.json({
    message: 'Hop Bunny API is running!',
    timestamp: new Date().toISOString()
  });
}; 