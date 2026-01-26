const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/notificationController');
const { protect, role } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', role('manager', 'admin'), getAuditLogs);

module.exports = router;