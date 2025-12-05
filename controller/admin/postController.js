const db = require('../../config/database');

exports.getPosts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      type,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    
    // Status filters
    if (status === 'pending') {
      whereClause += ' AND pre_approved = $1 AND has_approved = $2';
      queryParams.push('0', '0');
    } else if (status === 'approved') {
      whereClause += ' AND (pre_approved = $1 OR has_approved = $2)';
      queryParams.push('1', '1');
    }

    // Post type filter
    if (type) {
      whereClause += ' AND post_type = $' + (queryParams.length + 1);
      queryParams.push(type);
    }

    // Search filter
    if (search) {
      whereClause += ` AND (text LIKE $${queryParams.length + 1} OR p.post_id = $${queryParams.length + 2})`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, search);
    }
    
    // Get posts with author info
    const posts = await db.query(
      `SELECT p.*, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture,
              pg.page_name, pg.page_title, pg.page_picture
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.user_id AND p.user_type = 'user'
       LEFT JOIN pages pg ON p.user_id = pg.page_id AND p.user_type = 'page'
       ${whereClause} 
       ORDER BY p.post_id DESC 
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Format post data
    const formattedPosts = posts.rows.map(post => {
      const formatted = { ...post };
      
      // Set author info based on user_type
      if (post.user_type === 'user') {
        formatted.author_name = post.user_firstname + ' ' + post.user_lastname;
        formatted.author_picture = post.user_picture;
        formatted.author_url = `/profile/${post.user_name}`;
      } else if (post.user_type === 'page') {
        formatted.author_name = post.page_title;
        formatted.author_picture = post.page_picture;
        formatted.author_url = `/pages/${post.page_name}`;
      }
      
      return formatted;
    });
    
    // Get total count
    const total = await db.query(
      `SELECT COUNT(*) as count FROM posts p ${whereClause}`,
      queryParams
    );
    
    res.json({
      success: true,
      data: formattedPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.rows[0].count,
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

exports.approvePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE posts SET pre_approved = $1, has_approved = $2 WHERE post_id = $3',
      ['1', '1', id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'post_approval', `Approved post ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'Post approved successfully'
    });
  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({ error: 'Failed to approve post' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'DELETE FROM posts WHERE post_id = $1',
      [id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'post_delete', `Deleted post ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

exports.getPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const posts = await db.query(
      `SELECT p.*, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture,
              pg.page_name, pg.page_title, pg.page_picture
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.user_id AND p.user_type = 'user'
       LEFT JOIN pages pg ON p.user_id = pg.page_id AND p.user_type = 'page'
       WHERE p.post_id = $1`,
      [id]
    );
    
    if (posts.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = posts.rows[0];
    
    // Get post comments count
    const commentsCount = await db.query(
      'SELECT COUNT(*) as count FROM posts_comments WHERE node_id = $1 AND node_type = $2',
      [id, 'post']
    );
    
    // Get post reactions count
    const reactionsCount = await db.query(
      'SELECT COUNT(*) as count FROM posts_reactions WHERE post_id = $1',
      [id]
    );
    
    post.comments_count = commentsCount.rows[0].count;
    post.reactions_count = reactionsCount.rows[0].count;
    
    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};
