const db = require('../../config/database');

exports.getAffiliatePayments = async (req, res) => {
  try {
    const payments = await db.query(
      `SELECT ap.*, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM affiliates_payments ap
       INNER JOIN users u ON ap.user_id = u.user_id
       WHERE ap.status = '0'
       ORDER BY ap.payment_id DESC`
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
          formatted.method = "Custom"; // You can get this from system settings
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
    console.error('Get affiliate payments error:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate payments' });
  }
};

exports.approveAffiliatePayment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE affiliates_payments SET status = $1 WHERE payment_id = $2',
      ['1', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'affiliate_payment_approve', `Approved affiliate payment ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Affiliate payment approved successfully'
    });
  } catch (error) {
    console.error('Approve affiliate payment error:', error);
    res.status(500).json({ error: 'Failed to approve affiliate payment' });
  }
};

exports.rejectAffiliatePayment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE affiliates_payments SET status = $1 WHERE payment_id = $2',
      ['2', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'affiliate_payment_reject', `Rejected affiliate payment ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Affiliate payment rejected successfully'
    });
  } catch (error) {
    console.error('Reject affiliate payment error:', error);
    res.status(500).json({ error: 'Failed to reject affiliate payment' });
  }
};

// Affiliate Statistics
exports.getAffiliateStats = async (req, res) => {
  try {
    // Total affiliate earnings
    const totalEarnings = await db.query(
      "SELECT SUM(amount) as total FROM affiliates_payments WHERE status = '1'"
    );

    // This month earnings
    const monthEarnings = await db.query(
      "SELECT SUM(amount) as total FROM affiliates_payments WHERE status = '1' AND EXTRACT(MONTH FROM time) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM time) = EXTRACT(YEAR FROM CURRENT_DATE)"
    );

    // Pending payments
    const pendingPayments = await db.query(
      "SELECT COUNT(*) as count, SUM(amount) as total FROM affiliates_payments WHERE status = '0'"
    );

    // Top affiliates
    const topAffiliates = await db.query(
      `SELECT u.user_id, u.user_name, u.user_firstname, u.user_lastname, u.user_picture,
              COUNT(ap.payment_id) as total_payments, SUM(ap.amount) as total_earnings
       FROM affiliates_payments ap
       INNER JOIN users u ON ap.user_id = u.user_id
       WHERE ap.status = '1'
       GROUP BY u.user_id, u.user_name, u.user_firstname, u.user_lastname, u.user_picture
       ORDER BY total_earnings DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        totalEarnings: parseFloat(totalEarnings.rows[0].total || 0),
        monthEarnings: parseFloat(monthEarnings.rows[0].total || 0),
        pendingPayments: {
          count: parseInt(pendingPayments.rows[0].count),
          total: parseFloat(pendingPayments.rows[0].total || 0)
        },
        topAffiliates: topAffiliates.rows
      }
    });
  } catch (error) {
    console.error('Get affiliate stats error:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate statistics' });
  }
};
