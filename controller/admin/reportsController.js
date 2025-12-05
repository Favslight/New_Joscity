const db = require('../../config/database');

exports.getReports = async (req, res) => {
  try {
    const reports = await db.query(
      `SELECT r.*, rc.category_name, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_picture, u.user_gender
       FROM reports r
       INNER JOIN users u ON r.user_id = u.user_id
       LEFT JOIN reports_categories rc ON r.category_id = rc.category_id
       ORDER BY r.report_id DESC`
    );

    const formattedReports = await Promise.all(
      reports.rows.map(async (report) => {
        let node = {};
        
        // Get reported node based on type
        if (report.node_type === "user") {
          const userNode = await db.query(
            "SELECT user_name, user_firstname, user_lastname, user_gender, user_picture FROM users WHERE user_id = $1",
            [report.node_id]
          );
          if (userNode.rows.length > 0) {
            node = {
              ...userNode.rows[0],
              color: 'primary',
              name: 'user'
            };
          }
        } else if (report.node_type === 'page') {
          const pageNode = await db.query(
            "SELECT page_name, page_title, page_picture FROM pages WHERE page_id = $1",
            [report.node_id]
          );
          if (pageNode.rows.length > 0) {
            node = {
              ...pageNode.rows[0],
              color: 'info',
              name: 'page'
            };
          }
        } else if (report.node_type === 'group') {
          const groupNode = await db.query(
            "SELECT group_name, group_title, group_picture FROM groups WHERE group_id = $1",
            [report.node_id]
          );
          if (groupNode.rows.length > 0) {
            node = {
              ...groupNode.rows[0],
              color: 'warning',
              name: 'group'
            };
          }
        } else if (report.node_type === 'event') {
          const eventNode = await db.query(
            "SELECT event_title, event_cover FROM events WHERE event_id = $1",
            [report.node_id]
          );
          if (eventNode.rows.length > 0) {
            node = {
              ...eventNode.rows[0],
              color: 'success',
              name: 'event'
            };
          }
        } else if (report.node_type === 'post') {
          node = {
            color: 'danger',
            name: 'post'
          };
        }

        return {
          ...report,
          user_picture: report.user_picture,
          node
        };
      })
    );

    res.json({
      success: true,
      data: formattedReports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

exports.markReportSeen = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE reports SET seen = $1 WHERE report_id = $2',
      ['1', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'report_seen', `Marked report ID: ${id} as seen`]
    );

    res.json({
      success: true,
      message: 'Report marked as seen'
    });
  } catch (error) {
    console.error('Mark report seen error:', error);
    res.status(500).json({ error: 'Failed to mark report as seen' });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'DELETE FROM reports WHERE report_id = $1',
      [id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'report_delete', `Deleted report ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

// Reports Categories Management
exports.getReportCategories = async (req, res) => {
  try {
    const categories = await db.query(
      "SELECT * FROM reports_categories ORDER BY category_name"
    );

    res.json({
      success: true,
      data: categories.rows
    });
  } catch (error) {
    console.error('Get report categories error:', error);
    res.status(500).json({ error: 'Failed to fetch report categories' });
  }
};

exports.createReportCategory = async (req, res) => {
  try {
    const { category_name } = req.body;

    await db.query(
      'INSERT INTO reports_categories (category_name) VALUES ($1)',
      [category_name]
    );

    res.json({
      success: true,
      message: 'Report category created successfully'
    });
  } catch (error) {
    console.error('Create report category error:', error);
    res.status(500).json({ error: 'Failed to create report category' });
  }
};

exports.updateReportCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name } = req.body;

    await db.query(
      'UPDATE reports_categories SET category_name = $1 WHERE category_id = $2',
      [category_name, id]
    );

    res.json({
      success: true,
      message: 'Report category updated successfully'
    });
  } catch (error) {
    console.error('Update report category error:', error);
    res.status(500).json({ error: 'Failed to update report category' });
  }
};

exports.deleteReportCategory = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'DELETE FROM reports_categories WHERE category_id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Report category deleted successfully'
    });
  } catch (error) {
    console.error('Delete report category error:', error);
    res.status(500).json({ error: 'Failed to delete report category' });
  }
};
