const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./shift_calendar.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS shift_employees`);
  db.run(`DROP TABLE IF EXISTS shifts`);
  db.run(`DROP TABLE IF EXISTS users`);

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
  )`);

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
  )`);

  db.run(`CREATE TABLE shift_employees (
    shift_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    confirmed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shift_id, employee_id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  console.log('Tables created successfully.');

  db.run(`CREATE INDEX idx_shifts_start_time ON shifts(start_time)`);
  db.run(`CREATE INDEX idx_shifts_department ON shifts(department)`);
  db.run(`CREATE INDEX idx_shifts_status ON shifts(status)`);
  db.run(`CREATE INDEX idx_shift_employees_shift_id ON shift_employees(shift_id)`);
  db.run(`CREATE INDEX idx_shift_employees_employee_id ON shift_employees(employee_id)`);
  db.run(`CREATE INDEX idx_users_email ON users(email)`);
  db.run(`CREATE INDEX idx_users_role ON users(role)`);

  console.log('Indexes created successfully.');

  const defaultPassword = bcrypt.hashSync('admin123', 10);
  db.run(
    `INSERT INTO users (name, email, password, role, department, avatar_color) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Admin User', 'admin@example.com', defaultPassword, 'admin', 'Management', '#EA454C'],
    function(err) {
      if (err) {
        console.error('Error inserting admin user:', err.message);
      } else {
        console.log('Admin user created with ID:', this.lastID);
      }
    }
  );

  const managerPassword = bcrypt.hashSync('manager123', 10);
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

  const employeePassword = bcrypt.hashSync('employee123', 10);
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

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  
  const endTime = new Date(tomorrow);
  endTime.setHours(17, 0, 0, 0);

  db.run(
    `INSERT INTO shifts (title, description, start_time, end_time, required_employees, department, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Morning Shift', 'Regular morning operations', tomorrow.toISOString(), endTime.toISOString(), 3, 'General', 2],
    function(err) {
      if (err) {
        console.error('Error inserting sample shift:', err.message);
      } else {
        console.log('Sample shift created with ID:', this.lastID);
        
        db.run(
          `INSERT INTO shift_employees (shift_id, employee_id, confirmed)
           VALUES (?, ?, 0)`,
          [this.lastID, 3],
          function(err) {
            if (err) {
              console.error('Error assigning employee to shift:', err.message);
            } else {
              console.log('Employee assigned to shift');
            }
          }
        );
      }
    }
  );
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Database initialization complete.');
    console.log('\n=== DEFAULT LOGIN CREDENTIALS ===');
    console.log('Admin:     admin@example.com / admin123');
    console.log('Manager:   manager@example.com / manager123');
    console.log('Employee:  employee@example.com / employee123');
    console.log('===================================');
  }
});