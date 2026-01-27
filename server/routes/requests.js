const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// Middleware to protect routes
const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  req.user = { id: 'user123' }; // You should verify JWT here
  next();
};

// GET all requests
router.get('/', protect, (req, res) => {
  console.log('GET /api/requests');
  
  const query = `
    SELECT 
      r.*,
      u.name as requestedByName,
      u.email as requestedByEmail
    FROM shift_requests r
    LEFT JOIN users u ON r.requested_by = u.id
    ORDER BY r.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch requests',
        error: err.message 
      });
    }

    const requests = rows.map(row => ({
      ...row,
      employees: row.employees ? JSON.parse(row.employees) : []
    }));

    res.json({ 
      success: true, 
      data: requests 
    });
  });
});

// GET single request
router.get('/:id', protect, (req, res) => {
  const { id } = req.params;
  
  db.get(
    `SELECT * FROM shift_requests WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      if (!row) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      res.json({ 
        success: true, 
        data: row 
      });
    }
  );
});

// POST create request
router.post('/', protect, (req, res) => {
  const {
    requestType,
    shiftId,
    reason,
    proposedStartTime,
    proposedEndTime
  } = req.body;

  console.log('POST /api/requests', req.body);

  if (!requestType || !shiftId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: requestType, shiftId' 
    });
  }

  const id = uuidv4();
  const requestedBy = req.user.id;
  const createdAt = new Date().toISOString();

  const query = `
    INSERT INTO shift_requests 
    (id, shift_id, request_type, status, reason, requested_by, proposed_start_time, proposed_end_time, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [id, shiftId, requestType, 'pending', reason || null, requestedBy, proposedStartTime || null, proposedEndTime || null, createdAt],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: err.message });
      }

      res.status(201).json({
        success: true,
        message: 'Request created successfully',
        data: { id, shiftId, requestType, status: 'pending' }
      });
    }
  );
});

// POST approve request
router.post('/:id/approve', protect, (req, res) => {
  const { id } = req.params;
  const { replacementEmployeeId } = req.body;

  console.log('POST /api/requests/:id/approve', { id, replacementEmployeeId });

  const query = `
    UPDATE shift_requests 
    SET status = ?, replacement_employee_id = ?, updated_at = ?
    WHERE id = ?
  `;

  db.run(
    query,
    ['approved', replacementEmployeeId || null, new Date().toISOString(), id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      res.json({
        success: true,
        message: 'Request approved successfully'
      });
    }
  );
});

// POST reject request
router.post('/:id/reject', protect, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  console.log('POST /api/requests/:id/reject', { id, reason });

  const query = `
    UPDATE shift_requests 
    SET status = ?, rejection_reason = ?, updated_at = ?
    WHERE id = ?
  `;

  db.run(
    query,
    ['rejected', reason || null, new Date().toISOString(), id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      res.json({
        success: true,
        message: 'Request rejected successfully'
      });
    }
  );
});

// POST cancel request
router.post('/:id/cancel', protect, (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE shift_requests 
    SET status = ?, updated_at = ?
    WHERE id = ?
  `;

  db.run(
    query,
    ['cancelled', new Date().toISOString(), id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      res.json({
        success: true,
        message: 'Request cancelled successfully'
      });
    }
  );
});

// GET available replacements for a shift
router.get('/shift/:shiftId/available', protect, (req, res) => {
  const { shiftId } = req.params;

  // Get all employees not assigned to this shift
  const query = `
    SELECT u.id, u.name, u.email
    FROM users u
    WHERE u.role = 'employee' 
    AND u.id NOT IN (
      SELECT employee_id FROM shift_employees WHERE shift_id = ?
    )
    LIMIT 10
  `;

  db.all(query, [shiftId], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }

    res.json({
      success: true,
      data: rows || []
    });
  });
});

module.exports = router;