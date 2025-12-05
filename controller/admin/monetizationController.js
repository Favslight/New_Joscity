const db = require('../../config/database');

// Monetization Payments
exports.getMonetizationPayments = async (req, res) => {
  try {
    const payments = await db.query(
      `SELECT mp.*, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM monetization_payments mp
       INNER JOIN users u ON mp.user_id = u.user_id
       WHERE mp.status = '0'
       ORDER BY mp.payment_id DESC`
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
    console.error('Get monetization payments error:', error);
    res.status(500).json({ error: 'Failed to fetch monetization payments' });
  }
};

exports.approveMonetizationPayment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE monetization_payments SET status = $1 WHERE payment_id = $2',
      ['1', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'monetization_payment_approve', `Approved monetization payment ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Monetization payment approved successfully'
    });
  } catch (error) {
    console.error('Approve monetization payment error:', error);
    res.status(500).json({ error: 'Failed to approve monetization payment' });
  }
};

exports.rejectMonetizationPayment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE monetization_payments SET status = $1 WHERE payment_id = $2',
      ['2', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'monetization_payment_reject', `Rejected monetization payment ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Monetization payment rejected successfully'
    });
  } catch (error) {
    console.error('Reject monetization payment error:', error);
    res.status(500).json({ error: 'Failed to reject monetization payment' });
  }
};

// Monetization Statistics
exports.getMonetizationStats = async (req, res) => {
  try {
    // Total earnings
    const totalEarnings = await db.query(
      "SELECT SUM(amount) as total FROM monetization_payments WHERE status = '1'"
    );

    // This month earnings
    const monthEarnings = await db.query(
      "SELECT SUM(amount) as total FROM monetization_payments WHERE status = '1' AND EXTRACT(MONTH FROM time) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM time) = EXTRACT(YEAR FROM CURRENT_DATE)"
    );

    // Pending payments
    const pendingPayments = await db.query(
      "SELECT COUNT(*) as count, SUM(amount) as total FROM monetization_payments WHERE status = '0'"
    );

    // Top earners
    const topEarners = await db.query(
      `SELECT u.user_id, u.user_name, u.user_firstname, u.user_lastname, u.user_picture,
              COUNT(mp.payment_id) as total_payments, SUM(mp.amount) as total_earnings
       FROM monetization_payments mp
       INNER JOIN users u ON mp.user_id = u.user_id
       WHERE mp.status = '1'
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
        topEarners: topEarners.rows
      }
    });
  } catch (error) {
    console.error('Get monetization stats error:', error);
    res.status(500).json({ error: 'Failed to fetch monetization statistics' });
  }
};
