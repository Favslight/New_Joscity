const db = require('../../config/database');

exports.getDashboard = async (req, res) => {
  try {
    const insights = await getDashboardInsights();
    const chartData = await getChartData();
    
    res.json({
      success: true,
      data: {
        insights,
        chart: chartData
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

const getDashboardInsights = async () => {
  const insights = {};
  
  // Total users
  const users = await db.query('SELECT COUNT(*) as count FROM users');
  insights.totalUsers = users.rows[0].count;
  
  // Pending approvals
  const pending = await db.query('SELECT COUNT(*) as count FROM users WHERE user_approved = $1 AND account_status = $2', ['0', 'pending']);
  insights.pendingApprovals = pending.rows[0].count;
  
  // Not activated
  const notActivated = await db.query('SELECT COUNT(*) as count FROM users WHERE user_activated = $1', ['0']);
  insights.notActivated = notActivated.rows[0].count;
  
  // Banned users
  const banned = await db.query('SELECT COUNT(*) as count FROM users WHERE user_banned = $1', ['1']);
  insights.bannedUsers = banned.rows[0].count;
  
  // Online users (last 15 minutes)
  const online = await db.query('SELECT COUNT(*) as count FROM users WHERE user_last_seen >= NOW() - INTERVAL $1', ['15 minutes']);
  insights.onlineUsers = online.rows[0].count;
  
  // Total posts
  const posts = await db.query('SELECT COUNT(*) as count FROM posts');
  insights.totalPosts = posts.rows[0].count;
  
  // Total comments
  const comments = await db.query('SELECT COUNT(*) as count FROM posts_comments');
  insights.totalComments = comments.rows[0].count;
  
  // Total pages
  const pages = await db.query('SELECT COUNT(*) as count FROM pages');
  insights.totalPages = pages.rows[0].count;
  
  // Total groups
  const groups = await db.query('SELECT COUNT(*) as count FROM groups');
  insights.totalGroups = groups.rows[0].count;
  
  // Total events
  const events = await db.query('SELECT COUNT(*) as count FROM events');
  insights.totalEvents = events.rows[0].count;

  // Pending reports
  const reports = await db.query('SELECT COUNT(*) as count FROM reports WHERE seen = $1', ['0']);
  insights.pendingReports = reports.rows[0].count;

  // Pending verification requests
  const verifications = await db.query('SELECT COUNT(*) as count FROM verification_requests WHERE status = $1', ['0']);
  insights.pendingVerifications = verifications.rows[0].count;

  return insights;
};

const getChartData = async () => {
  const chart = {
    users: {},
    posts: {},
    pages: {},
    groups: {}
  };
  
  // Get last 12 months data
  for (let i = 1; i <= 12; i++) {
    // Users this month
    const monthUsers = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE EXTRACT(YEAR FROM user_registered) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM user_registered) = $1',
      [i]
    );
    chart.users[i] = monthUsers.rows[0].count;
    
    // Posts this month
    const monthPosts = await db.query(
      'SELECT COUNT(*) as count FROM posts WHERE EXTRACT(YEAR FROM time) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM time) = $1',
      [i]
    );
    chart.posts[i] = monthPosts.rows[0].count;

    // Pages this month
    const monthPages = await db.query(
      'SELECT COUNT(*) as count FROM pages WHERE EXTRACT(YEAR FROM page_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM page_date) = $1',
      [i]
    );
    chart.pages[i] = monthPages.rows[0].count;

    // Groups this month
    const monthGroups = await db.query(
      'SELECT COUNT(*) as count FROM groups WHERE EXTRACT(YEAR FROM group_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM group_date) = $1',
      [i]
    );
    chart.groups[i] = monthGroups.rows[0].count;
  }
  
  return chart;
};
