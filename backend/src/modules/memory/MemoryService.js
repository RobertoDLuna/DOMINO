const { getPrisma } = require('../../shared/config/prismaClient');

class MemoryService {
  async finishGame(user, payload) {
    const prisma = getPrisma();
    let dbUser = null;
    if (user && user.id) {
      dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { school: true }
      });
    }

    const {
      themeId,
      totalPairs = 6,
      pairsFound = 6,
      errors = 0,
      consecutiveErrors = 0,
      maxCombo = 0,
      timeSpentSecs = 0,
    } = payload;

    // Calcular pontuação
    // Pontuação base: 100 pontos por par encontrado
    let baseScore = pairsFound * 100;

    // Penalidade por erros (10 pontos por erro)
    baseScore -= errors * 10;

    // Penalidade por erros consecutivos (20 pontos extras para cada erro consecutivo acima de 2)
    if (consecutiveErrors > 2) {
      baseScore -= (consecutiveErrors - 2) * 20;
    }

    // Bônus de Combo (Multiplicador de acertos)
    let multiplier = 1.0;
    if (maxCombo >= 2) multiplier = 1.2;
    if (maxCombo >= 4) multiplier = 1.5;
    if (maxCombo >= 6) multiplier = 2.0;

    let finalScore = Math.floor(baseScore * multiplier);

    // Pontuação mínima de participação
    if (finalScore < 50) {
      finalScore = 50;
    }

    // Se o jogador encontrou 0 pares, 0 pontos (abandono ou apenas clicou em finish)
    if (pairsFound === 0) {
      finalScore = 0;
    }

    // Salvar Partida
    const game = await prisma.memoryGame.create({
      data: {
        themeId: themeId || null,
        userId: dbUser ? dbUser.id : null,
        userName: dbUser ? dbUser.fullName : 'Guest',
        mode: 'SINGLE_PLAYER',
        totalPairs,
        pairsFound,
        errors,
        consecutiveErrors,
        timeSpentSecs,
        finalScore,
        finishedAt: new Date(),
      }
    });

    // Atualizar Ranking (Apenas para alunos/usuários logados)
    if (dbUser && dbUser.id) {
      // Obter o melhor score atual
      const currentRanking = await prisma.memoryRanking.findUnique({ where: { userId: dbUser.id } });
      const currentBest = currentRanking ? currentRanking.bestScore : 0;
      const newBest = Math.max(finalScore, currentBest);

      await prisma.memoryRanking.upsert({
        where: { userId: dbUser.id },
        update: {
          gamesPlayed: { increment: 1 },
          totalScore: { increment: finalScore },
          bestScore: newBest
        },
        create: {
          userId: dbUser.id,
          userName: dbUser.fullName,
          schoolId: dbUser.schoolId || null,
          schoolName: dbUser.school ? dbUser.school.name : null,
          gamesPlayed: 1,
          totalScore: finalScore,
          bestScore: finalScore,
        }
      });
    }

    return game;
  }

  async getRanking() {
    const prisma = getPrisma();
    return await prisma.memoryRanking.findMany({
      orderBy: { bestScore: 'desc' },
      take: 50
    });
  }

  async getReports() {
    const prisma = getPrisma();
    return await prisma.memoryGame.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        theme: { select: { name: true } }
      },
      take: 100
    });
  }
}

module.exports = new MemoryService();
