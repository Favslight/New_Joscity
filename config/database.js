const { Pool } = require('pg');
require('dotenv').config();

// Supabase uses standard PostgreSQL connection with SSL
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: {
        rejectUnauthorized: false
    }
});

// Event listeners for connection monitoring
pool.on('connect', () => {
  console.log('✅ Connected to Supabase PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

// Basic query function
const query = async (text, params) => {
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`📊 Executed query in ${duration}ms: ${text.substring(0, 50)}...`);
    return result;
  } catch (error) {
    console.error('❌ Query error:', error.message);
    throw error;
  }
};

// Get a client for transactions
const getClient = async () => {
  const client = await pool.connect();
  
  // Set up client-level error handling
  client.on('error', (err) => {
    console.error('❌ Client error:', err);
  });
  
  return client;
};

module.exports = {
  query,
  getClient,
  pool
};