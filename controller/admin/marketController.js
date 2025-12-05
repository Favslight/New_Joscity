const db = require('../../config/database');

// Products Management
exports.getProducts = async (req, res) => {
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
      whereClause = ` WHERE (p.text LIKE $1 OR pp.name LIKE $2 OR pp.location LIKE $3)`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Get products with author info
    const products = await db.query(
      `SELECT p.*, pp.name,
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture,
              pg.page_name, pg.page_title, pg.page_picture
       FROM posts p
       INNER JOIN posts_products pp ON p.post_id = pp.post_id AND p.post_type = 'product'
       LEFT JOIN users u ON p.user_id = u.user_id AND p.user_type = 'user'
       LEFT JOIN pages pg ON p.user_id = pg.page_id AND p.user_type = 'page'
       ${whereClause} 
       ORDER BY p.post_id DESC 
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Format product data
    const formattedProducts = products.rows.map(product => {
      const formatted = { ...product };
      
      // Set author info based on user_type
      if (product.user_type === "user") {
        formatted.author_name = product.user_firstname + ' ' + product.user_lastname;
        formatted.author_picture = product.user_picture;
        formatted.author_url = `/profile/${product.user_name}`;
      } else if (product.user_type === "page") {
        formatted.author_name = product.page_title;
        formatted.author_picture = product.page_picture;
        formatted.author_url = `/pages/${product.page_name}`;
      }
      
      return formatted;
    });
    
    // Get total count
    const total = await db.query(
      `SELECT COUNT(*) as count FROM posts p
       INNER JOIN posts_products pp ON p.post_id = pp.post_id AND p.post_type = 'product'
       LEFT JOIN users u ON p.user_id = u.user_id AND p.user_type = 'user'
       LEFT JOIN pages pg ON p.user_id = pg.page_id AND p.user_type = 'page'
       ${whereClause}`,
      queryParams
    );
    
    res.json({
      success: true,
      data: formattedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.rows[0].count,
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'DELETE FROM posts WHERE post_id = $1',
      [id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'product_delete', `Deleted product ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// Orders Management
exports.getOrders = async (req, res) => {
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
      whereClause = ` WHERE o.order_hash LIKE $1`;
      queryParams.push(`%${search}%`);
    }
    
    // Get orders with buyer/seller info
    const orders = await db.query(
      `SELECT o.*,
              u1.user_name AS buyer_username, u1.user_firstname AS buyer_firstname, 
              u1.user_lastname AS buyer_lastname, u1.user_picture AS buyer_user_picture, 
              u1.user_gender AS buyer_user_gender,
              u2.user_name AS seller_username, u2.user_firstname AS seller_firstname, 
              u2.user_lastname AS seller_lastname, u2.user_picture AS seller_user_picture, 
              u2.user_gender AS seller_user_gender
       FROM orders o
       INNER JOIN users u1 ON o.buyer_id = u1.user_id
       INNER JOIN users u2 ON o.seller_id = u2.user_id
       ${whereClause} 
       ORDER BY o.order_id DESC 
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Format order data
    const formattedOrders = orders.rows.map(order => {
      // Prepare buyer's info
      const buyer_fullname = order.buyer_firstname + ' ' + order.buyer_lastname;
      const buyer_picture = order.buyer_user_picture;
      
      // Prepare seller's info
      const seller_fullname = order.seller_firstname + ' ' + order.seller_lastname;
      const seller_picture = order.seller_user_picture;
      
      // Prepare total commission
      const total_commission = order.sub_total * (order.commission / 100);
      
      // Prepare final price
      const final_price = order.sub_total - total_commission;
      
      return {
        ...order,
        buyer_fullname,
        buyer_picture,
        seller_fullname,
        seller_picture,
        total_commission,
        final_price
      };
    });
    
    // Get total count
    const total = await db.query(
      `SELECT COUNT(*) as count FROM orders o
       INNER JOIN users u1 ON o.buyer_id = u1.user_id
       INNER JOIN users u2 ON o.seller_id = u2.user_id
       ${whereClause}`,
      queryParams
    );
    
    res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.rows[0].count,
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Market Categories
exports.getMarketCategories = async (req, res) => {
  try {
    const categories = await db.query(
      "SELECT * FROM market_categories ORDER BY category_name"
    );

    res.json({
      success: true,
      data: categories.rows
    });
  } catch (error) {
    console.error('Get market categories error:', error);
    res.status(500).json({ error: 'Failed to fetch market categories' });
  }
};

exports.createMarketCategory = async (req, res) => {
  try {
    const { category_name, category_order, parent_id } = req.body;

    await db.query(
      'INSERT INTO market_categories (category_name, category_order, parent_id) VALUES ($1, $2, $3)',
      [category_name, category_order || 0, parent_id || null]
    );

    res.json({
      success: true,
      message: 'Market category created successfully'
    });
  } catch (error) {
    console.error('Create market category error:', error);
    res.status(500).json({ error: 'Failed to create market category' });
  }
};

exports.updateMarketCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, category_order, parent_id } = req.body;

    await db.query(
      'UPDATE market_categories SET category_name = $1, category_order = $2, parent_id = $3 WHERE category_id = $4',
      [category_name, category_order || 0, parent_id || null, id]
    );

    res.json({
      success: true,
      message: 'Market category updated successfully'
    });
  } catch (error) {
    console.error('Update market category error:', error);
    res.status(500).json({ error: 'Failed to update market category' });
  }
};

exports.deleteMarketCategory = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'DELETE FROM market_categories WHERE category_id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Market category deleted successfully'
    });
  } catch (error) {
    console.error('Delete market category error:', error);
    res.status(500).json({ error: 'Failed to delete market category' });
  }
};

// Market Payments
exports.getMarketPayments = async (req, res) => {
  try {
    const payments = await db.query(
      `SELECT mp.*, 
              u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM market_payments mp
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
    console.error('Get market payments error:', error);
    res.status(500).json({ error: 'Failed to fetch market payments' });
  }
};

exports.approveMarketPayment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE market_payments SET status = $1 WHERE payment_id = $2',
      ['1', id]
    );

    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'market_payment_approve', `Approved market payment ID: ${id}`]
    );

    res.json({
      success: true,
      message: 'Market payment approved successfully'
    });
  } catch (error) {
    console.error('Approve market payment error:', error);
    res.status(500).json({ error: 'Failed to approve market payment' });
  }
};
