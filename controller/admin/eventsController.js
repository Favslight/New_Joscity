const db = require('../../config/database');

exports.getEvents = async (req, res) => {
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
      whereClause = ` WHERE (e.event_title LIKE $1)`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm);
    }
    
    // Get events with admin info
    const events = await db.query(
      `SELECT e.*, 
              u.user_id, u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM events e
       INNER JOIN users u ON e.event_admin = u.user_id
       ${whereClause} 
       ORDER BY e.event_id DESC 
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Format event data
    const formattedEvents = events.rows.map(event => {
      return {
        ...event,
        event_picture: event.event_cover,
        user_picture: event.user_picture
      };
    });
    
    // Get total count
    const total = await db.query(
      `SELECT COUNT(*) as count FROM events e ${whereClause}`,
      queryParams
    );
    
    res.json({
      success: true,
      data: formattedEvents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.rows[0].count,
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const events = await db.query(
      `SELECT e.*, u.user_id, u.user_name, u.user_firstname, u.user_lastname, u.user_gender, u.user_picture
       FROM events e
       INNER JOIN users u ON e.event_admin = u.user_id
       WHERE e.event_id = $1`,
      [id]
    );
    
    if (events.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const event = events.rows[0];
    
    // Get event categories
    const categories = await db.query("SELECT * FROM events_categories");
    
    // Get countries if needed
    const countries = await db.query("SELECT * FROM system_countries");
    
    res.json({
      success: true,
      data: {
        ...event,
        categories: categories.rows,
        countries: countries.rows
      }
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'DELETE FROM events WHERE event_id = $1',
      [id]
    );
    
    // Log admin action
    await db.query(
      'INSERT INTO admin_logs (admin_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.user_id, 'event_delete', `Deleted event ID: ${id}`]
    );
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};
