const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../config/database');
const { sendEmail } = require('../config/emailConfig');

// Helper function to generate activation code
const generateActivationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to generate reset code
const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Personal User Registration - Submit for Review
 */
exports.personalSignup = async (req, res) => {
  const client = await getClient();
  
  try {
    const {
      user_firstname,
      user_lastname,
      user_gender,
      user_phone,
      nin_number,
      user_email,
      user_password,
      address
    } = req.body;

    // Validation
    if (!user_firstname || !user_lastname || !user_gender || !user_phone || !nin_number || 
        !user_email || !user_password || !address) {
      return res.status(400).json({
        error: true,
        message: 'All fields are required'
      });
    }

    await client.query('BEGIN');

    // Check if email exists
    const existingEmail = await client.query(
      'SELECT user_id FROM users WHERE user_email = $1',
      [user_email]
    );

    if (existingEmail.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({
        error: true,
        message: 'Email already registered'
      });
    }

    // Check if NIN exists
    const existingNIN = await client.query(
      'SELECT user_id FROM users WHERE nin_number = $1',
      [nin_number]
    );

    if (existingNIN.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({
        error: true,
        message: 'NIN number already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(user_password, 12);
    const full_name = `${user_firstname} ${user_lastname}`;
    const user_name = `${user_firstname}${user_lastname}`.toLowerCase().replace(/\s+/g, '');

    // Insert personal user
    const userResult = await client.query(
      `INSERT INTO users 
       (user_firstname, user_lastname, user_gender, user_phone, nin_number, 
        user_email, user_password, address, account_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'personal')
       RETURNING user_id`,
      [user_firstname, user_lastname, user_gender, user_phone, 
       nin_number, user_email, hashedPassword, address]
    );

    await client.query('COMMIT');
    client.release();

    const insertedId = userResult.rows[0].user_id;

    // Send "under review" email
    await sendEmail(
      user_email,
      'Account Registration Under Review',
      `
      <h2>Registration Under Review</h2>
      <p>Dear ${user_firstname} ${user_lastname},</p>
      <p>Your personal account registration has been received and is currently under review.</p>
      <p>We will verify your details and notify you once your account is approved.</p>
      <p>You will receive an activation code via email when your account is approved.</p>
      <br>
      <p>Thank you for your patience.</p>
      `
    );

    res.status(201).json({
      success: true,
      message: 'Registration submitted for review. You will receive an email once approved.',
      user_id: insertedId,
      status: 'under_review',
      account_type: 'personal'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Personal signup error:', error);
    res.status(500).json({
      error: true,
      message: 'Registration failed. Please try again.'
    });
  }
};

/**
 * Personal User Login (After Approval)
 */
exports.personalSignIn = async (req, res) => {
  try {
    const { email, password, activation_code } = req.body;

    // Find user
    const userResult = await query(
      `SELECT user_id, user_email, user_password, user_firstname, user_lastname,
              account_status, activation_code, activation_expires, is_verified, user_verified
       FROM users WHERE user_email = $1 AND account_type = 'personal'`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: true,
        message: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];

    // Check account status
    if (user.account_status === 'pending') {
      return res.status(401).json({
        error: true,
        message: 'Account is still under review. Please wait for approval.',
        status: 'pending'
      });
    }

    if (user.account_status === 'rejected') {
      return res.status(401).json({
        error: true,
        message: 'Account registration was rejected. Please contact support.',
        status: 'rejected'
      });
    }

    // Verify activation code
    if (!activation_code || user.activation_code !== activation_code) {
      return res.status(401).json({
        error: true,
        message: 'Invalid activation code'
      });
    }

    // Check if activation code expired
    if (new Date() > new Date(user.activation_expires)) {
      return res.status(401).json({
        error: true,
        message: 'Activation code has expired. Please contact support for a new one.'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.user_password);
    if (!validPassword) {
      return res.status(401).json({
        error: true,
        message: 'Invalid email or password'
      });
    }

    // Mark as verified on first successful login
    if (!user.is_verified) {
      await query(
        'UPDATE users SET is_verified = true, verified_at = NOW(), activation_code = NULL WHERE user_id = $1',
        [user.user_id]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.user_email,
        is_verified: true,
        account_type: 'personal'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Prepare user response
    const userResponse = {
      user_id: user.user_id,
      email: user.user_email,
      first_name: user.user_firstname,
      last_name: user.user_lastname,
      display_name: `${user.user_firstname} ${user.user_lastname}`,
      is_verified: true,
      has_verified_badge: user.user_verified === true,
      account_type: 'personal'
    };

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: userResponse
    });

  } catch (error) {
    console.error('Personal login error:', error);
    res.status(500).json({
      error: true,
      message: 'Login failed'
    });
  }
};

/**
 * Get All Pending Approvals (Personal & Business - For Admin)
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    const pendingUsers = await query(
      `SELECT u.user_id, u.user_name, u.user_firstname, u.user_lastname, u.user_phone, u.nin_number, 
              u.user_email, u.address, u.user_registered, u.account_type,
              u.business_name, u.business_type, u.CAC_number, u.business_location
       FROM users u
       WHERE u.account_status = 'pending'
       ORDER BY u.user_registered DESC`
    );

    res.json({
      success: true,
      data: pendingUsers.rows
    });

  } catch (error) {
    console.error('Get pending error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch pending approvals'
    });
  }
};

/**
 * Admin Approve Account (Works for both Personal & Business)
 */
exports.approveAccount = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Generate activation code
    const activationCode = generateActivationCode();
    const activationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Update user status
    const result = await query(
      `UPDATE users 
       SET account_status = 'approved',
           activation_code = $1,
           activation_expires = $2
       WHERE user_id = $3 AND account_status = 'pending'`,
      [activationCode, activationExpires, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found or already processed'
      });
    }

    // Get user details
    const userResult = await query(
      'SELECT user_email, user_firstname, user_lastname, account_type, business_name FROM users WHERE user_id = $1',
      [user_id]
    );

    const user = userResult.rows[0];

    // Send approval email
    const emailSubject = user.account_type === 'business'
      ? 'Business Account Approved - Activation Code'
      : 'Account Approved - Activation Code';

    const recipientName = user.account_type === 'business'
      ? user.business_name
      : `${user.user_firstname} ${user.user_lastname}`;

    const accountType = user.account_type === 'business' ? 'business' : 'personal';

    const emailTemplate = `
      <h2>${accountType === 'business' ? 'Business' : ''} Account Approved!</h2>
      <p>Dear ${recipientName},</p>
      <p>Your ${accountType} account has been approved! You can now login to your account.</p>
      <p><strong>Your Activation Code: ${activationCode}</strong></p>
      <p><em>This code will expire in 48 hours.</em></p>
      <br>
      <p>Use this code along with your email and password to login.</p>
      <p>Welcome to our platform!</p>
    `;

    await sendEmail(user.user_email, emailSubject, emailTemplate);

    res.json({
      success: true,
      message: 'Account approved and activation code sent to user'
    });

  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({
      error: true,
      message: 'Account approval failed'
    });
  }
};

/**
 * Admin Reject Account (Works for both Personal & Business)
 */
exports.rejectAccount = async (req, res) => {
  try {
    const { user_id, reason } = req.body;

    // Update user status
    const result = await query(
      `UPDATE users 
       SET account_status = 'rejected'
       WHERE user_id = $1 AND account_status = 'pending'`,
      [user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found or already processed'
      });
    }

    // Get user details
    const userResult = await query(
      'SELECT user_email, user_firstname, user_lastname, account_type, business_name FROM users WHERE user_id = $1',
      [user_id]
    );

    const user = userResult.rows[0];

    // Send rejection email
    const recipientName = user.account_type === 'business'
      ? user.business_name
      : `${user.user_firstname} ${user.user_lastname}`;

    await sendEmail(
      user.user_email,
      'Account Registration Update',
      `
      <h2>Registration Status Update</h2>
      <p>Dear ${recipientName},</p>
      <p>We regret to inform you that your ${user.account_type} account registration could not be approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <br>
      <p>If you believe this is an error, please contact our support team.</p>
      `
    );

    res.json({
      success: true,
      message: 'Account rejected and user notified'
    });

  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({
      error: true,
      message: 'Account rejection failed'
    });
  }
};

/**
 * Forgot Password - Request reset (Works for both)
 */
exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const userResult = await query(
      `SELECT user_id, user_firstname, user_lastname, business_name, account_type 
       FROM users 
       WHERE user_email = $1 AND account_status = 'approved'`,
      [email]
    );

    if (userResult.rows.length === 0) {
      // Security: Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If the email exists, a reset code has been sent'
      });
    }

    const user = userResult.rows[0];
    const resetCode = generateResetCode();
    const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000);

    await query(
      'UPDATE users SET reset_code = $1, reset_expires = $2 WHERE user_id = $3',
      [resetCode, resetExpires, user.user_id]
    );

    const recipientName = user.account_type === 'business' 
      ? user.business_name 
      : `${user.user_firstname} ${user.user_lastname}`;

    await sendEmail(
      email,
      'Password Reset Code',
      `
      <h2>Password Reset Request</h2>
      <p>Dear ${recipientName},</p>
      <p>You requested to reset your password. Use the code below:</p>
      <p><strong>Reset Code: ${resetCode}</strong></p>
      <p><em>This code will expire in 1 hour.</em></p>
      <br>
      <p>If you didn't request this, please ignore this email.</p>
      `
    );

    res.json({
      success: true,
      message: 'If the email exists, a reset code has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: true,
      message: 'Password reset request failed'
    });
  }
};

/**
 * Confirm Reset Code (Works for both)
 */
exports.forgetPasswordConfirm = async (req, res) => {
  try {
    const { email, reset_key } = req.body;

    const userResult = await query(
      'SELECT user_id FROM users WHERE user_email = $1 AND reset_code = $2 AND reset_expires > NOW()',
      [email, reset_key]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid or expired reset code'
      });
    }

    res.json({
      success: true,
      message: 'Reset code verified successfully'
    });

  } catch (error) {
    console.error('Reset confirm error:', error);
    res.status(500).json({
      error: true,
      message: 'Reset code verification failed'
    });
  }
};

/**
 * Reset Password (Works for both)
 */
exports.forgetPasswordReset = async (req, res) => {
  try {
    const { email, reset_key, password, confirm } = req.body;

    if (password !== confirm) {
      return res.status(400).json({
        error: true,
        message: 'Passwords do not match'
      });
    }

    const userResult = await query(
      'SELECT user_id FROM users WHERE user_email = $1 AND reset_code = $2 AND reset_expires > NOW()',
      [email, reset_key]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid or expired reset code'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await query(
      'UPDATE users SET user_password = $1, reset_code = NULL, reset_expires = NULL WHERE user_id = $2',
      [hashedPassword, userResult.rows[0].user_id]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: true,
      message: 'Password reset failed'
    });
  }
};

/**
 * Resend Activation Code (Works for both)
 */
exports.resendActivation = async (req, res) => {
  try {
    const { email } = req.body;

    const userResult = await query(
      `SELECT user_id, user_firstname, user_lastname, business_name, account_type 
       FROM users WHERE user_email = $1 AND account_status = 'approved'`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Email not found or account not approved'
      });
    }

    const user = userResult.rows[0];
    const newActivationCode = generateActivationCode();
    const activationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await query(
      'UPDATE users SET activation_code = $1, activation_expires = $2 WHERE user_id = $3',
      [newActivationCode, activationExpires, user.user_id]
    );

    const recipientName = user.account_type === 'business' 
      ? user.business_name 
      : `${user.user_firstname} ${user.user_lastname}`;

    await sendEmail(
      email,
      'New Activation Code',
      `
      <h2>New Activation Code</h2>
      <p>Dear ${recipientName},</p>
      <p>Your new activation code is: <strong>${newActivationCode}</strong></p>
      <p><em>This code will expire in 48 hours.</em></p>
      <p>Use this code along with your email and password to login.</p>
      `
    );

    res.json({
      success: true,
      message: 'New activation code sent to your email'
    });

  } catch (error) {
    console.error('Resend activation error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to resend activation code'
    });
  }
};

/**
 * User Logout (Works for both)
 */
exports.signOut = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: true,
      message: 'Logout failed'
    });
  }
};