const db = require('../../config/database');

// Users Ads
exports.getUsersAds = async (req, res) => {
  try {
    const campaigns = await db.query(
      `SELECT ac.*, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM ads_campaigns ac
       INNER JOIN users u ON ac.campaign_user_id = u.user_id
       WHERE ac.campaign_is_declined = '0'
       ORDER BY ac.campaign_id DESC`
    );

    const formattedCampaigns = campaigns.rows.map(campaign => ({
      ...campaign,
      user_picture: campaign.user_picture
    }));

    // Separate approved and pending campaigns
    const approved = formattedCampaigns.filter(camp => camp.campaign_is_approved);
    const pending = formattedCampaigns.filter(camp => !camp.campaign_is_approved);

    res.json({
      success: true,
      data: {
        approved,
        pending
      }
    });
  } catch (error) {
    console.error('Get users ads error:', error);
    res.status(500).json({ error: 'Failed to fetch users ads' });
  }
};

exports.approveUserAd = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE ads_campaigns SET campaign_is_approved = $1 WHERE campaign_id = $2',
      ['1', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'ad_approve', `Approved user ad campaign ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Ad campaign approved successfully'
    });
  } catch (error) {
    console.error('Approve user ad error:', error);
    res.status(500).json({ error: 'Failed to approve ad campaign' });
  }
};

exports.declineUserAd = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE ads_campaigns SET campaign_is_declined = $1 WHERE campaign_id = $2',
      ['1', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'ad_decline', `Declined user ad campaign ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Ad campaign declined successfully'
    });
  } catch (error) {
    console.error('Decline user ad error:', error);
    res.status(500).json({ error: 'Failed to decline ad campaign' });
  }
};

// System Ads
exports.getSystemAds = async (req, res) => {
  try {
    const ads = await db.query(
      "SELECT * FROM ads_system ORDER BY ads_id DESC"
    );

    res.json({
      success: true,
      data: ads.rows
    });
  } catch (error) {
    console.error('Get system ads error:', error);
    res.status(500).json({ error: 'Failed to fetch system ads' });
  }
};

exports.getSystemAd = async (req, res) => {
  try {
    const { id } = req.params;

    const ad = await db.query(
      "SELECT * FROM ads_system WHERE ads_id = $1",
      [id]
    );

    if (ad.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json({
      success: true,
      data: ad.rows[0]
    });
  } catch (error) {
    console.error('Get system ad error:', error);
    res.status(500).json({ error: 'Failed to fetch system ad' });
  }
};

exports.createSystemAd = async (req, res) => {
  try {
    const { title, code, place } = req.body;

    await db.query(
      'INSERT INTO ads_system (title, code, place) VALUES ($1, $2, $3)',
      [title, code, place]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'ad_create', `Created system ad: ${title}`]
    );

    res.json({
      success: true,
      message: 'System ad created successfully'
    });
  } catch (error) {
    console.error('Create system ad error:', error);
    res.status(500).json({ error: 'Failed to create system ad' });
  }
};

exports.updateSystemAd = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, code, place } = req.body;

    await db.query(
      'UPDATE ads_system SET title = $1, code = $2, place = $3 WHERE ads_id = $4',
      [title, code, place, id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'ad_update', `Updated system ad ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'System ad updated successfully'
    });
  } catch (error) {
    console.error('Update system ad error:', error);
    res.status(500).json({ error: 'Failed to update system ad' });
  }
};

exports.deleteSystemAd = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'DELETE FROM ads_system WHERE ads_id = $1',
      [id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'ad_delete', `Deleted system ad ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'System ad deleted successfully'
    });
  } catch (error) {
    console.error('Delete system ad error:', error);
    res.status(500).json({ error: 'Failed to delete system ad' });
  }
};
