const db = require('../../config/database');

exports.getWalletPaymentRequests = async (req, res) => {
  try {
    const requests = await db.query(
      `SELECT wp.*, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM wallet_payments wp
       INNER JOIN users u ON wp.user_id = u.user_id
       WHERE wp.status = '0'
       ORDER BY wp.payment_id DESC`
    );

    const formattedRequests = requests.rows.map(request => {
      const formatted = { ...request, user_picture: request.user_picture };
      
      // Set method colors
      switch (request.method) {
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
      data: formattedRequests
    });
  } catch (error) {
    console.error('Get wallet payment requests error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet payment requests' });
  }
};

exports.approveWalletPayment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE wallet_payments SET status = $1 WHERE payment_id = $2',
      ['1', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'wallet_payment_approve', `Approved wallet payment ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Wallet payment approved successfully'
    });
  } catch (error) {
    console.error('Approve wallet payment error:', error);
    res.status(500).json({ error: 'Failed to approve wallet payment' });
  }
};

exports.rejectWalletPayment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE wallet_payments SET status = $1 WHERE payment_id = $2',
      ['2', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'wallet_payment_reject', `Rejected wallet payment ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Wallet payment rejected successfully'
    });
  } catch (error) {
    console.error('Reject wallet payment error:', error);
    res.status(500).json({ error: 'Failed to reject wallet payment' });
  }
};
