const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Hardcoded admin credentials
const ADMIN_EMAIL = "admin@joscity.com";
const ADMIN_PASSWORD = "admin123";

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check against hardcoded credentials
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid admin credentials' 
      });
    }

    // Create admin token
    const token = jwt.sign(
      { id: 'admin', email: email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        email: email,
        role: 'admin'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Admin login failed', 
      error: error.message 
    });
  }
});

module.exports = router;