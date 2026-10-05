const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
app.use(express.json());

// Simple logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Import the routes
const resumeJDRoutes = require('./routes/resumeJDRoutes');

// Register the routes
app.use('/api/ai', resumeJDRoutes);

// Test route to verify registration
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

// Error handler
app.use((req, res) => {
    console.log('[ERROR] Route not found:', req.method, req.path);
    res.status(404).json({ error: 'Not Found', path: req.path });
});

// Start server
const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log('Routes registered:');
    console.log('- POST /api/ai/analyze-resume-jd');
    console.log('- GET /api/ai/resume-jd-analysis');
    console.log('- GET /test');
});
