
const db = require('../db');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin/Manager)
exports.getUsers = async (req, res) => {
  try {
    const users = await db.allAsync(
      `SELECT id, name, email, role, department, avatar_color as avatarColor, created_at
       FROM users 
       ORDER BY name ASC`
    );

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin/Manager)
exports.getUser = async (req, res) => {
  try {
    const user = await db.getAsync(
      `SELECT id, name, email, role, department, avatar_color as avatarColor, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin/Manager)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, department, avatarColor } = req.body;

    const userExists = await db.getAsync(
      'SELECT id FROM users WHERE id = $1',
      [req.params.id]
    );

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await db.runAsync(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        department = COALESCE($4, department),
        avatar_color = COALESCE($5, avatar_color)
       WHERE id = $6`,
      [name, email, role, department, avatarColor, req.params.id]
    );

    const updatedUser = await db.getAsync(
      `SELECT id, name, email, role, department, avatar_color as avatarColor, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await db.getAsync(
      'SELECT id FROM users WHERE id = $1',
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await db.runAsync('DELETE FROM users WHERE id = $1', [req.params.id]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
};