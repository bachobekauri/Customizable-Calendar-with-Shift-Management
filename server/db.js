
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'shift_calendar',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  max: 20, // max number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const db = {
  query: (text, params) => pool.query(text, params),
  
  runAsync: async function(sql, params = []) {
    try {
      const result = await pool.query(sql, params);
      return { 
        id: result.rows[0]?.id || null, 
        changes: result.rowCount 
      };
    } catch (error) {
      throw error;
    }
  },
  
  getAsync: async function(sql, params = []) {
    try {
      const result = await pool.query(sql, params);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  },
  
  allAsync: async function(sql, params = []) {
    try {
      const result = await pool.query(sql, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
};

const initializeDatabase = async () => {
  try {
    const tableExists = await db.getAsync(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
    );
    
    if (!tableExists.exists) {
      console.log('Database not initialized. Run: npm run init-db');
    } else {
      console.log('Database is ready.');
    }
  } catch (error) {
    console.error('Error checking database:', error.message);
  }
};

initializeDatabase();

module.exports = db;