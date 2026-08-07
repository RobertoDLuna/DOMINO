const { getPrisma } = require("../../shared/config/prismaClient");

class QuizSessionService {
  /**
   * Calcula o nível diagnóstico do estudante
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
   * Cria uma nova sessão para um usuário jogando um quiz
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
   * Submete uma resposta para uma pergunta específica
   */
  async submitAnswer(sessionId, questionId, answerId, timeTakenSecs = 0) {
    const prisma = getPrisma();
    
    // Valida se a alternativa escolhida é a correta
    let isCorrect = false;
    let basePoints = 0;
    
    if (answerId) {
      const answer = await prisma.quizAnswer.findUnique({ where: { id: answerId } });
      if (answer && answer.questionId === questionId) {
        isCorrect = answer.isCorrect;
      }
    }

    // Calcular pontuação (1000 pontos base por acerto, com penalidade por tempo)
    if (isCorrect) {
      basePoints = 1000;
      // Garante que a penalidade máxima nunca reduza a pontuação abaixo de 500
      const timePenalty = Math.max(0, timeTakenSecs) * 10;
      basePoints = Math.max(500, basePoints - timePenalty);
    }

    // Registra a resposta individual
    const response = await prisma.quizResponse.create({
      data: {
        sessionId,
        questionId,
        answerId,
        isCorrect,
        timeTakenSecs
      }
    });

    // Encontrar o ID da resposta correta para essa pergunta
    const correctAnswer = await prisma.quizAnswer.findFirst({
      where: { questionId, isCorrect: true },
      select: { id: true }
    });
    const correctAnswerId = correctAnswer ? correctAnswer.id : null;

    // Atualiza agregados da sessão do jogador
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
      correctAnswerId,
      pointsEarned: basePoints,
      response
    };
  }

  /**
   * Finaliza uma sessão e calcula diagnósticos e ranking
   */
  async finalizeSession(sessionId) {
    const prisma = getPrisma();
    const session = await prisma.quizSession.findUnique({ 
      where: { id: sessionId },
      include: { quiz: true }
    });

    if (!session) throw new Error('Sessão não encontrada');

    // Apenas calcula nível se for um quiz pedagógico
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

    // Calcula o ranking em relação às outras sessões deste quiz
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

    // rank é betterScoresCount + 1 (se 0 pessoas tiverem pontuação melhor, você é 1º lugar)
    const rank = betterScoresCount + 1;

    return { ...updatedSession, rank, totalPlayers };
  }

  /**
   * Obtém detalhes da sessão incluindo respostas
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
