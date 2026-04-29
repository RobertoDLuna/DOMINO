const { getPrisma } = require('../config/prismaClient');

class ChessRankingService {
  /**
   * Atualiza o ranking após uma partida de Xadrez
   */
  async updateRanking(whiteId, blackId, result) {
    if (!whiteId || !blackId) return;

    try {
      const prisma = getPrisma();

      // Buscar dados dos usuários para garantir que existem e pegar nomes/escolas
      const [whiteUser, blackUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: whiteId }, include: { school: true } }),
        prisma.user.findUnique({ where: { id: blackId }, include: { school: true } })
      ]);

      if (!whiteUser || !blackUser) return;

      // Determinar pontos e stats
      let whiteStats = { wins: 0, losses: 0, draws: 0, points: 0 };
      let blackStats = { wins: 0, losses: 0, draws: 0, points: 0 };

      if (result === 'WHITE_WIN') {
        whiteStats = { wins: 1, losses: 0, draws: 0, points: 3 };
        blackStats = { wins: 0, losses: 1, draws: 0, points: 0 };
      } else if (result === 'BLACK_WIN') {
        whiteStats = { wins: 0, losses: 1, draws: 0, points: 0 };
        blackStats = { wins: 1, losses: 0, draws: 0, points: 3 };
      } else if (result === 'DRAW') {
        whiteStats = { wins: 0, losses: 0, draws: 1, points: 1 };
        blackStats = { wins: 0, losses: 0, draws: 1, points: 1 };
      }

      // Atualizar ou Criar ranking para as Brancas
      await prisma.chessRanking.upsert({
        where: { userId: whiteId },
        update: {
          wins: { increment: whiteStats.wins },
          losses: { increment: whiteStats.losses },
          draws: { increment: whiteStats.draws },
          points: { increment: whiteStats.points },
          userName: whiteUser.fullName,
          schoolId: whiteUser.schoolId,
          schoolName: whiteUser.school?.name || null
        },
        create: {
          userId: whiteId,
          userName: whiteUser.fullName,
          schoolId: whiteUser.schoolId,
          schoolName: whiteUser.school?.name || null,
          wins: whiteStats.wins,
          losses: whiteStats.losses,
          draws: whiteStats.draws,
          points: whiteStats.points
        }
      });

      // Atualizar ou Criar ranking para as Negras
      await prisma.chessRanking.upsert({
        where: { userId: blackId },
        update: {
          wins: { increment: blackStats.wins },
          losses: { increment: blackStats.losses },
          draws: { increment: blackStats.draws },
          points: { increment: blackStats.points },
          userName: blackUser.fullName,
          schoolId: blackUser.schoolId,
          schoolName: blackUser.school?.name || null
        },
        create: {
          userId: blackId,
          userName: blackUser.fullName,
          schoolId: blackUser.schoolId,
          schoolName: blackUser.school?.name || null,
          wins: blackStats.wins,
          losses: blackStats.losses,
          draws: blackStats.draws,
          points: blackStats.points
        }
      });

      console.log(`🏆 [Chess Ranking] Atualizado para ${whiteUser.fullName} e ${blackUser.fullName}`);
    } catch (error) {
      console.error('❌ [ChessRankingService] Erro ao atualizar ranking:', error);
    }
  }

  /**
   * Retorna o ranking de alunos
   */
  async getStudentRanking() {
    try {
      const prisma = getPrisma();
      const leaders = await prisma.chessRanking.findMany({
        where: { points: { gt: 0 } },
        orderBy: { points: 'desc' },
        take: 100
      });

      return leaders.map((l, index) => ({
        rank: index + 1,
        id: l.userId,
        name: l.userName,
        points: l.points,
        school: l.schoolName || 'Sem Escola',
        stats: {
          wins: l.wins,
          losses: l.losses,
          draws: l.draws
        }
      }));
    } catch (error) {
      console.error('❌ [ChessRankingService] Erro ao buscar ranking de alunos:', error);
      return [];
    }
  }

  /**
   * Retorna o ranking de escolas agregando pontos dos alunos
   */
  async getSchoolRanking() {
    try {
      const prisma = getPrisma();
      
      // Agrupamos na mão para garantir precisão e incluir nomes das escolas
      const rankings = await prisma.chessRanking.findMany({
        where: { schoolId: { not: null }, points: { gt: 0 } },
        select: { schoolId: true, schoolName: true, points: true }
      });

      const schoolTotals = {};
      rankings.forEach(r => {
        if (!schoolTotals[r.schoolId]) {
          schoolTotals[r.schoolId] = { id: r.schoolId, name: r.schoolName, points: 0 };
        }
        schoolTotals[r.schoolId].points += r.points;
      });

      const sortedSchools = Object.values(schoolTotals)
        .sort((a, b) => b.points - a.points);

      return sortedSchools.map((s, index) => ({
        rank: index + 1,
        ...s
      }));
    } catch (error) {
      console.error('❌ [ChessRankingService] Erro ao buscar ranking de escolas:', error);
      return [];
    }
  }

  /**
   * Helper para Ofuscar nomes (LGPD)
   */
  obfuscateName(fullName) {
    if (!fullName) return 'Anônimo';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0];
    const lastName = parts[parts.length - 1];
    return `${parts[0]} ${lastName.charAt(0)}.`;
  }

  /**
   * Preview para tela de login
   */
  async getPreviewRanking() {
    try {
      const students = await this.getStudentRanking();
      const schools = await this.getSchoolRanking();

      return {
        topPlayers: students.slice(0, 3).map(p => ({ ...p, name: this.obfuscateName(p.name) })),
        topSchools: schools.slice(0, 3)
      };
    } catch (error) {
      return { topPlayers: [], topSchools: [] };
    }
  }
}

module.exports = new ChessRankingService();
