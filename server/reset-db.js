const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Create database connection
const db = new sqlite3.Database('./shift_calendar.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Drop tables if they exist
const dropTables = () => {
  return new Promise((resolve, reject) => {
    const tables = ['shift_employees', 'shifts', 'users'];
    
    const dropNextTable = (index) => {
      if (index >= tables.length) {
        resolve();
        return;
      }
      
      const table = tables[index];
      db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
        if (err) {
          console.error(`Error dropping table ${table}:`, err.message);
          reject(err);
        } else {
          console.log(`Dropped table ${table}`);
          dropNextTable(index + 1);
        }
      });
    };
    
    dropNextTable(0);
  });
};

// Create tables
const createTables = () => {
  return new Promise((resolve, reject) => {
    // Create users table
    db.run(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('employee', 'manager', 'admin')) DEFAULT 'employee',
      department TEXT DEFAULT 'General',
      phone TEXT,
      avatar_color TEXT DEFAULT '#40c3d8',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Created users table');
    });

    // Create shifts table
    db.run(`CREATE TABLE shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      required_employees INTEGER DEFAULT 1,
      department TEXT DEFAULT 'General',
      status TEXT CHECK(status IN ('draft', 'published', 'cancelled', 'completed')) DEFAULT 'published',
      hourly_rate REAL DEFAULT 20.0,
      location TEXT DEFAULT 'Main Office',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Created shifts table');
    });

    // Create shift_employees table
    db.run(`CREATE TABLE shift_employees (
      shift_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      confirmed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (shift_id, employee_id),
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
    )`, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Created shift_employees table');
      resolve();
    });
  });
};

// Create indexes
const createIndexes = () => {
  return new Promise((resolve, reject) => {
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time)`,
      `CREATE INDEX IF NOT EXISTS idx_shifts_department ON shifts(department)`,
      `CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status)`,
      `CREATE INDEX IF NOT EXISTS idx_shift_employees_shift_id ON shift_employees(shift_id)`,
      `CREATE INDEX IF NOT EXISTS idx_shift_employees_employee_id ON shift_employees(employee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`
    ];

    const createNextIndex = (index) => {
      if (index >= indexes.length) {
        resolve();
        return;
      }

      db.run(indexes[index], (err) => {
        if (err) {
          console.error(`Error creating index:`, err.message);
          reject(err);
        } else {
          console.log(`Created index: ${indexes[index]}`);
          createNextIndex(index + 1);
        }
      });
    };

    createNextIndex(0);
  });
};

// Insert default users
const insertDefaultUsers = async () => {
  try {
    // Insert admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    db.run(
      `INSERT INTO users (name, email, password, role, department, avatar_color) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Admin User', 'admin@example.com', adminPassword, 'admin', 'Management', '#EA454C'],
      function(err) {
        if (err) {
          console.error('Error inserting admin user:', err.message);
        } else {
          console.log('Admin user created with ID:', this.lastID);
        }
      }
    );

    // Insert manager user
    const managerPassword = await bcrypt.hash('manager123', 10);
    db.run(
      `INSERT INTO users (name, email, password, role, department, avatar_color) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Manager User', 'manager@example.com', managerPassword, 'manager', 'Operations', '#40c3d8'],
      function(err) {
        if (err) {
          console.error('Error inserting manager user:', err.message);
        } else {
          console.log('Manager user created with ID:', this.lastID);
        }
      }
    );

    // Insert employee user
    const employeePassword = await bcrypt.hash('employee123', 10);
    db.run(
      `INSERT INTO users (name, email, password, role, department, avatar_color) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Employee User', 'employee@example.com', employeePassword, 'employee', 'General', '#4CAF50'],
      function(err) {
        if (err) {
          console.error('Error inserting employee user:', err.message);
        } else {
          console.log('Employee user created with ID:', this.lastID);
        }
      }
    );
  } catch (error) {
    console.error('Error hashing passwords:', error);
  }
};

// Main execution
const main = async () => {
  try {
    console.log('Starting database reset...');
    
    await dropTables();
    await createTables();
    await createIndexes();
    await insertDefaultUsers();
    
    console.log('\n=== DATABASE RESET COMPLETE ===');
    console.log('\nDefault login credentials:');
    console.log('Admin:     admin@example.com / admin123');
    console.log('Manager:   manager@example.com / manager123');
    console.log('Employee:  employee@example.com / employee123');
    console.log('==============================\n');
    
    // Close database
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        process.exit(1);
      }
      console.log('Database connection closed.');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error during database reset:', error);
    db.close();
    process.exit(1);
  }
};

// Run the script
main();