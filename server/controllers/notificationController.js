const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// ==================== NOTIFICATIONS ====================

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await db.allAsync(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    
    const unreadCount = await db.getAsync(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? AND read_at IS NULL`,
      [req.user.id]
    );
    
    res.json({
      success: true,
      count: notifications.length,
      unreadCount: unreadCount?.count || 0,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching notifications'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await db.getAsync(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    await db.runAsync(
      'UPDATE notifications SET read_at = datetime("now") WHERE id = ?',
      [req.params.id]
    );
    
    const updated = await db.getAsync(
      'SELECT * FROM notifications WHERE id = ?',
      [req.params.id]
    );
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking notification as read'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await db.runAsync(
      'UPDATE notifications SET read_at = datetime("now") WHERE user_id = ? AND read_at IS NULL',
      [req.user.id]
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking notifications as read'
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await db.getAsync(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    await db.runAsync(
      'DELETE FROM notifications WHERE id = ?',
      [req.params.id]
    );
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting notification'
    });
  }
};

