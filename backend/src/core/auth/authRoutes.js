const express = require('express');
const router = express.Router();
const AuthController = require('./AuthController');
const { authMiddleware } = require('../../shared/middleware/authMiddleware');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authMiddleware, AuthController.me);
router.post('/change-password', authMiddleware, AuthController.changePassword);

module.exports = router;
