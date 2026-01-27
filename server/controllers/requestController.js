const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// @desc    Get all swap/change requests
// @route   GET /api/requests
// @access  Private
exports.getRequests = async (req, res) => {
  try {
    const { status, type, userId } = req.query;
    
    let query = `
      SELECT sr.id, sr.request_type, sr.status, sr.reason,
             sr.shift_id, sr.requested_by, sr.assigned_to,
             sr.replacement_employee_id, sr.proposed_start_time, sr.proposed_end_time,
             sr.created_at, sr.updated_at,
             req_user.name as requestedByName,
             req_user.email as requestedByEmail,
             assign_user.name as assignedToName,
             assign_user.email as assignedToEmail,
             replace_user.name as replacementEmployeeName,
             replace_user.email as replacementEmployeeEmail,
             s.title, s.start_time, s.end_time, s.department
      FROM shift_requests sr
      LEFT JOIN users req_user ON sr.requested_by = req_user.id
      LEFT JOIN users assign_user ON sr.assigned_to = assign_user.id
      LEFT JOIN users replace_user ON sr.replacement_employee_id = replace_user.id
      LEFT JOIN shifts s ON sr.shift_id = s.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND sr.status = ?`;
      params.push(status);
    }
    
    if (type) {
      query += ` AND sr.request_type = ?`;
      params.push(type);
    }
    
    if (userId) {
      query += ` AND (sr.requested_by = ? OR sr.assigned_to = ?)`;
      params.push(userId, userId);
    }
    
    if (req.user.role === 'manager') {
      query += ` AND (sr.assigned_to = ? OR sr.requested_by IN (
        SELECT id FROM users WHERE department = ?
      ))`;
      params.push(req.user.id, req.user.department);
    } else if (req.user.role === 'employee') {
      query += ` AND sr.requested_by = ?`;
      params.push(req.user.id);
    }
    
    query += ` ORDER BY sr.created_at DESC`;
    
    const requests = await db.allAsync(query, params);
    
    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching requests'
    });
  }
};

// @desc    Get suggested replacement employees for a shift
// @route   GET /api/requests/shift/:shiftId/available
// @access  Private (Manager/Admin)
exports.getAvailableReplacements = async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    const shift = await db.getAsync(
      'SELECT * FROM shifts WHERE id = ?',
      [shiftId]
    );
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Find employees who are:
    // 1. In the same department OR have matching skills
    // 2. Not already assigned to this shift
    // 3. Not scheduled during this time period
    const available = await db.allAsync(
      `SELECT u.id, u.name, u.email, u.department, u.role, u.avatar_color as avatarColor
       FROM users u
       WHERE u.role IN ('employee', 'manager')
         AND u.id NOT IN (
           SELECT employee_id FROM shift_employees WHERE shift_id = ?
         )
         AND u.id NOT IN (
           SELECT se.employee_id 
           FROM shift_employees se
           JOIN shifts s ON se.shift_id = s.id
           WHERE s.id != ?
             AND s.start_time < ? 
             AND s.end_time > ?
         )
         AND (u.department = ? OR u.department = 'General')
       ORDER BY 
         CASE WHEN u.department = ? THEN 0 ELSE 1 END,
         u.name ASC`,
      [shiftId, shiftId, shift.end_time, shift.start_time, shift.department, shift.department]
    );
    
    res.json({
      success: true,
      count: available.length,
      data: available
    });
  } catch (error) {
    console.error('Get available replacements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching available employees'
    });
  }
};

// @desc    Create swap or change request
// @route   POST /api/requests
// @access  Private (Employee/Manager)
exports.createRequest = async (req, res) => {
  try {
    const { requestType, shiftId, reason, proposedStartTime, proposedEndTime } = req.body;
    
    if (!requestType || !shiftId) {
      return res.status(400).json({
        success: false,
        message: 'Request type and shift ID are required'
      });
    }
    
    const validTypes = ['swap', 'cancel', 'change'];
    if (!validTypes.includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request type'
      });
    }
    
    // Verify user is assigned to this shift
    const assignment = await db.getAsync(
      `SELECT se.* FROM shift_employees se 
       WHERE se.shift_id = ? AND se.employee_id = ?`,
      [shiftId, req.user.id]
    );
    
    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this shift'
      });
    }
    
    const shift = await db.getAsync(
      'SELECT * FROM shifts WHERE id = ?',
      [shiftId]
    );
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Check for existing pending requests for this shift
    const existingRequest = await db.getAsync(
      `SELECT id FROM shift_requests 
       WHERE shift_id = ? AND requested_by = ? AND status = 'pending'`,
      [shiftId, req.user.id]
    );
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this shift'
      });
    }
    
    // Validate change request times
    if (requestType === 'change') {
      if (!proposedStartTime || !proposedEndTime) {
        return res.status(400).json({
          success: false,
          message: 'Proposed start and end times are required for change requests'
        });
      }
      
      const start = new Date(proposedStartTime);
      const end = new Date(proposedEndTime);
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'Proposed end time must be after start time'
        });
      }
    }
    
    // Determine who the request is assigned to
    let assignedTo = shift.created_by;
    if (!assignedTo) {
      const manager = await db.getAsync(
        `SELECT id FROM users 
         WHERE role IN ('manager', 'admin') 
           AND (department = ? OR role = 'admin')
         ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END
         LIMIT 1`,
        [shift.department]
      );
      assignedTo = manager?.id;
    }
    
    const requestId = uuidv4();
    
    await db.runAsync(
      `INSERT INTO shift_requests 
       (id, shift_id, request_type, status, reason, requested_by, assigned_to, 
        proposed_start_time, proposed_end_time, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [requestId, shiftId, requestType, 'pending', reason || '', req.user.id, assignedTo,
       proposedStartTime || null, proposedEndTime || null]
    );
    
    // Create audit log
    const auditId = uuidv4();
    await db.runAsync(
      `INSERT INTO audit_logs 
       (id, user_id, action, resource_type, resource_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [auditId, req.user.id, 'create_request', 'shift_request', requestId, 
       JSON.stringify({ requestType, reason, proposedStartTime, proposedEndTime })]
    );
    
    // Create notification for manager
    const notifId = uuidv4();
    await db.runAsync(
      `INSERT INTO notifications 
       (id, user_id, type, title, message, related_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [notifId, assignedTo, 'shift_request', 'New Shift Request',
       `${req.user.name} requested to ${requestType} shift "${shift.title}"`, requestId]
    );
    
    const request = await db.getAsync(
      `SELECT sr.*, u.name as requestedByName, u.email as requestedByEmail,
              s.title, s.start_time, s.end_time
       FROM shift_requests sr
       LEFT JOIN users u ON sr.requested_by = u.id
       LEFT JOIN shifts s ON sr.shift_id = s.id
       WHERE sr.id = ?`,
      [requestId]
    );
    
    res.status(201).json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating request'
    });
  }
};

// @desc    Approve shift request
// @route   POST /api/requests/:id/approve
// @access  Private (Manager/Admin)
exports.approveRequest = async (req, res) => {
  try {
    const { replacementEmployeeId } = req.body;
    
    const request = await db.getAsync(
      `SELECT sr.*, s.title, s.start_time, s.end_time, s.department
       FROM shift_requests sr
       JOIN shifts s ON sr.shift_id = s.id
       WHERE sr.id = ?`,
      [req.params.id]
    );
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a ${request.status} request`
      });
    }
    
    // Authorization check
    if (req.user.role === 'manager' && request.assigned_to !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this request'
      });
    }
    
    // Handle different request types
    if (request.request_type === 'swap') {
      // Swap requires a replacement employee
      if (!replacementEmployeeId) {
        return res.status(400).json({
          success: false,
          message: 'Replacement employee is required for swap requests'
        });
      }
      
      // Verify replacement employee exists and is available
      const replacementEmployee = await db.getAsync(
        'SELECT * FROM users WHERE id = ? AND role IN ("employee", "manager")',
        [replacementEmployeeId]
      );
      
      if (!replacementEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Replacement employee not found'
        });
      }
      
      // Check if replacement is already assigned to this shift
      const alreadyAssigned = await db.getAsync(
        'SELECT * FROM shift_employees WHERE shift_id = ? AND employee_id = ?',
        [request.shift_id, replacementEmployeeId]
      );
      
      if (alreadyAssigned) {
        return res.status(400).json({
          success: false,
          message: 'Replacement employee is already assigned to this shift'
        });
      }
      
      // Check for scheduling conflicts
      const conflict = await db.getAsync(
        `SELECT s.title FROM shift_employees se
         JOIN shifts s ON se.shift_id = s.id
         WHERE se.employee_id = ?
           AND s.start_time < ?
           AND s.end_time > ?`,
        [replacementEmployeeId, request.end_time, request.start_time]
      );
      
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: `Replacement employee has a conflict with shift: ${conflict.title}`
        });
      }
      
      // Remove original employee from shift
      await db.runAsync(
        'DELETE FROM shift_employees WHERE shift_id = ? AND employee_id = ?',
        [request.shift_id, request.requested_by]
      );
      
      // Add replacement employee to shift
      await db.runAsync(
        'INSERT INTO shift_employees (shift_id, employee_id, confirmed) VALUES (?, ?, 0)',
        [request.shift_id, replacementEmployeeId]
      );
      
      // Update request with replacement employee
      await db.runAsync(
        `UPDATE shift_requests 
         SET status = ?, replacement_employee_id = ?, updated_at = datetime('now') 
         WHERE id = ?`,
        ['approved', replacementEmployeeId, req.params.id]
      );
      
      // Notify replacement employee
      const notifId1 = uuidv4();
      await db.runAsync(
        `INSERT INTO notifications 
         (id, user_id, type, title, message, related_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [notifId1, replacementEmployeeId, 'shift_assigned', 'New Shift Assignment',
         `You've been assigned to cover "${request.title}" on ${new Date(request.start_time).toLocaleDateString()}`,
         request.shift_id]
      );
      
    } else if (request.request_type === 'change') {
      // Update shift times
      if (!request.proposed_start_time || !request.proposed_end_time) {
        return res.status(400).json({
          success: false,
          message: 'Proposed times are missing'
        });
      }
      
      await db.runAsync(
        `UPDATE shifts 
         SET start_time = ?, end_time = ? 
         WHERE id = ?`,
        [request.proposed_start_time, request.proposed_end_time, request.shift_id]
      );
      
      await db.runAsync(
        `UPDATE shift_requests 
         SET status = ?, updated_at = datetime('now') 
         WHERE id = ?`,
        ['approved', req.params.id]
      );
      
    } else if (request.request_type === 'cancel') {
      // Cancel the shift
      await db.runAsync(
        `UPDATE shifts 
         SET status = 'cancelled' 
         WHERE id = ?`,
        [request.shift_id]
      );
      
      await db.runAsync(
        `UPDATE shift_requests 
         SET status = ?, updated_at = datetime('now') 
         WHERE id = ?`,
        ['approved', req.params.id]
      );
      
      // Notify all assigned employees
      const assignedEmployees = await db.allAsync(
        'SELECT employee_id FROM shift_employees WHERE shift_id = ?',
        [request.shift_id]
      );
      
      for (const emp of assignedEmployees) {
        if (emp.employee_id !== request.requested_by) {
          const notifId = uuidv4();
          await db.runAsync(
            `INSERT INTO notifications 
             (id, user_id, type, title, message, related_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [notifId, emp.employee_id, 'shift_cancelled', 'Shift Cancelled',
             `Shift "${request.title}" has been cancelled`, request.shift_id]
          );
        }
      }
    }
    
    // Create audit log
    const auditId = uuidv4();
    await db.runAsync(
      `INSERT INTO audit_logs 
       (id, user_id, action, resource_type, resource_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [auditId, req.user.id, 'approve_request', 'shift_request', req.params.id,
       JSON.stringify({ replacementEmployeeId })]
    );
    
    // Notify original requester
    const notifId2 = uuidv4();
    await db.runAsync(
      `INSERT INTO notifications 
       (id, user_id, type, title, message, related_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [notifId2, request.requested_by, 'request_approved', 'Request Approved',
       `Your ${request.request_type} request for "${request.title}" has been approved`, req.params.id]
    );
    
    const updated = await db.getAsync(
      `SELECT sr.*, 
              req_user.name as requestedByName,
              replace_user.name as replacementEmployeeName,
              s.title
       FROM shift_requests sr
       LEFT JOIN users req_user ON sr.requested_by = req_user.id
       LEFT JOIN users replace_user ON sr.replacement_employee_id = replace_user.id
       LEFT JOIN shifts s ON sr.shift_id = s.id
       WHERE sr.id = ?`,
      [req.params.id]
    );
    
    res.json({
      success: true,
      data: updated,
      message: `${request.request_type} request approved successfully`
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving request: ' + error.message
    });
  }
};

// @desc    Reject shift request
// @route   POST /api/requests/:id/reject
// @access  Private (Manager/Admin)
exports.rejectRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const request = await db.getAsync(
      `SELECT sr.*, s.title 
       FROM shift_requests sr
       JOIN shifts s ON sr.shift_id = s.id
       WHERE sr.id = ?`,
      [req.params.id]
    );
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a ${request.status} request`
      });
    }
    
    if (req.user.role === 'manager' && request.assigned_to !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this request'
      });
    }
    
    const rejectionReason = reason || 'No reason provided';
    
    await db.runAsync(
      `UPDATE shift_requests 
       SET status = ?, reason = ?, updated_at = datetime('now') 
       WHERE id = ?`,
      ['rejected', rejectionReason, req.params.id]
    );
    
    // Create audit log
    const auditId = uuidv4();
    await db.runAsync(
      `INSERT INTO audit_logs 
       (id, user_id, action, resource_type, resource_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [auditId, req.user.id, 'reject_request', 'shift_request', req.params.id,
       JSON.stringify({ reason: rejectionReason })]
    );
    
    // Notify requester
    const notifId = uuidv4();
    await db.runAsync(
      `INSERT INTO notifications 
       (id, user_id, type, title, message, related_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [notifId, request.requested_by, 'request_rejected', 'Request Rejected',
       `Your ${request.request_type} request for "${request.title}" was rejected. Reason: ${rejectionReason}`,
       req.params.id]
    );
    
    const updated = await db.getAsync(
      `SELECT sr.*, s.title 
       FROM shift_requests sr
       LEFT JOIN shifts s ON sr.shift_id = s.id
       WHERE sr.id = ?`,
      [req.params.id]
    );
    
    res.json({
      success: true,
      data: updated,
      message: 'Request rejected successfully'
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting request'
    });
  }
};

// @desc    Cancel shift request
// @route   POST /api/requests/:id/cancel
// @access  Private
exports.cancelRequest = async (req, res) => {
  try {
    const request = await db.getAsync(
      'SELECT * FROM shift_requests WHERE id = ?',
      [req.params.id]
    );
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    if (request.requested_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${request.status} request`
      });
    }
    
    await db.runAsync(
      `UPDATE shift_requests 
       SET status = ?, updated_at = datetime('now') 
       WHERE id = ?`,
      ['cancelled', req.params.id]
    );
    
    // Create audit log
    const auditId = uuidv4();
    await db.runAsync(
      `INSERT INTO audit_logs 
       (id, user_id, action, resource_type, resource_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [auditId, req.user.id, 'cancel_request', 'shift_request', req.params.id, '']
    );
    
    const updated = await db.getAsync(
      'SELECT * FROM shift_requests WHERE id = ?',
      [req.params.id]
    );
    
    res.json({
      success: true,
      data: updated,
      message: 'Request cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling request'
    });
  }
};