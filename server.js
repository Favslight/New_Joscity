const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Import routes
const authRoutes = require('./routes/authRoute');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/ping', (req, res) => {
  res.json({ 
    message: 'pong', 
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// 404 handler
/*app.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: 'Route not found',
    path: req.originalUrl
  });
});*/

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: true,
    message: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.SMTP_USER ? 'Configured' : 'Not configured'}`);
  console.log(`🗄️  Database: ${process.env.DB_HOST ? 'Configured' : 'Using defaults'}`);
});