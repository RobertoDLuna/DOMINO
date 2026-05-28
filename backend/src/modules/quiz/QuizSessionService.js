const { getPrisma } = require("../../shared/config/prismaClient");

class QuizSessionService {
  /**
   * Calculate student diagnostic level
   */
  calculateStudentLevel(correctAnswers, totalQuestions) {
    if (totalQuestions === 0) return 'INICIANTE';
    const percentage = (correctAnswers / totalQuestions) * 100;
    
    if (percentage < 40) return 'INICIANTE';
    if (percentage < 70) return 'EM_CONSTRUCAO';
    if (percentage < 90) return 'PROFICIENTE';
    return 'AVANCADO';
  }

  /**
   * Create a new session for a user playing a quiz
   */
  async createSession(quizId, userId, userName, schoolId = null) {
    const prisma = getPrisma();
    return await prisma.quizSession.create({
      data: {
        quizId,
        userId,
        userName,
        schoolId
      }
    });
  }

  /**
   * Submit an answer for a specific question
   */
  async submitAnswer(sessionId, questionId, answerId, timeTakenSecs = 0) {
    const prisma = getPrisma();
    
    // Validate if the answer is correct
    let isCorrect = false;
    let basePoints = 0;
    
    if (answerId) {
      const answer = await prisma.quizAnswer.findUnique({ where: { id: answerId } });
      if (answer && answer.questionId === questionId) {
        isCorrect = answer.isCorrect;
      }
    }

    // Calculate points (e.g. 1000 base points for correct, minus time penalty)
    if (isCorrect) {
      basePoints = 1000;
      // Simple time penalty: lose 10 points for every second taken, min 500 points
      const timePenalty = timeTakenSecs * 10;
      basePoints = Math.max(500, basePoints - timePenalty);
    }

    // Record response
    const response = await prisma.quizResponse.create({
      data: {
        sessionId,
        questionId,
        answerId,
        isCorrect,
        timeTakenSecs
      }
    });

    // Update session aggregates
    await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        totalQuestions: { increment: 1 },
        correctAnswers: { increment: isCorrect ? 1 : 0 },
        totalPoints: { increment: basePoints },
        timeSpentSecs: { increment: timeTakenSecs }
      }
    });

    return {
      isCorrect,
      pointsEarned: basePoints,
      response
    };
  }

  /**
   * Finalize a session and calculate diagnostics
   */
  async finalizeSession(sessionId) {
    const prisma = getPrisma();
    const session = await prisma.quizSession.findUnique({ 
      where: { id: sessionId },
      include: { quiz: true }
    });

    if (!session) throw new Error('Sessão não encontrada');

    // Only calculate level if it's a pedagogical quiz
    let studentLevel = null;
    if (session.quiz.type === 'PEDAGOGICO') {
      studentLevel = this.calculateStudentLevel(session.correctAnswers, session.totalQuestions);
    }

    const updatedSession = await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        studentLevel
      }
    });

    // Calculate ranking relative to all other sessions of this quiz
    const totalPlayers = await prisma.quizSession.count({
      where: { quizId: session.quizId, completedAt: { not: null } }
    });

    const betterScoresCount = await prisma.quizSession.count({
      where: {
        quizId: session.quizId,
        completedAt: { not: null },
        totalPoints: { gt: updatedSession.totalPoints }
      }
    });

    // rank is betterScoresCount + 1 (if 0 people have better scores, you are rank 1)
    const rank = betterScoresCount + 1;

    return { ...updatedSession, rank, totalPlayers };
  }

  /**
   * Get session details with responses
   */
  async getSessionDetails(sessionId) {
    const prisma = getPrisma();
    return await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        responses: {
          include: {
            question: true,
            answer: true
          }
        }
      }
    });
  }
}

module.exports = new QuizSessionService();
