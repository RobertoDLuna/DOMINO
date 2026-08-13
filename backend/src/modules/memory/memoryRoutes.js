const express = require('express');
const router = express.Router();
const memoryController = require('./MemoryController');
const { authMiddleware, restrictRole, optionalAuth } = require('../../shared/middleware/authMiddleware');

router.post('/finish', optionalAuth, memoryController.finishGame);
router.get('/ranking', memoryController.getRanking);

// Rotas exclusivas para Professores e Admins
router.get('/reports', authMiddleware, restrictRole(['ADMIN', 'PROFESSOR']), memoryController.getReports);

module.exports = router;
