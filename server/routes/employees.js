const express = require('express');
const router = express.Router();
const {
    getEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeShifts
} = require('../controllers/employeeController');
const { protect, role } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(role('manager', 'admin'), getEmployees);

router.route('/:id')
    .get(role('manager', 'admin'), getEmployee)
    .put(role('admin'), updateEmployee)
    .delete(role('admin'), deleteEmployee);

router.get('/:id/shifts', role('manager', 'admin'), getEmployeeShifts);

module.exports = router;