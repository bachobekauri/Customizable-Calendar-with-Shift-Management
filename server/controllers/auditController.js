
// ==================== AUDIT LOGS ====================

// @desc    Get audit logs
// @route   GET /api/audit-logs
// @access  Private (Manager/Admin)
exports.getAuditLogs = async (req, res) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view audit logs'
      });
    }
    
    const { startDate, endDate, action, userId } = req.query;
    
    let query = `
      SELECT al.*, u.name as userName, u.email as userEmail
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (startDate && endDate) {
      query += ` AND al.created_at >= $${paramIndex} AND al.created_at <= $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }
    
    if (action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }
    
    if (userId) {
      query += ` AND al.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT 1000`;
    
    const logs = await db.allAsync(query, params);
    
    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching audit logs'
    });
  }
};