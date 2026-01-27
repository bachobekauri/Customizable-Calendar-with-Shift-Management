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
const requests = require('./routes/requests');  // ← ADD THIS LINE

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

// Routes
app.use('/api/auth', auth);
app.use('/api/shifts', shifts);
app.use('/api/users', users);
app.use('/api/employees', employees);
app.use('/api/requests', requests);  // ← ADD THIS LINE

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Shift Management API is running',
    timestamp: new Date().toISOString(),
    database: 'SQLite'
  });
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.url}`,
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/shifts',
      'POST /api/shifts',
      'GET /api/users',
      'GET /api/employees',
      'GET /api/requests',  // ← New route
      'POST /api/requests',  // ← New route
      'POST /api/requests/:id/approve',  // ← New route
      'POST /api/requests/:id/reject',  // ← New route
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
  console.log('  ✓ GET  /api/shifts');
  console.log('  ✓ POST /api/shifts');
  console.log('  ✓ GET  /api/users');
  console.log('  ✓ GET  /api/employees');
  console.log('  ✓ GET  /api/requests');  // ← New
  console.log('  ✓ POST /api/requests');  // ← New
  console.log('  ✓ POST /api/requests/:id/approve');  // ← New
  console.log('  ✓ POST /api/requests/:id/reject');  // ← New
});

process.on('unhandledRejection', (err, promise) => {
  console.log(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = server;