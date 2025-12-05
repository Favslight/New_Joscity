const db = require('../../config/database');

exports.getPointsPayments = async (req, res) => {
  try {
    const payments = await db.query(
      `SELECT pp.*, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM points_payments pp
       INNER JOIN users u ON pp.user_id = u.user_id
       WHERE pp.status = '0'
       ORDER BY pp.payment_id DESC`
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
    console.error('Get points payments error:', error);
    res.status(500).json({ error: 'Failed to fetch points payments' });
  }
};

exports.approvePointsPayment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE points_payments SET status = $1 WHERE payment_id = $2',
      ['1', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'points_payment_approve', `Approved points payment ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Points payment approved successfully'
    });
  } catch (error) {
    console.error('Approve points payment error:', error);
    res.status(500).json({ error: 'Failed to approve points payment' });
  }
};

exports.rejectPointsPayment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE points_payments SET status = $1 WHERE payment_id = $2',
      ['2', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'points_payment_reject', `Rejected points payment ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Points payment rejected successfully'
    });
  } catch (error) {
    console.error('Reject points payment error:', error);
    res.status(500).json({ error: 'Failed to reject points payment' });
  }
};
