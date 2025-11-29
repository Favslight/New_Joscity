const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter with enhanced options
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  // Add connection timeouts and retries
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 15000,
  // Additional security options
  tls: {
    rejectUnauthorized: false // Set to true in production with valid cert
  }
});

// Enhanced verification function
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.log('❌ Email configuration error:', error.message);
    
    // Provide specific guidance based on error
    if (error.code === 'EAUTH') {
      console.log('🔐 Authentication failed. Check your email and password.');
      console.log('💡 For Gmail: Enable 2FA and use an App Password');
    } else if (error.code === 'ECONNECTION') {
      console.log('🌐 Connection failed. Check network or SMTP settings.');
    } else if (error.message.includes('Connection closed')) {
      console.log('🔒 Connection closed. Possible reasons:');
      console.log('   - Incorrect SMTP credentials');
      console.log('   - Network firewall blocking SMTP');
      console.log('   - Email provider requiring App Password');
    }
    return false;
  }
};

// Call verification on startup
verifyTransporter();

// Send email function
const sendEmail = async (to, subject, html, text = '') => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Your App" <noreply@yourapp.com>',
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, '') // Fallback text version
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent to:', to);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    // Specific error handling
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Check SMTP credentials.');
    } else if (error.code === 'ECONNECTION') {
      throw new Error('Cannot connect to email server. Check network connection.');
    } else {
      throw error;
    }
  }
};

// Test email function (optional - for testing)
const testEmail = async () => {
  try {
    console.log('🧪 Testing email configuration...');
    const result = await sendEmail(
      process.env.SMTP_USER, // Send test to yourself
      'Test Email from Your App',
      '<h1>Test Email</h1><p>If you received this, email is working!</p>',
      'Test Email - If you received this, email is working!'
    );
    console.log('✅ Test email sent successfully!');
    return result;
  } catch (error) {
    console.log('❌ Test email failed:', error.message);
    return null;
  }
};

module.exports = { sendEmail, testEmail, verifyTransporter };