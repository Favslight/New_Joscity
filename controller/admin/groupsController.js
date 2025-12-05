const db = require('../../config/database');

exports.getGroups = async (req, res) => {
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
      whereClause = ` WHERE (g.group_name LIKE $1 OR g.group_title LIKE $2)`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }
    
    // Get groups with admin info
    const groups = await db.query(
      `SELECT g.*, 
              u.user_id, u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM groups g
       INNER JOIN users u ON g.group_admin = u.user_id
       ${whereClause} 
       ORDER BY g.group_id DESC 
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Format group data
    const formattedGroups = groups.rows.map(group => {
      return {
        ...group,
        group_picture: group.group_picture,
        user_picture: group.user_picture
      };
    });
    
    // Get total count
    const total = await db.query(
      `SELECT COUNT(*) as count FROM groups g ${whereClause}`,
      queryParams
    );
    
    res.json({
      success: true,
      data: formattedGroups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.rows[0].count,
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const { id } = req.params;
    
    const groups = await db.query(
      `SELECT g.*, u.* 
       FROM groups g
       INNER JOIN users u ON g.group_admin = u.user_id
       WHERE g.group_id = $1`,
      [id]
    );
    
    if (groups.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const group = groups.rows[0];
    
    // Get group categories
    const categories = await db.query("SELECT * FROM groups_categories");
    
    // Get countries if needed
    const countries = await db.query("SELECT * FROM system_countries");
    
    res.json({
      success: true,
      data: {
        ...group,
        categories: categories.rows,
        countries: countries.rows
      }
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'DELETE FROM groups WHERE group_id = $1',
      [id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'group_delete', `Deleted group ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};
