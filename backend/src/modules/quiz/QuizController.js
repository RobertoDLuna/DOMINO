const QuizService = require('./QuizService');
const QuizSessionService = require('./QuizSessionService');
const QuizReportService = require('./QuizReportService');

class QuizController {
  // --- Upload de Imagem ---
  uploadImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
      }
      const imageUrl = `/uploads/quizzes/${req.file.filename}`;
      res.status(201).json({ url: imageUrl });
    } catch (error) {
      next(error);
    }
  }

  // --- Gerenciamento de Quiz ---
  async createQuiz(req, res, next) {
    try {
      const creatorId = req.user.id; // Obtido via authMiddleware
      const quiz = await QuizService.createQuiz(req.body, creatorId);
      res.status(201).json(quiz);
    } catch (error) {
      next(error);
    }
  }

  async updateQuiz(req, res, next) {
    try {
      const userId = req.user.id;
      const quiz = await QuizService.updateQuiz(req.params.id, req.body, userId);
      res.json(quiz);
    } catch (error) {
      if (error.message.includes('Acesso negado')) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  }

  async listQuizzes(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const isAdmin = req.user && req.user.role === 'ADMIN';
      const quizzes = await QuizService.listQuizzes(req.query, userId, isAdmin);
      res.json(quizzes);
    } catch (error) {
      next(error);
    }
  }

  async getQuiz(req, res, next) {
    try {
      const quiz = await QuizService.getQuizById(req.params.id);
      if (!quiz) return res.status(404).json({ error: 'Quiz não encontrado' });

      // Somente usuários logados podem ver quizzes privados
      if (!quiz.isPublic && !req.user) {
        return res.status(403).json({ error: 'Este quiz é privado e requer login.' });
      }

      res.json(quiz);
    } catch (error) {
      next(error);
    }
  }

  async deleteQuiz(req, res, next) {
    try {
      await QuizService.deleteQuiz(req.params.id, req.user.id);
      res.json({ message: 'Quiz deletado com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  async startQuiz(req, res, next) {
    try {
      const { mode } = req.body; // 'LIVE' ou 'ASYNC'
      const quiz = await QuizService.startQuiz(req.params.id, mode);
      res.json(quiz);
    } catch (error) {
      next(error);
    }
  }

  async finishQuiz(req, res, next) {
    try {
      const quiz = await QuizService.finishQuiz(req.params.id);
      res.json(quiz);
    } catch (error) {
      next(error);
    }
  }

  async getQuizByRoomCode(req, res, next) {
    try {
      const quiz = await QuizService.getQuizByRoomCode(req.params.code);
      if (!quiz) return res.status(404).json({ error: 'Sala não encontrada' });
      if (quiz.status !== 'LIVE' && quiz.status !== 'ASYNC') {
        return res.status(400).json({ error: 'Este quiz não está aberto para respostas no momento' });
      }
      res.json(quiz);
    } catch (error) {
      next(error);
    }
  }

  // --- Gerenciamento de Sessão de Participação ---
  async createSession(req, res, next) {
    try {
      // req.user pode ser indefinido se for convidado
      const userId = req.user?.id || null;
      const userName = req.user?.fullName || req.body.guestName;
      if (!userName) return res.status(400).json({ error: 'Nome do participante é obrigatório' });

      const session = await QuizSessionService.createSession(req.params.id, userId, userName, req.user?.schoolId);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }

  async submitAnswer(req, res, next) {
    try {
      const { questionId, answerId, timeTakenSecs } = req.body;
      const result = await QuizSessionService.submitAnswer(req.params.sessionId, questionId, answerId, timeTakenSecs);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async finalizeSession(req, res, next) {
    try {
      const session = await QuizSessionService.finalizeSession(req.params.sessionId);
      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  // --- Relatórios ---
  async getQuizReport(req, res, next) {
    try {
      const report = await QuizReportService.getQuizReport(req.params.id);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }

  // --- Habilidades BNCC ---
  async listBnccSkills(req, res, next) {
    try {
      const { search } = req.query;
      const skills = await QuizService.listBnccSkills(search);
      res.json(skills);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QuizController();
