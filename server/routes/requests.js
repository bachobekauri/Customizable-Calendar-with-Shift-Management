
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { protect, role } = require('../middleware/authMiddleware');

const {
  getRequests,
  getAvailableReplacements,
  createRequest,
  approveRequest,
  rejectRequest,
  cancelRequest
} = require('../controllers/requestController');

router.use(protect);

router.get('/', getRequests);

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const requests = await db.allAsync(
      `SELECT sr.*, 
              u.name as requestedByName,
              u.email as requestedByEmail,
              s.title, s.start_time, s.end_time
       FROM shift_requests sr
       LEFT JOIN users u ON sr.requested_by = u.id
       LEFT JOIN shifts s ON sr.shift_id = s.id
       WHERE sr.id = $1`,
      [id]
    );

    if (!requests || requests.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    res.json({ 
      success: true, 
      data: requests[0] 
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

router.post('/', createRequest);

router.post('/:id/approve', role('manager', 'admin'), approveRequest);

router.post('/:id/reject', role('manager', 'admin'), rejectRequest);

router.post('/:id/cancel', cancelRequest);

router.get('/shift/:shiftId/available', role('manager', 'admin'), getAvailableReplacements);

module.exports = router;