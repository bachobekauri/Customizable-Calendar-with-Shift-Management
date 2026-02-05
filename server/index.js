const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');

dotenv.config();

const db = require('./db');

const auth = require('./routes/auth');
const shifts = require('./routes/shifts');
const users = require('./routes/users');
const employees = require('./routes/employees');
const requests = require('./routes/requests');
const notifications = require('./routes/notifications');
const auditLogs = require('./routes/auditLogs');
const settings = require('./routes/settings');

const app = express();

app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({
  contentSecurityPolicy: false,
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api/auth', auth);
app.use('/api/shifts', shifts);
app.use('/api/users', users);
app.use('/api/employees', employees);
app.use('/api/requests', requests);
app.use('/api/notifications', notifications);
app.use('/api/audit-logs', auditLogs);
app.use('/api/settings', settings);

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1 as test');
    res.json({ 
      status: 'ok', 
      message: 'Shift Management API is running',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
      connection: 'healthy'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      database: 'PostgreSQL',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.url}`,
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/shifts',
      'POST /api/shifts',
      'GET /api/shifts/week/:date',
      'GET /api/shifts/users/available',
      'GET /api/users',
      'GET /api/employees',
      'GET /api/requests',
      'POST /api/requests',
      'POST /api/requests/:id/approve',
      'POST /api/requests/:id/reject',
      'POST /api/requests/:id/cancel',
      'GET /api/notifications',
      'GET /api/audit-logs',
      'GET /api/settings',
      'PUT /api/settings',
      'POST /api/settings/backup-database',
      'POST /api/settings/reset-database',
    ]
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log('Routes configured:');
  console.log('  ✓ POST /api/auth/register');
  console.log('  ✓ POST /api/auth/login');
  console.log('  ✓ GET  /api/auth/me');
  console.log('  ✓ GET  /api/shifts');
  console.log('  ✓ POST /api/shifts');
  console.log('  ✓ GET  /api/shifts/week/:date');
  console.log('  ✓ GET  /api/shifts/users/available');
  console.log('  ✓ GET  /api/users');
  console.log('  ✓ GET  /api/employees');
  console.log('  ✓ GET  /api/requests');
  console.log('  ✓ POST /api/requests');
  console.log('  ✓ POST /api/requests/:id/approve');
  console.log('  ✓ POST /api/requests/:id/reject');
  console.log('  ✓ POST /api/requests/:id/cancel');
  console.log('  ✓ GET  /api/notifications');
  console.log('  ✓ GET  /api/audit-logs');
  console.log('  ✓ GET  /api/settings');
  console.log('  ✓ PUT  /api/settings');
  console.log('  ✓ POST /api/settings/backup-database');
  console.log('  ✓ POST /api/settings/reset-database');
});

process.on('unhandledRejection', (err, promise) => {
  console.log(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = server;