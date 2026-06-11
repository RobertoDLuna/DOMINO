const { getPrisma } = require("../../shared/config/prismaClient");

class QuizService {
  /**
   * Generates a unique 5-character room code
   */
  generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  /**
   * Create a new Quiz Game
   */
  async createQuiz(data, creatorId) {
    const prisma = getPrisma();
    const { title, description, type, discipline, educStage, yearGrade, timePerQuestion, isPublic, shuffleQuestions, shuffleAnswers, questions } = data;

    return await prisma.quizGame.create({
      data: {
        title,
        description,
        type: type || 'PEDAGOGICO',
        discipline,
        educStage,
        yearGrade,
        timePerQuestion: parseInt(timePerQuestion) || 30,
        isPublic: isPublic !== undefined ? isPublic : false,
        shuffleQuestions: shuffleQuestions !== undefined ? shuffleQuestions : true,
        shuffleAnswers: shuffleAnswers !== undefined ? shuffleAnswers : true,
        createdById: creatorId,
        questions: {
          create: questions?.map((q, index) => ({
            bnccCode: q.bnccCode,
            bnccSkill: q.bnccSkill,
            questionText: q.questionText,
            imageUrl: q.imageUrl,
            order: index,
            answers: {
              create: q.answers?.map((a, aIndex) => ({
                answerText: a.answerText,
                isCorrect: a.isCorrect,
                imageUrl: a.imageUrl,
                order: aIndex
              })) || []
            }
          })) || []
        }
      },
      include: {
        questions: {
          include: { answers: true }
        }
      }
    });
  }

  /**
   * Update an existing Quiz Game
   */
  async updateQuiz(id, data, userId) {
    const prisma = getPrisma();
    
    // Check permission
    const existingQuiz = await prisma.quizGame.findUnique({ where: { id } });
    if (!existingQuiz) throw new Error('Quiz não encontrado');
    if (existingQuiz.createdById !== userId) throw new Error('Acesso negado: Somente o criador pode editar este quiz.');

    const { title, description, type, discipline, educStage, yearGrade, timePerQuestion, isPublic, shuffleQuestions, shuffleAnswers, questions } = data;

    // Atualiza os dados básicos do Quiz
    const updatedQuiz = await prisma.quizGame.update({
      where: { id },
      data: {
        title,
        description,
        type: type || 'PEDAGOGICO',
        discipline,
        educStage,
        yearGrade,
        timePerQuestion: parseInt(timePerQuestion) || 30,
        isPublic: isPublic !== undefined ? isPublic : false,
        shuffleQuestions: shuffleQuestions !== undefined ? shuffleQuestions : true,
        shuffleAnswers: shuffleAnswers !== undefined ? shuffleAnswers : true,
      }
    });

    // Lida com as questões (Atualiza existentes, Cria novas)
    if (questions && Array.isArray(questions)) {
      const existingQuestions = await prisma.quizQuestion.findMany({ where: { quizId: id }, select: { id: true } });
      const existingQuestionIds = existingQuestions.map(q => q.id);
      const incomingQuestionIds = questions.filter(q => q.id).map(q => q.id);

      // Tenta deletar questões removidas (pode falhar se houver respostas, o que é seguro para a integridade)
      const questionsToDelete = existingQuestionIds.filter(qId => !incomingQuestionIds.includes(qId));
      if (questionsToDelete.length > 0) {
        try {
          await prisma.quizQuestion.deleteMany({ where: { id: { in: questionsToDelete } } });
        } catch (e) {
          throw new Error('Não é possível excluir questões que já foram respondidas. Tente apenas editá-las ou criar um novo quiz.');
        }
      }

      // Upsert de questões e alternativas
      for (let index = 0; index < questions.length; index++) {
        const q = questions[index];

        if (q.id) {
          // Update
          await prisma.quizQuestion.update({
            where: { id: q.id },
            data: {
              bnccCode: q.bnccCode,
              bnccSkill: q.bnccSkill,
              questionText: q.questionText,
              imageUrl: q.imageUrl,
              order: index,
            }
          });

          // Atualiza as alternativas dessa questão
          if (q.answers && Array.isArray(q.answers)) {
            const existingAnswers = await prisma.quizAnswer.findMany({ where: { questionId: q.id }, select: { id: true } });
            const existingAnswerIds = existingAnswers.map(a => a.id);
            const incomingAnswerIds = q.answers.filter(a => a.id).map(a => a.id);

            const answersToDelete = existingAnswerIds.filter(aId => !incomingAnswerIds.includes(aId));
            if (answersToDelete.length > 0) {
              try {
                await prisma.quizAnswer.deleteMany({ where: { id: { in: answersToDelete } } });
              } catch (e) {
                throw new Error('Não é possível excluir alternativas que já foram escolhidas por alunos.');
              }
            }

            for (let aIndex = 0; aIndex < q.answers.length; aIndex++) {
              const a = q.answers[aIndex];
              if (a.id) {
                await prisma.quizAnswer.update({
                  where: { id: a.id },
                  data: { answerText: a.answerText, isCorrect: a.isCorrect, imageUrl: a.imageUrl, order: aIndex }
                });
              } else {
                await prisma.quizAnswer.create({
                  data: { answerText: a.answerText, isCorrect: a.isCorrect, imageUrl: a.imageUrl, order: aIndex, questionId: q.id }
                });
              }
            }
          }

        } else {
          // Create
          await prisma.quizQuestion.create({
            data: {
              quizId: id,
              bnccCode: q.bnccCode,
              bnccSkill: q.bnccSkill,
              questionText: q.questionText,
              imageUrl: q.imageUrl,
              order: index,
              answers: {
                create: q.answers?.map((a, aIndex) => ({
                  answerText: a.answerText,
                  isCorrect: a.isCorrect,
                  imageUrl: a.imageUrl,
                  order: aIndex
                })) || []
              }
            }
          });
        }
      }
    }

    return await this.getQuizById(id);
  }

  /**
   * List quizzes with filters
   */
  async listQuizzes(filters = {}, userId = null, isAdmin = false) {
    const prisma = getPrisma();
    const conditions = [];

    // Se NÃO for admin e NÃO estiver logado (visitante), vê apenas os públicos
    if (!isAdmin && !userId) {
      conditions.push({ isPublic: true });
    }
    // Se estiver logado (aluno ou professor), a regra de negócio atual diz que 
    // "privados apenas os professores e alunos podem visualizar", 
    // ou seja, vê todos os quizzes (públicos e privados). Não adicionamos restrição.

    if (filters.isPublic !== undefined) conditions.push({ isPublic: filters.isPublic === 'true' || filters.isPublic === true });
    if (filters.createdById) conditions.push({ createdById: filters.createdById });
    if (filters.type) conditions.push({ type: filters.type });
    if (filters.discipline) conditions.push({ discipline: filters.discipline });
    if (filters.yearGrade) conditions.push({ yearGrade: filters.yearGrade });
    if (filters.search) {
      conditions.push({
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ]
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    return await prisma.quizGame.findMany({
      where,
      include: {
        createdBy: { select: { fullName: true } },
        _count: { select: { questions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get Quiz details
   */
  async getQuizById(id) {
    const prisma = getPrisma();
    return await prisma.quizGame.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            answers: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });
  }

  /**
   * Delete Quiz
   */
  async deleteQuiz(id, userId) {
    const prisma = getPrisma();
    const quiz = await prisma.quizGame.findUnique({ where: { id } });
    if (!quiz) throw new Error('Quiz não encontrado');
    if (quiz.createdById !== userId) throw new Error('Acesso negado');

    await prisma.quizGame.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Start a Quiz (changes status and generates code if not ASYNC only)
   */
  async startQuiz(id, mode) {
    const prisma = getPrisma();
    const quiz = await prisma.quizGame.findUnique({ where: { id } });
    if (!quiz) throw new Error('Quiz não encontrado');

    const status = mode === 'ASYNC' ? 'ASYNC' : 'LIVE';
    let roomCode = quiz.roomCode;
    
    // Always generate a room code if it doesn't have one or if starting a new live session
    if (!roomCode || status === 'LIVE') {
      roomCode = this.generateRoomCode();
    }

    return await prisma.quizGame.update({
      where: { id },
      data: {
        status,
        roomCode
      }
    });
  }

  /**
   * Stop/Finish a Quiz
   */
  async finishQuiz(id) {
    const prisma = getPrisma();
    return await prisma.quizGame.update({
      where: { id },
      data: {
        status: 'FINISHED',
        roomCode: null // free up the room code
      }
    });
  }

  /**
   * Find Quiz by room code (for students joining)
   */
  async getQuizByRoomCode(roomCode) {
    const prisma = getPrisma();
    return await prisma.quizGame.findUnique({
      where: { roomCode },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            answers: {
              select: { id: true, answerText: true, imageUrl: true, order: true } // Do NOT expose isCorrect
            }
          }
        }
      }
    });
  }
}

module.exports = new QuizService();
