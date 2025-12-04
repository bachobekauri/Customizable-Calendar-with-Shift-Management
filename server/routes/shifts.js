const express = require('express');
const router = express.Router();
const {
    getShifts,
    getShift,
    createShift,
    updateShift,
    deleteShift,
    getShiftsByWeek,
    confirmShift,
    getAvailableUsers
} = require('../controllers/shiftController');
const { protect, role } = require('../middleware/authMiddleware.js');

// Apply protection to all routes
router.use(protect);

// IMPORTANT: Specific routes MUST come before parameterized routes
// Otherwise Express will treat "week" and "users" as IDs

// Users route (for shift assignment)
router.get('/users/available', role('manager', 'admin'), getAvailableUsers);

// Week route
router.get('/week/:date', getShiftsByWeek);

// Confirm shift route
router.post('/:id/confirm', confirmShift);

// General CRUD routes (these use :id parameter, so they come last)
router.route('/')
    .get(getShifts)
    .post(role('manager', 'admin'), createShift);

router.route('/:id')
    .get(getShift)
    .put(role('manager', 'admin'), updateShift)
    .delete(role('manager', 'admin'), deleteShift);

module.exports = router;