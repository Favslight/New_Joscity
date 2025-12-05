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
 * Business Registration - Submit for Review
 */
exports.businessSignup = async (req, res) => {
  const client = await getClient();
  
  try {
    const {
      business_phone,
      business_email,
      business_password,
      business_name,
      business_type,
      CAC_number,
      business_location
    } = req.body;

    // Business validation
    if (!business_phone || !business_email || !business_password || !business_location || !business_name || !business_type) {
      return res.status(400).json({
        error: true,
        message: 'All fields are required'
      });
    }

    await client.query('BEGIN');

    // Check if email exists
    const existingEmail = await client.query(
      'SELECT user_id FROM users WHERE user_email = $1',
      [business_email]
    );

    if (existingEmail.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({
        error: true,
        message: 'Email already registered'
      });
    }

    // Check if CAC number exists (if provided)
    if (CAC_number) {
      const existingBusiness = await client.query(
        'SELECT user_id FROM users WHERE CAC_number = $1',
        [CAC_number]
      );

      if (existingBusiness.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          error: true,
          message: 'Business registration number already registered'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(business_password, 12);

    // Insert business user
    const userResult = await client.query(
      `INSERT INTO users 
       (business_phone, 
        business_email, business_password,
        business_name, business_type, CAC_number, business_location, account_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'business')
       RETURNING user_id`,
      [
        business_phone,
        business_email, hashedPassword, business_name, business_type,
        CAC_number, business_location
      ]
    );

    await client.query('COMMIT');
    client.release();

    const insertedId = userResult.rows[0].user_id;

    // Send "under review" email
    await sendEmail(
      business_email,
      'Business Account Registration Under Review',
      `
      <h2>Business Registration Under Review</h2>
      <p>Dear ${business_name},</p>
      <p>Your business account registration has been received and is currently under review.</p>
      <p>We will verify your business details and notify you once your account is approved.</p>
      <p>You will receive an activation code via email when your account is approved.</p>
      <br>
      <p>Thank you for your patience.</p>
      `
    );

    res.status(201).json({
      success: true,
      message: 'Business registration submitted for review. You will receive an email once approved.',
      user_id: insertedId,
      status: 'under_review',
      account_type: 'business',
      business_name: business_name
    });

  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Business signup error:', error);
    res.status(500).json({
      error: true,
      message: 'Business registration failed. Please try again.'
    });
  }
};

/**
 * Business User Login (After Approval)
 */
exports.businessSignIn = async (req, res) => {
  try {
    const { business_email, business_password, activation_code } = req.body;

    // Find business user
    const userResult = await query(
      `SELECT user_id, business_email, business_password,
              account_status, activation_code, activation_expires, is_verified, 
              business_name, user_verified
       FROM users WHERE business_email = $1 AND account_type = 'business'`,
      [business_email]
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
        message: 'Business account is still under review. Please wait for approval.',
        status: 'pending'
      });
    }

    if (user.account_status === 'rejected') {
      return res.status(401).json({
        error: true,
        message: 'Business registration was rejected. Please contact support.',
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
    const validPassword = await bcrypt.compare(business_password, user.business_password);
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
        email: user.business_email,
        is_verified: true,
        account_type: 'business'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Prepare business user response
    const userResponse = {
      user_id: user.user_id,
      email: user.business_email,
      business_name: user.business_name,
      display_name: user.business_name,
      is_verified: true,
      has_verified_badge: user.user_verified === true,
      account_type: 'business'
    };

    res.json({
      success: true,
      message: 'Business login successful',
      token: token,
      user: userResponse
    });

  } catch (error) {
    console.error('Business login error:', error);
    res.status(500).json({
      error: true,
      message: 'Login failed'
    });
  }
};

/**
 * Business-specific: Update Business Details
 */
exports.updateBusinessDetails = async (req, res) => {
  try {
    const userId = req.user.user_id; // From JWT middleware
    const { 
      business_name, 
      business_type, 
      CAC_number, 
      business_location,
      business_phone
    } = req.body;

    // Update business details
    const result = await query(
      `UPDATE users 
       SET business_name = COALESCE($1, business_name),
           business_type = COALESCE($2, business_type),
           CAC_number = COALESCE($3, CAC_number),
           business_location = COALESCE($4, business_location),
           business_phone = COALESCE($5, user_phone),
           updated_at = NOW()
       WHERE user_id = $7 AND account_type = 'business'
       RETURNING business_name, business_type, business_location`,
      [business_name, business_type, CAC_number, business_location, 
       business_phone, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Business account not found'
      });
    }

    res.json({
      success: true,
      message: 'Business details updated successfully',
      business: result.rows[0]
    });

  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update business details'
    });
  }
};

/**
 * Get Business Profile
 */
exports.getBusinessProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await query(
      `SELECT user_id, business_name, business_type, CAC_number, business_location,
              business_email, business_phone, user_registered, is_verified,
              user_verified, account_status
       FROM users WHERE user_id = $1 AND account_type = 'business'`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Business profile not found'
      });
    }

    res.json({
      success: true,
      business: result.rows[0]
    });

  } catch (error) {
    console.error('Get business profile error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch business profile'
    });
  }
};