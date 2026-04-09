const { getPrisma } = require('../config/prismaClient');

class RankingService {
  /**
   * Salva o resultado de um jogo finalizado no banco de dados
   * Adiciona o registro no histórico e atualiza os pontos totais do usuário.
   */
  async saveGameResult(winnerId, winType, points, roomId) {
    // Se não há winnerId válido ou a sala de jogo não enviou, não salva 
    // (Pode ocorrer em jogos de testes ou visitantes sem auth id)
    if (!winnerId || winnerId.length < 10) {
        console.log(`⚠️ Jogo salvo s/ ranking: Vencedor (${winnerId}) não tem ID de banco de dados válido.`);
        return;
    }

    try {
      const prisma = getPrisma();
      
      // Valida se o User existe
      const user = await prisma.user.findUnique({
          where: { id: winnerId }
      });

      if (!user) {
          console.log(`⚠️ Usuário ${winnerId} não encontrado no banco. Ranking ignorado.`);
          return;
      }

      // 1. Cria o registro de partida (Histórico)
      await prisma.gameMatch.create({
        data: {
          winnerId,
          winType,
          points,
          roomId
        }
      });

      // 2. Atualiza o cache de ranking do usuário
      await prisma.user.update({
        where: { id: winnerId },
        data: {
          rankingPoints: {
            increment: points
          }
        }
      });

      console.log(`🏆 [Ranking] Salvo: Usuário ${user.fullName} ganhou ${points} pts por ${winType}!`);
    } catch (error) {
      console.error('❌ [RankingService] Erro ao salvar resultado do ranking:', error);
    }
  }

  /**
   * Busca o top 100 usuários com base nos pontos
   */
  async getLeaderboard() {
      try {
          const prisma = getPrisma();
          const leaders = await prisma.user.findMany({
              where: {
                  rankingPoints: {
                      gt: 0 // Apenas quem pontuou
                  }
              },
              orderBy: {
                  rankingPoints: 'desc'
              },
              take: 100,
              select: {
                  id: true,
                  fullName: true,
                  rankingPoints: true,
                  school: {
                      select: { name: true }
                  }
              }
          });

          return leaders.map((u, index) => ({
              rank: index + 1,
              id: u.id,
              name: u.fullName,
              points: u.rankingPoints,
              school: u.school?.name || 'Sem Escola'
          }));
      } catch (error) {
          console.error('❌ [RankingService] Erro ao buscar leaderboard:', error);
          return [];
      }
  }
}

module.exports = new RankingService();
