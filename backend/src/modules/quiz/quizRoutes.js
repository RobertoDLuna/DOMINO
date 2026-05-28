const express = require('express');
const router = express.Router();
const QuizController = require('./QuizController');
const { authMiddleware, optionalAuth, restrictRole } = require('../../shared/middleware/authMiddleware');

// Public routes (joining/playing)
router.get('/room/:code', optionalAuth, QuizController.getQuizByRoomCode);
router.post('/:id/session', optionalAuth, QuizController.createSession);
router.post('/session/:sessionId/answer', optionalAuth, QuizController.submitAnswer);
router.post('/session/:sessionId/finish', optionalAuth, QuizController.finalizeSession);

// Protected routes (listing, creating, reports)
router.get('/', optionalAuth, QuizController.listQuizzes);
router.get('/:id', optionalAuth, QuizController.getQuiz);
router.post('/', authMiddleware, restrictRole(['PROFESSOR', 'ADMIN']), QuizController.createQuiz);
router.put('/:id', authMiddleware, restrictRole(['PROFESSOR', 'ADMIN']), QuizController.updateQuiz);
router.delete('/:id', authMiddleware, restrictRole(['PROFESSOR', 'ADMIN']), QuizController.deleteQuiz);

router.post('/:id/start', authMiddleware, restrictRole(['PROFESSOR', 'ADMIN']), QuizController.startQuiz);
router.post('/:id/finish', authMiddleware, restrictRole(['PROFESSOR', 'ADMIN']), QuizController.finishQuiz);
router.get('/:id/report', authMiddleware, restrictRole(['PROFESSOR', 'ADMIN']), QuizController.getQuizReport);

module.exports = router;
