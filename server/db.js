const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './shift_calendar.db';

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    
    db.run('PRAGMA foreign_keys = ON');
    
    db.run('PRAGMA journal_mode = WAL');
    
    db.run('PRAGMA synchronous = NORMAL');
  }
});

db.runAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

db.getAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

db.allAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const initializeDatabase = async () => {
  try {
    const tableExists = await db.getAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );
    
    if (!tableExists) {
      console.log('Database not initialized. Run: npm run init-db');
    } else {
      console.log('Database is ready.');
    }
  } catch (error) {
    console.error('Error checking database:', error.message);
  }
};

// Run initialization check
initializeDatabase();

module.exports = db;