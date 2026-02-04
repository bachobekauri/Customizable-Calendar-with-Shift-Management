
const { Pool } = require('pg');
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

const dropTables = async () => {
  try {
    const tables = ['shift_employees', 'shift_requests', 'notifications', 'audit_logs', 'shifts', 'users'];
    
    for (const table of tables) {
      try {
        await runQuery(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Dropped table ${table}`);
      } catch (error) {
        console.error(`Error dropping table ${table}:`, error.message);
      }
    }
  } catch (error) {
    throw error;
  }
};

const createTables = async () => {
  try {
    await runQuery(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await runQuery(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('employee', 'manager', 'admin')) DEFAULT 'employee',
        department TEXT DEFAULT 'General',
        phone TEXT,
        avatar_color TEXT DEFAULT '#40c3d8',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created users table');

    await runQuery(`
      CREATE TABLE shifts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        required_employees INTEGER DEFAULT 1,
        department TEXT DEFAULT 'General',
        status TEXT CHECK(status IN ('draft', 'published', 'cancelled', 'completed')) DEFAULT 'published',
        hourly_rate REAL DEFAULT 20.0,
        location TEXT DEFAULT 'Main Office',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created shifts table');

    await runQuery(`
      CREATE TABLE shift_employees (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        shift_id UUID NOT NULL,
        employee_id UUID NOT NULL,
        confirmed BOOLEAN DEFAULT FALSE,
        confirmed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (shift_id, employee_id)
      )
    `);
    console.log('✅ Created shift_employees table');

    await runQuery(`
      CREATE TABLE shift_requests (
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
      CREATE TABLE notifications (
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
      CREATE TABLE audit_logs (
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
  } catch (error) {
    throw error;
  }
};

const createIndexes = async () => {
  try {
    const indexes = [
      `CREATE INDEX idx_shifts_start_time ON shifts(start_time)`,
      `CREATE INDEX idx_shifts_department ON shifts(department)`,
      `CREATE INDEX idx_shifts_status ON shifts(status)`,
      `CREATE INDEX idx_shift_employees_shift_id ON shift_employees(shift_id)`,
      `CREATE INDEX idx_shift_employees_employee_id ON shift_employees(employee_id)`,
      `CREATE INDEX idx_users_email ON users(email)`,
      `CREATE INDEX idx_users_role ON users(role)`,
      `CREATE INDEX idx_shift_requests_shift ON shift_requests(shift_id)`,
      `CREATE INDEX idx_shift_requests_requested_by ON shift_requests(requested_by)`,
      `CREATE INDEX idx_shift_requests_status ON shift_requests(status)`,
      `CREATE INDEX idx_notifications_user ON notifications(user_id)`,
      `CREATE INDEX idx_audit_logs_user ON audit_logs(user_id)`
    ];

    for (const indexSql of indexes) {
      try {
        await runQuery(indexSql);
        console.log(`✅ Created index: ${indexSql.split(' ON ')[0]}`);
      } catch (error) {
        console.log(`ℹ️  Index already exists or error: ${indexSql.split(' ON ')[0]}`);
      }
    }
  } catch (error) {
    throw error;
  }
};

const insertDefaultUsers = async () => {
  try {
    const adminPassword = await bcrypt.hash('admin123', 10);
    await runQuery(
      `INSERT INTO users (name, email, password, role, department, avatar_color) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['Admin User', 'admin@example.com', adminPassword, 'admin', 'Management', '#EA454C']
    );
    console.log('✅ Admin user created: admin@example.com');

    const managerPassword = await bcrypt.hash('manager123', 10);
    await runQuery(
      `INSERT INTO users (name, email, password, role, department, avatar_color) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['Manager User', 'manager@example.com', managerPassword, 'manager', 'Operations', '#40c3d8']
    );
    console.log('✅ Manager user created: manager@example.com');

    const employeePassword = await bcrypt.hash('employee123', 10);
    await runQuery(
      `INSERT INTO users (name, email, password, role, department, avatar_color) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['Employee User', 'employee@example.com', employeePassword, 'employee', 'General', '#4CAF50']
    );
    console.log('✅ Employee user created: employee@example.com');
  } catch (error) {
    console.error('Error inserting users:', error.message);
    throw error;
  }
};

const main = async () => {
  try {
    console.log('Starting PostgreSQL database reset...');
    
    await dropTables();
    await createTables();
    await createIndexes();
    await insertDefaultUsers();
    
    console.log('\n=== POSTGRESQL DATABASE RESET COMPLETE ===');
    console.log('\nDefault login credentials:');
    console.log('Admin:     admin@example.com / admin123');
    console.log('Manager:   manager@example.com / manager123');
    console.log('Employee:  employee@example.com / employee123');
    console.log('===========================================\n');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('Error during database reset:', error.message);
    await pool.end();
    process.exit(1);
  }
};

main();