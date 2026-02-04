
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'shift_calendar',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

const runQuery = async (sql, params = []) => {
  try {
    const result = await pool.query(sql, params);
    return { id: result.rows[0]?.id || null, changes: result.rowCount };
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

const ensureDatabaseExists = async () => {
  try {
    const adminPool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: 'postgres',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
    });

    const dbName = process.env.PG_DATABASE || 'shift_calendar';
    const result = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`Creating database: ${dbName}`);
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database ${dbName} created`);
    } else {
      console.log(`✅ Database ${dbName} already exists`);
    }

    await adminPool.end();
  } catch (error) {
    console.error('Error ensuring database exists:', error.message);
  }
};

const initializeDatabase = async () => {
  try {
    console.log('\n📋 Initializing PostgreSQL database...\n');
    
    await ensureDatabaseExists();
    
    await runQuery(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    console.log('✅ Enabled UUID extension');

    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'employee' CHECK(role IN ('employee', 'manager', 'admin')),
        department TEXT DEFAULT 'General',
        avatar_color TEXT DEFAULT '#40c3d8',
        phone TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created users table');

    await runQuery(`
      CREATE TABLE IF NOT EXISTS shifts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        department TEXT DEFAULT 'General',
        required_employees INTEGER DEFAULT 1,
        hourly_rate REAL DEFAULT 20.0,
        location TEXT DEFAULT 'Main Office',
        status TEXT DEFAULT 'published' CHECK(status IN ('draft', 'published', 'completed', 'cancelled')),
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created shifts table');

    await runQuery(`
      CREATE TABLE IF NOT EXISTS shift_employees (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        shift_id UUID NOT NULL,
        employee_id UUID NOT NULL,
        confirmed BOOLEAN DEFAULT FALSE,
        confirmed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
        FOREIGN KEY(employee_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(shift_id, employee_id)
      )
    `);
    console.log('✅ Created shift_employees table');

    await runQuery(`
      CREATE TABLE IF NOT EXISTS shift_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        shift_id UUID NOT NULL,
        request_type TEXT NOT NULL CHECK(request_type IN ('swap', 'cancel', 'change')),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
        reason TEXT,
        requested_by UUID NOT NULL,
        assigned_to UUID,
        replacement_employee_id UUID,
        proposed_start_time TIMESTAMP,
        proposed_end_time TIMESTAMP,
        rejection_reason TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
        FOREIGN KEY(requested_by) REFERENCES users(id),
        FOREIGN KEY(assigned_to) REFERENCES users(id),
        FOREIGN KEY(replacement_employee_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Created shift_requests table');

    await runQuery(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        related_id UUID,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created notifications table');

    await runQuery(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id UUID,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created audit_logs table');

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_shift_employees_shift ON shift_employees(shift_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_shift_employees_employee ON shift_employees(employee_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_shift_requests_shift ON shift_requests(shift_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_shift_requests_requested_by ON shift_requests(requested_by)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_shift_requests_status ON shift_requests(status)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
    console.log('✅ Created database indexes');

    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const hasUsers = parseInt(result.rows[0].count) > 0;

    if (!hasUsers) {
      console.log('\n👤 Creating demo users...\n');

      const adminId = uuidv4();
      const adminPassword = await bcrypt.hash('password123', 10);
      await runQuery(
        `INSERT INTO users (id, name, email, password, role, department, avatar_color)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [adminId, 'System Admin', 'admin@example.com', adminPassword, 'admin', 'General', '#EA454C']
      );
      console.log('✅ Created admin user: admin@example.com (password: password123)');

      const managerId = uuidv4();
      const managerPassword = await bcrypt.hash('password123', 10);
      await runQuery(
        `INSERT INTO users (id, name, email, password, role, department, avatar_color)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [managerId, 'Project Manager', 'manager@example.com', managerPassword, 'manager', 'Sales', '#1976d2']
      );
      console.log('✅ Created manager user: manager@example.com (password: password123)');

      for (let i = 1; i <= 3; i++) {
        const empId = uuidv4();
        const empPassword = await bcrypt.hash('password123', 10);
        const departments = ['Sales', 'Development', 'Support'];
        await runQuery(
          `INSERT INTO users (id, name, email, password, role, department, avatar_color)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [empId, `Employee ${i}`, `employee${i}@example.com`, empPassword, 'employee', departments[i - 1], '#40c3d8']
        );
        console.log(`✅ Created employee ${i}: employee${i}@example.com (password: password123)`);
      }

      console.log('\n');
    } else {
      console.log('ℹ️  Users already exist - skipping demo data creation');
    }

    console.log('\n✨ PostgreSQL database initialization complete!\n');
    console.log('✅ shift_requests table created with all required columns:');
    console.log('   - id, shift_id, request_type, status, reason');
    console.log('   - requested_by, assigned_to, replacement_employee_id');
    console.log('   - proposed_start_time, proposed_end_time');
    console.log('   - rejection_reason, reviewed_at, created_at, updated_at\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    await pool.end();
    process.exit(1);
  }
};

initializeDatabase();