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

router.use(protect);


router.get('/users/available', role('manager', 'admin'), getAvailableUsers);

router.get('/week/:date', getShiftsByWeek);

router.post('/:id/confirm', confirmShift);

router.route('/')
    .get(getShifts)
    .post(role('manager', 'admin'), createShift);

router.route('/:id')
    .get(getShift)
    .put(role('manager', 'admin'), updateShift)
    .delete(role('manager', 'admin'), deleteShift);

module.exports = router;