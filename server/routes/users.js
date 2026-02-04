const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUser,
    updateUser,
    deleteUser
} = require('../controllers/userController');
const { protect, role } = require('../middleware/authMiddleware.js');

router.use(protect);

router.route('/')
    .get(role('manager', 'admin'), getUsers);

router.route('/:id')
    .get(role('manager', 'admin'), getUser)
    .put(role('manager', 'admin'), updateUser)
    .delete(role('admin'), deleteUser);

module.exports = router;