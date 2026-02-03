const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/authMiddleware');

// GET all requests
router.get('/', protect, async (req, res) => {
  try {
    console.log('GET /api/requests');
    
    const rows = await db.allAsync(`
      SELECT 
        r.*,
        u.name as requestedByName,
        u.email as requestedByEmail
      FROM shift_requests r
      LEFT JOIN users u ON r.requested_by = u.id
      ORDER BY r.created_at DESC
    `);

    const requests = rows.map(row => ({
      ...row,
      employees: row.employees ? JSON.parse(row.employees) : []
    }));

    res.json({ 
      success: true, 
      data: requests 
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch requests',
      error: err.message 
    });
  }
});

// GET single request
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const row = await db.getAsync(
      `SELECT * FROM shift_requests WHERE id = ?`,
      [id]
    );

    if (!row) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ 
      success: true, 
      data: row 
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST create request
router.post('/', protect, async (req, res) => {
  try {
    const {
      requestType,
      shiftId,
      reason,
      proposedStartTime,
      proposedEndTime
    } = req.body;

    console.log('POST /api/requests', req.body);
    console.log('User ID from auth:', req.user.id);

    if (!requestType || !shiftId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: requestType, shiftId' 
      });
    }

    // Verify shift exists
    const shift = await db.getAsync(
      `SELECT id FROM shifts WHERE id = ?`,
      [shiftId]
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Verify user exists (foreign key constraint)
    const user = await db.getAsync(
      `SELECT id FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const id = uuidv4();
    const requestedBy = req.user.id; // Use actual authenticated user ID
    const createdAt = new Date().toISOString();

    console.log('Creating request with:', { id, shiftId, requestType, requestedBy, createdAt });

    const query = `
      INSERT INTO shift_requests 
      (id, shift_id, request_type, status, reason, requested_by, proposed_start_time, proposed_end_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.runAsync(
      query,
      [id, shiftId, requestType, 'pending', reason || null, requestedBy, proposedStartTime || null, proposedEndTime || null, createdAt, createdAt]
    );

    console.log('Request created successfully:', id);

    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      data: { id, shiftId, requestType, status: 'pending', requestedBy }
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// POST approve request
router.post('/:id/approve', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { replacementEmployeeId } = req.body;

    console.log('POST /api/requests/:id/approve', { id, replacementEmployeeId });

    const query = `
      UPDATE shift_requests 
      SET status = ?, replacement_employee_id = ?, updated_at = ?
      WHERE id = ?
    `;

    const result = await db.runAsync(
      query,
      ['approved', replacementEmployeeId || null, new Date().toISOString(), id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({
      success: true,
      message: 'Request approved successfully'
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// POST reject request
router.post('/:id/reject', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('POST /api/requests/:id/reject', { id, reason });

    const query = `
      UPDATE shift_requests 
      SET status = ?, rejection_reason = ?, updated_at = ?
      WHERE id = ?
    `;

    const result = await db.runAsync(
      query,
      ['rejected', reason || null, new Date().toISOString(), id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({
      success: true,
      message: 'Request rejected successfully'
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// POST cancel request
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE shift_requests 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `;

    const result = await db.runAsync(
      query,
      ['cancelled', new Date().toISOString(), id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({
      success: true,
      message: 'Request cancelled successfully'
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// GET available replacements for a shift
router.get('/shift/:shiftId/available', protect, async (req, res) => {
  try {
    const { shiftId } = req.params;

    // Get all employees not assigned to this shift
    const rows = await db.allAsync(`
      SELECT u.id, u.name, u.email
      FROM users u
      WHERE u.role = 'employee' 
      AND u.id NOT IN (
        SELECT employee_id FROM shift_employees WHERE shift_id = ?
      )
      LIMIT 10
    `, [shiftId]);

    res.json({
      success: true,
      data: rows || []
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

module.exports = router;