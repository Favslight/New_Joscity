const db = require('../config/database');

exports.adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const users = await db.query(
      'SELECT user_id, user_group FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (users.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users.rows[0];
    
    if (user.user_group !== 1 && user.user_group !== 2) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

exports.superAdminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const users = await db.query(
      'SELECT user_id, user_group FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (users.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users.rows[0];
    
    if (user.user_group !== 1) {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    req.admin = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};
