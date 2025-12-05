const db = require('../../config/database');

// Packages Management
exports.getPackages = async (req, res) => {
  try {
    const packages = await db.query(
      `SELECT p.*, pg.permissions_group_title
       FROM packages p
       LEFT JOIN permissions_groups pg ON p.package_permissions_group_id = pg.permissions_group_id
       ORDER BY p.package_id DESC`
    );

    const formattedPackages = packages.rows.map(pkg => ({
      ...pkg,
      icon: pkg.icon // You might want to use your get_picture function here
    }));

    res.json({
      success: true,
      data: formattedPackages
    });
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
};

exports.getPackage = async (req, res) => {
  try {
    const { id } = req.params;

    const package = await db.query(
      `SELECT p.*, pg.permissions_group_title
       FROM packages p
       LEFT JOIN permissions_groups pg ON p.package_permissions_group_id = pg.permissions_group_id
       WHERE p.package_id = $1`,
      [id]
    );

    if (package.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Get permissions groups for dropdown
    const permissionsGroups = await db.query("SELECT * FROM permissions_groups");

    res.json({
      success: true,
      data: {
        ...package.rows[0],
        permissions_groups: permissionsGroups.rows
      }
    });
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
};

exports.createPackage = async (req, res) => {
  try {
    const { 
      name, price, period, period_num, 
      color, icon, permissions_group_id, 
      featured, boost_posts, boost_pages 
    } = req.body;

    await db.query(
      `INSERT INTO packages (name, price, period, period_num, color, icon, 
       package_permissions_group_id, featured, boost_posts, boost_pages) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [name, price, period, period_num, color, icon, permissions_group_id, 
       featured ? '1' : '0', boost_posts ? '1' : '0', boost_pages ? '1' : '0']
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'package_create', `Created package: ${name}`]
    );

    res.json({
      success: true,
      message: 'Package created successfully'
    });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, price, period, period_num, 
      color, icon, permissions_group_id, 
      featured, boost_posts, boost_pages 
    } = req.body;

    await db.query(
      `UPDATE packages SET name = $1, price = $2, period = $3, period_num = $4, 
       color = $5, icon = $6, package_permissions_group_id = $7, 
       featured = $8, boost_posts = $9, boost_pages = $10 
       WHERE package_id = $11`,
      [name, price, period, period_num, color, icon, permissions_group_id,
       featured ? '1' : '0', boost_posts ? '1' : '0', boost_pages ? '1' : '0', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'package_update', `Updated package ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Package updated successfully'
    });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
};

exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'DELETE FROM packages WHERE package_id = $1',
      [id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'package_delete', `Deleted package ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
};

// Subscribers Management
exports.getSubscribers = async (req, res) => {
  try {
    const subscribers = await db.query(
      `SELECT u.user_id, u.user_name, u.user_firstname, u.user_lastname, 
              u.user_gender, u.user_picture, u.user_subscription_date,
              p.*
       FROM users u
       INNER JOIN packages p ON u.user_package = p.package_id
       WHERE u.user_subscribed = '1'
       ORDER BY u.user_subscription_date DESC`
    );

    const formattedSubscribers = subscribers.rows.map(sub => {
      const subscriber = {
        ...sub,
        icon: sub.icon,
        user_picture: sub.user_picture
      };

      // Calculate subscription end date and time left
      let duration = 0;
      switch (sub.period) {
        case 'day':
          duration = 86400;
          break;
        case 'week':
          duration = 604800;
          break;
        case 'month':
          duration = 2629743;
          break;
        case 'year':
          duration = 31556926;
          break;
      }
      
      const subscriptionEnd = new Date(sub.user_subscription_date).getTime() + (sub.period_num * duration * 1000);
      subscriber.subscription_end = subscriptionEnd;
      subscriber.subscription_timeleft = Math.ceil((subscriptionEnd - Date.now()) / (1000 * 60 * 60 * 24));

      return subscriber;
    });

    res.json({
      success: true,
      data: formattedSubscribers
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
};
