const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const { authMiddleware, restrictRole } = require('../middleware/authMiddleware');

// Check token and enforce ADMIN roll
router.use(authMiddleware);
router.use(restrictRole(['ADMIN']));

router.get('/stats', AdminController.getStats);
router.get('/pending', AdminController.getPendingApprovals);
router.put('/approve-theme/:id', AdminController.approveTheme);
router.delete('/reject-theme/:id', AdminController.rejectTheme);
router.get('/users', AdminController.getUsers);
router.put('/users/:id/reset-password', AdminController.resetUserPassword);
router.delete('/users/:id', AdminController.deleteUser);

module.exports = router;

