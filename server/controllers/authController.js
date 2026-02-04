
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_fallback_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'employee', department = 'General' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const validRoles = ['employee', 'manager', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const userExists = await db.getAsync(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.runAsync(
      `INSERT INTO users (name, email, password, role, department, avatar_color) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        name,
        email,
        hashedPassword,
        role,
        department,
        '#40c3d8' 
      ]
    );

    if (!result || !result.id) {
      throw new Error('Failed to create user');
    }

    const user = await db.getAsync(
      `SELECT id, name, email, role, department, avatar_color as avatarColor 
       FROM users WHERE id = $1`,
      [result.id]
    );

    if (!user) {
      throw new Error('User created but not found');
    }

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Register error:', error);
    
    // PostgreSQL error codes
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        message: 'Database constraint error. Please check your input.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration: ' + error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await db.getAsync(
      'SELECT id, name, email, password, role, department, avatar_color as avatarColor FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    delete user.password;

    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await db.getAsync(
      'SELECT id, name, email, role, department, avatar_color as avatarColor FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};