const db = require('../../config/database');

exports.getPages = async (req, res) => {
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
      whereClause = ` WHERE (pg.page_name LIKE $1 OR pg.page_title LIKE $2)`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }
    
    // Get pages with admin info
    const pages = await db.query(
      `SELECT pg.*, 
              u.user_id, u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM pages pg
       INNER JOIN users u ON pg.page_admin = u.user_id
       ${whereClause} 
       ORDER BY pg.page_id DESC 
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Format page data
    const formattedPages = pages.rows.map(page => {
      return {
        ...page,
        page_picture: page.page_picture, // You might want to use your get_picture function here
        user_picture: page.user_picture
      };
    });
    
    // Get total count
    const total = await db.query(
      `SELECT COUNT(*) as count FROM pages pg ${whereClause}`,
      queryParams
    );
    
    // Get insights
    const totalPages = await db.query("SELECT COUNT(*) as count FROM pages INNER JOIN users ON pages.page_admin = users.user_id");
    const verifiedPages = await db.query("SELECT COUNT(*) as count FROM pages INNER JOIN users ON pages.page_admin = users.user_id WHERE pages.page_verified = '1'");
    const pagesLikes = await db.query("SELECT COUNT(*) as count FROM pages_likes INNER JOIN users ON pages_likes.user_id = users.user_id INNER JOIN pages ON pages_likes.page_id = pages.page_id");
    
    const insights = {
      totalPages: parseInt(totalPages.rows[0].count),
      verifiedPages: parseInt(verifiedPages.rows[0].count),
      pagesLikes: parseInt(pagesLikes.rows[0].count)
    };
    
    res.json({
      success: true,
      data: formattedPages,
      insights,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.rows[0].count,
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
};

exports.getPage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pages = await db.query(
      `SELECT pg.*, u.* 
       FROM pages pg
       INNER JOIN users u ON pg.page_admin = u.user_id
       WHERE pg.page_id = $1`,
      [id]
    );
    
    if (pages.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const page = pages.rows[0];
    
    // Get page categories
    const categories = await db.query("SELECT * FROM pages_categories");
    
    // Get countries if needed
    const countries = await db.query("SELECT * FROM system_countries");
    
    res.json({
      success: true,
      data: {
        ...page,
        categories: categories.rows,
        countries: countries.rows
      }
    });
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
};

exports.verifyPage = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE pages SET page_verified = $1 WHERE page_id = $2',
      ['1', id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'page_verification', `Verified page ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'Page verified successfully'
    });
  } catch (error) {
    console.error('Verify page error:', error);
    res.status(500).json({ error: 'Failed to verify page' });
  }
};

exports.deletePage = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'DELETE FROM pages WHERE page_id = $1',
      [id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'page_delete', `Deleted page ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
};
