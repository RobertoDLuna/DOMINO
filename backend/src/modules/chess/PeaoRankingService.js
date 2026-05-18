const { getPrisma } = require('../../shared/config/prismaClient');

class PeaoRankingService {
  /**
   * Atualiza o ranking após uma partida de Batalha dos Peões (apenas PVP)
   */
  async updateRanking(whiteId, blackId, result) {
    if (!whiteId || !blackId) return;
    try {
      const prisma = getPrisma();
      const [whiteUser, blackUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: whiteId }, include: { school: true } }),
        prisma.user.findUnique({ where: { id: blackId }, include: { school: true } }),
      ]);
      if (!whiteUser || !blackUser) return;

      let whiteStats = { wins: 0, losses: 0, draws: 0, points: 0 };
      let blackStats  = { wins: 0, losses: 0, draws: 0, points: 0 };

      if (result === 'WHITE_WIN') {
        whiteStats = { wins: 1, losses: 0, draws: 0, points: 3 };
        blackStats  = { wins: 0, losses: 1, draws: 0, points: 0 };
      } else if (result === 'BLACK_WIN') {
        whiteStats = { wins: 0, losses: 1, draws: 0, points: 0 };
        blackStats  = { wins: 1, losses: 0, draws: 0, points: 3 };
      } else if (result === 'DRAW') {
        whiteStats = { wins: 0, losses: 0, draws: 1, points: 1 };
        blackStats  = { wins: 0, losses: 0, draws: 1, points: 1 };
      }

      const upsertPlayer = (userId, user, stats) =>
        prisma.peaoRanking.upsert({
          where: { userId },
          update: {
            wins:      { increment: stats.wins },
            losses:    { increment: stats.losses },
            draws:     { increment: stats.draws },
            points:    { increment: stats.points },
            userName:  user.fullName,
            schoolId:  user.schoolId,
            schoolName: user.school?.name || null,
          },
          create: {
            userId,
            userName:  user.fullName,
            schoolId:  user.schoolId,
            schoolName: user.school?.name || null,
            wins:      stats.wins,
            losses:    stats.losses,
            draws:     stats.draws,
            points:    stats.points,
          },
        });

      await Promise.all([
        upsertPlayer(whiteId, whiteUser, whiteStats),
        upsertPlayer(blackId, blackUser, blackStats),
      ]);

      console.log(`🏆 [Peão Ranking] Atualizado: ${whiteUser.fullName} vs ${blackUser.fullName} → ${result}`);
    } catch (error) {
      console.error('❌ [PeaoRankingService] Erro ao atualizar ranking:', error);
    }
  }

  async getStudentRanking() {
    try {
      const prisma = getPrisma();
      const leaders = await prisma.peaoRanking.findMany({
        where: { points: { gt: 0 } },
        orderBy: { points: 'desc' },
        take: 100,
      });
      return leaders.map((l, index) => ({
        rank: index + 1,
        id: l.userId,
        name: l.userName,
        points: l.points,
        school: l.schoolName || 'Sem Escola',
        stats: { wins: l.wins, losses: l.losses, draws: l.draws },
      }));
    } catch (error) {
      console.error('❌ [PeaoRankingService] Erro ao buscar ranking de alunos:', error);
      return [];
    }
  }

  async getSchoolRanking() {
    try {
      const prisma = getPrisma();
      const rankings = await prisma.peaoRanking.findMany({
        where: { schoolId: { not: null }, points: { gt: 0 } },
        select: { schoolId: true, schoolName: true, points: true },
      });
      const totals = {};
      rankings.forEach(r => {
        if (!totals[r.schoolId]) totals[r.schoolId] = { id: r.schoolId, name: r.schoolName, points: 0 };
        totals[r.schoolId].points += r.points;
      });
      return Object.values(totals)
        .sort((a, b) => b.points - a.points)
        .map((s, index) => ({ rank: index + 1, ...s }));
    } catch (error) {
      console.error('❌ [PeaoRankingService] Erro ao buscar ranking de escolas:', error);
      return [];
    }
  }

  obfuscateName(fullName) {
    if (!fullName) return 'Anônimo';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }

  async getPreviewRanking() {
    try {
      const students = await this.getStudentRanking();
      const schools  = await this.getSchoolRanking();
      return {
        topPlayers: students.slice(0, 3).map(p => ({ ...p, name: this.obfuscateName(p.name) })),
        topSchools:  schools.slice(0, 3),
      };
    } catch {
      return { topPlayers: [], topSchools: [] };
    }
  }
}

module.exports = new PeaoRankingService();
