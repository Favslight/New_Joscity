const db = require('../../config/database');

// Funding Requests
exports.getFundingRequests = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = '';
    let queryParams = [];

    // Search filter
    if (search) {
      whereClause = ` WHERE (p.text LIKE $1 OR pf.title LIKE $2)`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }
    
    // Get funding requests with author info
    const requests = await db.query(
      `SELECT p.*, pf.title,
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM posts p
       INNER JOIN posts_funding pf ON p.post_id = pf.post_id AND p.post_type = 'funding'
       INNER JOIN users u ON p.user_id = u.user_id AND p.user_type = 'user'
       ${whereClause} 
       ORDER BY p.post_id DESC 
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Format funding request data
    const formattedRequests = requests.rows.map(request => ({
      ...request,
      author_name: request.user_firstname + ' ' + request.user_lastname,
      author_picture: request.user_picture,
      author_url: `/profile/${request.user_name}`
    }));
    
    // Get total count
    const total = await db.query(
      `SELECT COUNT(*) as count FROM posts p
       INNER JOIN posts_funding pf ON p.post_id = pf.post_id AND p.post_type = 'funding'
       INNER JOIN users u ON p.user_id = u.user_id AND p.user_type = 'user'
       ${whereClause}`,
      queryParams
    );
    
    res.json({
      success: true,
      data: formattedRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.rows[0].count,
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get funding requests error:', error);
    res.status(500).json({ error: 'Failed to fetch funding requests' });
  }
};

exports.deleteFundingRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'DELETE FROM posts WHERE post_id = $1',
      [id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'funding_delete', `Deleted funding request ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'Funding request deleted successfully'
    });
  } catch (error) {
    console.error('Delete funding request error:', error);
    res.status(500).json({ error: 'Failed to delete funding request' });
  }
};

// Funding Payments
exports.getFundingPayments = async (req, res) => {
  try {
    const payments = await db.query(
      `SELECT fp.*, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM funding_payments fp
       INNER JOIN users u ON fp.user_id = u.user_id
       WHERE fp.status = '0'
       ORDER BY fp.payment_id DESC`
    );

    const formattedPayments = payments.rows.map(payment => {
      const formatted = { ...payment, user_picture: payment.user_picture };
      
      // Set method colors
      switch (payment.method) {
        case 'paypal':
          formatted.method_color = "info";
          break;
        case 'skrill':
          formatted.method_color = "primary";
          break;
        case 'moneypoolscash':
          formatted.method_color = "success";
          break;
        case 'bank':
          formatted.method_color = "danger";
          break;
        case 'custom':
          formatted.method = "Custom";
          formatted.method_color = "warning";
          break;
      }
      
      return formatted;
    });

    res.json({
      success: true,
      data: formattedPayments
    });
  } catch (error) {
    console.error('Get funding payments error:', error);
    res.status(500).json({ error: 'Failed to fetch funding payments' });
  }
};

exports.approveFundingPayment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE funding_payments SET status = $1 WHERE payment_id = $2',
      ['1', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'funding_payment_approve', `Approved funding payment ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Funding payment approved successfully'
    });
  } catch (error) {
    console.error('Approve funding payment error:', error);
    res.status(500).json({ error: 'Failed to approve funding payment' });
  }
};
