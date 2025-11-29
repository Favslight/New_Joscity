const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Simple send email function
const sendEmail = async (to, subject, html) => {
  try {
    const msg = {
      to: to,
      from: process.env.EMAIL_FROM || 'noreply@yourapp.com', // Must be verified in SendGrid
      subject: subject,
      html: html,
    };

    const result = await sgMail.send(msg);
    console.log('✅ Email sent successfully to:', to);
    return result;
  } catch (error) {
    console.error('❌ SendGrid error:', error.response?.body || error.message);
    throw error;
  }
};

// Test function
const testEmail = async () => {
  try {
    console.log('🧪 Testing SendGrid...');
    await sendEmail(
      process.env.EMAIL_FROM, // Send test to yourself
      'SendGrid Test from Render',
      '<h1>It works! 🎉</h1><p>SendGrid is properly configured on Render.</p>'
    );
    console.log('✅ Test email sent! Check your inbox.');
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
};

module.exports = { sendEmail, testEmail };