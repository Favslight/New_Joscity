const db = require('../../config/database');

exports.getSettings = async (req, res) => {
  try {
    const { group } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    if (group) {
      whereClause = 'WHERE option_group = $1';
      queryParams.push(group);
    }
    
    const settings = await db.query(
      `SELECT * FROM system_options ${whereClause} ORDER BY option_group, option_name`,
      queryParams
    );
    
    // Group settings by their groups
    const groupedSettings = {};
    settings.rows.forEach(setting => {
      if (!groupedSettings[setting.option_group]) {
        groupedSettings[setting.option_group] = [];
      }
      groupedSettings[setting.option_group].push(setting);
    });
    
    res.json({
      success: true,
      data: groupedSettings,
      groups: Object.keys(groupedSettings)
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    for (const [optionName, optionValue] of Object.entries(settings)) {
      await db.query(
        'UPDATE system_options SET option_value = $1, updated_at = CURRENT_TIMESTAMP WHERE option_name = $2',
        [optionValue, optionName]
      );
    }
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'settings_update', 'Updated system settings']
    );
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

exports.getRegistrationSettings = async (req, res) => {
  try {
    const settings = await db.query(
      'SELECT * FROM system_options WHERE option_group = $1 ORDER BY option_name',
      ['registration']
    );
    
    res.json({
      success: true,
      data: settings.rows
    });
  } catch (error) {
    console.error('Get registration settings error:', error);
    res.status(500).json({ error: 'Failed to fetch registration settings' });
  }
};

exports.updateRegistrationSettings = async (req, res) => {
  try {
    const { registration_approval_required } = req.body;
    
    await db.query(
      'UPDATE system_options SET option_value = $1 WHERE option_name = $2',
      [registration_approval_required ? '1' : '0', 'registration_approval_required']
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'settings_update', `Updated registration approval setting to: ${registration_approval_required}`]
    );
    
    res.json({
      success: true,
      message: 'Registration settings updated successfully'
    });
  } catch (error) {
    console.error('Update registration settings error:', error);
    res.status(500).json({ error: 'Failed to update registration settings' });
  }
};
