const { getPrisma } = require("../../shared/config/prismaClient");

class QuizReportService {
  /**
   * Gera um relatório analítico completo para um quiz específico
   */
  async getQuizReport(quizId) {
    const prisma = getPrisma();
    
    // Busca informações do quiz e questões
    const quiz = await prisma.quizGame.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            answers: true
          }
        }
      }
    });

    if (!quiz) throw new Error('Quiz não encontrado');

    // Busca todas as sessões finalizadas e suas respostas
    const sessions = await prisma.quizSession.findMany({
      where: { quizId, completedAt: { not: null } },
      include: {
        responses: true
      },
      orderBy: { totalPoints: 'desc' }
    });

    if (sessions.length === 0) {
      return {
        quiz: { title: quiz.title, type: quiz.type, id: quiz.id },
        totalParticipants: 0,
        ranking: [],
        questionStats: [],
        levelDistribution: {},
        bnccStats: []
      };
    }

    // 1. Ranking dos Alunos
    const ranking = sessions.map((s, index) => ({
      position: index + 1,
      userId: s.userId,
      userName: s.userName,
      points: s.totalPoints,
      correctAnswers: s.correctAnswers,
      totalQuestions: s.totalQuestions,
      accuracy: s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0,
      studentLevel: s.studentLevel
    }));

    // 2. Estatísticas das Questões e Análise de Distratores
    const questionStats = quiz.questions.map(question => {
      const responsesForQ = sessions.flatMap(s => s.responses.filter(r => r.questionId === question.id));
      const totalAnswers = responsesForQ.length;
      const correctAnswers = responsesForQ.filter(r => r.isCorrect).length;
      
      // Contabiliza quantas vezes cada alternativa foi escolhida
      const answerCounts = {};
      question.answers.forEach(a => answerCounts[a.id] = 0);
      responsesForQ.forEach(r => {
        if (r.answerId && answerCounts[r.answerId] !== undefined) {
          answerCounts[r.answerId]++;
        }
      });

      const distractorAnalysis = question.answers.map(a => ({
        answerText: a.answerText,
        isCorrect: a.isCorrect,
        timesChosen: answerCounts[a.id],
        percentage: totalAnswers > 0 ? Math.round((answerCounts[a.id] / totalAnswers) * 100) : 0
      }));

      return {
        questionId: question.id,
        questionText: question.questionText,
        bnccCode: question.bnccCode,
        totalAnswers,
        accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
        distractors: distractorAnalysis.sort((a, b) => b.timesChosen - a.timesChosen)
      };
    });

    // 3. Distribuição de Níveis Diagnósticos (apenas para quizzes pedagógicos)
    const levelDistribution = {
      INICIANTE: 0,
      EM_CONSTRUCAO: 0,
      PROFICIENTE: 0,
      AVANCADO: 0
    };

    if (quiz.type === 'PEDAGOGICO') {
      sessions.forEach(s => {
        if (s.studentLevel) levelDistribution[s.studentLevel]++;
      });
    }

    // 4. Análise de Habilidades BNCC (Habilidades com maior e menor taxa de acerto)
    const bnccMap = {};
    questionStats.forEach(q => {
      if (q.bnccCode) {
        if (!bnccMap[q.bnccCode]) bnccMap[q.bnccCode] = { code: q.bnccCode, totalQuestions: 0, totalAccuracy: 0 };
        bnccMap[q.bnccCode].totalQuestions++;
        bnccMap[q.bnccCode].totalAccuracy += q.accuracy;
      }
    });

    const bnccStats = Object.values(bnccMap).map(b => ({
      code: b.code,
      averageAccuracy: Math.round(b.totalAccuracy / b.totalQuestions)
    })).sort((a, b) => a.averageAccuracy - b.averageAccuracy); // Ordem crescente (mais difíceis primeiro)

    // 5. Matriz Aluno x Questão (Response Grid)
    const questionsOrdered = [...quiz.questions].sort((a, b) => a.order - b.order);
    const responseGrid = {
      columns: questionsOrdered.map((q, i) => ({
        index: i + 1,
        questionId: q.id,
        bnccCode: q.bnccCode
      })),
      rows: sessions.map(s => {
        const studentResponses = questionsOrdered.map(q => {
          const response = s.responses.find(r => r.questionId === q.id);
          return {
            questionId: q.id,
            isCorrect: response ? response.isCorrect : null // null = não respondeu
          };
        });

        return {
          userId: s.userId,
          userName: s.userName,
          responses: studentResponses
        };
      })
    };

    return {
      quiz: { title: quiz.title, type: quiz.type, id: quiz.id },
      totalParticipants: sessions.length,
      ranking,
      questionStats: questionStats.sort((a, b) => a.accuracy - b.accuracy), // Mais difíceis primeiro
      levelDistribution,
      bnccStats,
      responseGrid
    };
  }
}

module.exports = new QuizReportService();
