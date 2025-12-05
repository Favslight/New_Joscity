const db = require('../../config/database');

exports.getVerificationRequests = async (req, res) => {
  try {
    const requests = await db.query(
      `SELECT vr.*, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture,
              pg.page_name, pg.page_title, pg.page_picture
       FROM verification_requests vr
       LEFT JOIN users u ON vr.node_type = 'user' AND vr.node_id = u.user_id
       LEFT JOIN pages pg ON vr.node_type = 'page' AND vr.node_id = pg.page_id
       WHERE NOT (u.user_name IS NULL AND pg.page_name IS NULL) 
       AND vr.status = '0'
       ORDER BY vr.request_id DESC`
    );

    const formattedRequests = requests.rows.map(request => {
      const formatted = { ...request };
      
      if (request.node_type === "user") {
        formatted.user_picture = request.user_picture;
        formatted.color = 'primary';
      } else if (request.node_type === 'page') {
        formatted.page_picture = request.page_picture;
        formatted.color = 'info';
      }
      
      return formatted;
    });

    res.json({
      success: true,
      data: formattedRequests
    });
  } catch (error) {
    console.error('Get verification requests error:', error);
    res.status(500).json({ error: 'Failed to fetch verification requests' });
  }
};

exports.approveVerification = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the verification request first
    const request = await db.query(
      'SELECT * FROM verification_requests WHERE request_id = $1',
      [id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    const verificationRequest = request.rows[0];

    // Update the node's verification status based on type
    if (verificationRequest.node_type === 'user') {
      await db.query(
        'UPDATE users SET user_verified = $1 WHERE user_id = $2',
        ['1', verificationRequest.node_id]
      );
    } else if (verificationRequest.node_type === 'page') {
      await db.query(
        'UPDATE pages SET page_verified = $1 WHERE page_id = $2',
        ['1', verificationRequest.node_id]
      );
    }

    // Update verification request status
    await db.query(
      'UPDATE verification_requests SET status = $1 WHERE request_id = $2',
      ['1', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'verification_approve', `Approved ${verificationRequest.node_type} verification ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Verification approved successfully'
    });
  } catch (error) {
    console.error('Approve verification error:', error);
    res.status(500).json({ error: 'Failed to approve verification' });
  }
};

exports.rejectVerification = async (req, res) => {
  try {
    const { id } = req.params;

    // Update verification request status to rejected
    await db.query(
      'UPDATE verification_requests SET status = $1 WHERE request_id = $2',
      ['2', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'verification_reject', `Rejected verification request ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Verification rejected successfully'
    });
  } catch (error) {
    console.error('Reject verification error:', error);
    res.status(500).json({ error: 'Failed to reject verification' });
  }
};

exports.getVerifiedUsers = async (req, res) => {
  try {
    const users = await db.query(
      "SELECT * FROM users WHERE user_verified = '1' ORDER BY user_id DESC"
    );

    const formattedUsers = users.rows.map(user => ({
      ...user,
      user_picture: user.user_picture
    }));

    res.json({
      success: true,
      data: formattedUsers
    });
  } catch (error) {
    console.error('Get verified users error:', error);
    res.status(500).json({ error: 'Failed to fetch verified users' });
  }
};

exports.getVerifiedPages = async (req, res) => {
  try {
    const pages = await db.query(
      "SELECT * FROM pages WHERE page_verified = '1' ORDER BY page_id DESC"
    );

    const formattedPages = pages.rows.map(page => ({
      ...page,
      page_picture: page.page_picture
    }));

    res.json({
      success: true,
      data: formattedPages
    });
  } catch (error) {
    console.error('Get verified pages error:', error);
    res.status(500).json({ error: 'Failed to fetch verified pages' });
  }
};

exports.removeVerification = async (req, res) => {
  try {
    const { type, id } = req.params;

    if (type === 'user') {
      await db.query(
        'UPDATE users SET user_verified = $1 WHERE user_id = $2',
        ['0', id]
      );
    } else if (type === 'page') {
      await db.query(
        'UPDATE pages SET page_verified = $1 WHERE page_id = $2',
        ['0', id]
      );
    }

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'verification_remove', `Removed verification from ${type} ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Verification removed successfully'
    });
  } catch (error) {
    console.error('Remove verification error:', error);
    res.status(500).json({ error: 'Failed to remove verification' });
  }
};
