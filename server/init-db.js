const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'shift_calendar.db');

// Create db directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

db.run('PRAGMA foreign_keys = ON');

const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const initializeDatabase = async () => {
  try {
    console.log('\n📋 Initializing database schema...\n');

    // Users table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'employee' CHECK(role IN ('employee', 'manager', 'admin')),
        department TEXT DEFAULT 'General',
        avatar_color TEXT DEFAULT '#40c3d8',
        phone TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created users table');

    // Shifts table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        department TEXT DEFAULT 'General',
        required_employees INTEGER DEFAULT 1,
        hourly_rate REAL DEFAULT 20.0,
        location TEXT DEFAULT 'Main Office',
        status TEXT DEFAULT 'published' CHECK(status IN ('draft', 'published', 'completed', 'cancelled')),
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Created shifts table');

    // Shift employees junction table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS shift_employees (
        id TEXT PRIMARY KEY,
        shift_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        confirmed BOOLEAN DEFAULT 0,
        confirmed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
        FOREIGN KEY(employee_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(shift_id, employee_id)
      )
    `);
    console.log('✅ Created shift_employees table');

    // Shift requests table - COMPLETE WITH ALL COLUMNS
    await runAsync(`
      CREATE TABLE IF NOT EXISTS shift_requests (
        id TEXT PRIMARY KEY,
        shift_id TEXT NOT NULL,
        request_type TEXT NOT NULL CHECK(request_type IN ('swap', 'cancel', 'change')),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
        reason TEXT,
        requested_by TEXT NOT NULL,
        assigned_to TEXT,
        replacement_employee_id TEXT,
        proposed_start_time DATETIME,
        proposed_end_time DATETIME,
        rejection_reason TEXT,
        reviewed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
        FOREIGN KEY(requested_by) REFERENCES users(id),
        FOREIGN KEY(assigned_to) REFERENCES users(id),
        FOREIGN KEY(replacement_employee_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Created shift_requests table');

    // Notifications table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        related_id TEXT,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created notifications table');

    // Audit logs table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Created audit_logs table');

    // Create indexes for better query performance
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_shift_employees_shift ON shift_employees(shift_id)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_shift_employees_employee ON shift_employees(employee_id)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_shift_requests_shift ON shift_requests(shift_id)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_shift_requests_requested_by ON shift_requests(requested_by)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_shift_requests_status ON shift_requests(status)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
    console.log('✅ Created database indexes');

    // Check if demo data already exists
    const checkUser = new Promise((resolve) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
        resolve(!err && result.count > 0);
      });
    });

    const hasUsers = await checkUser;

    if (!hasUsers) {
      console.log('\n👤 Creating demo users...\n');

      // Create demo admin user
      const adminId = uuidv4();
      const adminPassword = await bcrypt.hash('password123', 10);
      await runAsync(
        `INSERT INTO users (id, name, email, password, role, department, avatar_color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [adminId, 'System Admin', 'admin@example.com', adminPassword, 'admin', 'General', '#EA454C']
      );
      console.log('✅ Created admin user: admin@example.com (password: password123)');

      // Create demo manager user
      const managerId = uuidv4();
      const managerPassword = await bcrypt.hash('password123', 10);
      await runAsync(
        `INSERT INTO users (id, name, email, password, role, department, avatar_color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [managerId, 'Project Manager', 'manager@example.com', managerPassword, 'manager', 'Sales', '#1976d2']
      );
      console.log('✅ Created manager user: manager@example.com (password: password123)');

      // Create demo employee users
      for (let i = 1; i <= 3; i++) {
        const empId = uuidv4();
        const empPassword = await bcrypt.hash('password123', 10);
        const departments = ['Sales', 'Development', 'Support'];
        await runAsync(
          `INSERT INTO users (id, name, email, password, role, department, avatar_color)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [empId, `Employee ${i}`, `employee${i}@example.com`, empPassword, 'employee', departments[i - 1], '#40c3d8']
        );
        console.log(`✅ Created employee ${i}: employee${i}@example.com (password: password123)`);
      }

      console.log('\n');
    } else {
      console.log('ℹ️  Users already exist - skipping demo data creation');
    }

    console.log('\n✨ Database initialization complete!\n');
    console.log('✅ shift_requests table created with all required columns:');
    console.log('   - id, shift_id, request_type, status, reason');
    console.log('   - requested_by, assigned_to, replacement_employee_id');
    console.log('   - proposed_start_time, proposed_end_time');
    console.log('   - rejection_reason, reviewed_at, created_at, updated_at\n');
    
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    db.close();
    process.exit(1);
  }
};

// Run initialization
initializeDatabase();