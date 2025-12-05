const db = require('../../config/database');

exports.getUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search,
      group 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    
    // Status filters
    if (status === 'pending') {
      whereClause += ' AND user_approved = $1 AND account_status = $2';
      queryParams.push('0', 'pending');
    } else if (status === 'banned') {
      whereClause += ' AND user_banned = $1';
      queryParams.push('1');
    } else if (status === 'not_activated') {
      whereClause += ' AND user_activated = $1';
      queryParams.push('0');
    } else if (status === 'approved') {
      whereClause += ' AND user_approved = $1';
      queryParams.push('1');
    } else if (status === 'online') {
      whereClause += ' AND user_last_seen >= NOW() - INTERVAL $1';
      queryParams.push('15 minutes');
    }

    // User group filter
    if (group) {
      whereClause += ' AND user_group = $' + (queryParams.length + 1);
      queryParams.push(group);
    }

    // Search filter
    if (search) {
      whereClause += ` AND (user_name LIKE $${queryParams.length + 1} OR user_firstname LIKE $${queryParams.length + 2} OR user_lastname LIKE $${queryParams.length + 3} OR user_email LIKE $${queryParams.length + 4} OR user_phone LIKE $${queryParams.length + 5})`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Get users
    const users = await db.query(
      `SELECT user_id, user_name, user_firstname, user_lastname, user_email, user_phone, 
              user_gender, user_picture, user_cover, user_registered, user_last_seen,
              user_activated, user_approved, user_banned, user_verified, user_group,
              account_status, nin_number, address
       FROM users ${whereClause} 
       ORDER BY user_id DESC 
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Get total count
    const total = await db.query(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      queryParams
    );
    
    res.json({
      success: true,
      data: users.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.rows[0].count,
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const users = await db.query(
      `SELECT * FROM users WHERE user_id = $1`,
      [id]
    );
    
    if (users.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user sessions
    const sessions = await db.query(
      'SELECT * FROM users_sessions WHERE user_id = $1 ORDER BY last_activity DESC',
      [id]
    );
    
    // Get user posts count
    const postsCount = await db.query(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = $1 AND user_type = $2',
      [id, 'user']
    );
    
    const user = users.rows[0];
    user.sessions = sessions.rows;
    user.posts_count = postsCount.rows[0].count;
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE users SET user_approved = $1, account_status = $2 WHERE user_id = $3',
      ['1', 'approved', id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'user_approval', `Approved user ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'User approved successfully'
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    await db.query(
      'UPDATE users SET user_banned = $1, user_banned_message = $2 WHERE user_id = $3',
      ['1', reason, id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'user_ban', `Banned user ID: ${id}. Reason: ${reason}`]
    );
    
    res.json({
      success: true,
      message: 'User banned successfully'
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE users SET user_banned = $1, user_banned_message = NULL WHERE user_id = $2',
      ['0', id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'user_unban', `Unbanned user ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'User unbanned successfully'
    });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE users SET user_verified = $1 WHERE user_id = $2',
      ['1', id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'user_verification', `Verified user ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'User verified successfully'
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

exports.updateUserGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_group } = req.body;
    
    await db.query(
      'UPDATE users SET user_group = $1 WHERE user_id = $2',
      [user_group, id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'user_group_update', `Updated user group to ${user_group} for user ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'User group updated successfully'
    });
  } catch (error) {
    console.error('Update user group error:', error);
    res.status(500).json({ error: 'Failed to update user group' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'DELETE FROM users WHERE user_id = $1',
      [id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'user_delete', `Deleted user ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
