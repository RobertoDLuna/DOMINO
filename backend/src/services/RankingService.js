const { getPrisma } = require('../config/prismaClient');

class RankingService {
  /**
   * Salva o resultado de um jogo finalizado no banco de dados
   * Adiciona o registro no histórico e atualiza os pontos totais do usuário.
   */
  async saveGameResult(winnerId, winType, points, roomId, themeId) {
    if (!winnerId || winnerId.length < 10) {
        console.log(`⚠️ Jogo s/ ranking: Vencedor (${winnerId}) não tem ID de banco de dados.`);
        return;
    }

    try {
      const prisma = getPrisma();
      
      const user = await prisma.user.findUnique({ where: { id: winnerId } });
      if (!user) return;

      // Validação de Tema
      // Muitas vezes o nome interno ou string dos defaults passará (ex: 'animais'), ignoramos e fica NULL (Tema Geral/Global).
      let validThemeId = null;
      if (themeId && themeId.length > 20) {
        try {
          const theme = await prisma.theme.findUnique({ where: { id: themeId } });
          if (theme) validThemeId = theme.id;
        } catch(e) {}
      }

      // 1. Cria o registro de partida (Histórico)
      await prisma.gameMatch.create({
        data: {
          winnerId,
          winType,
          points,
          roomId,
          themeId: validThemeId
        }
      });

      // 2. Atualiza o cache de ranking global do usuário
      await prisma.user.update({
        where: { id: winnerId },
        data: { rankingPoints: { increment: points } }
      });

      console.log(`🏆 [Ranking] Salvo: ${user.fullName} ganhou ${points} pts (${winType}) [Tema: ${validThemeId || 'Padrão'}]`);
    } catch (error) {
      console.error('❌ [RankingService] Erro ao salvar resultado do ranking:', error);
    }
  }

  /**
   * Busca os líderes. Se filters for vazio, usa o Cache rápido.
   * Se houver categories, usa agregados instantâneos de cada GameMatch.
   */
  async getLeaderboard(filters = {}) {
      try {
          const prisma = getPrisma();
          const { themeId, categoryId, subcategoryId } = filters;

          // Ranking Geral / Universal
          if (!themeId && !categoryId && !subcategoryId) {
              const leaders = await prisma.user.findMany({
                  where: { rankingPoints: { gt: 0 } },
                  orderBy: { rankingPoints: 'desc' },
                  take: 100,
                  select: { id: true, fullName: true, rankingPoints: true, school: { select: { name: true } } }
              });

              return leaders.map((u, index) => ({
                  rank: index + 1,
                  id: u.id,
                  name: u.fullName,
                  points: u.rankingPoints,
                  school: u.school?.name || 'Sem Escola'
              }));
          }

          // ---------- RANKING CUSTOMIZADO POR CATEGORIA/TEMA (Aggregations) -------------
          const whereClause = {};
          if (themeId) whereClause.themeId = themeId;
          else if (subcategoryId) whereClause.theme = { subcategoryId: parseInt(subcategoryId) };
          else if (categoryId) whereClause.theme = { categoryId: parseInt(categoryId) };

          // Previne agrupar itens sem winner
          whereClause.winnerId = { not: null };

          const aggregations = await prisma.gameMatch.groupBy({
             by: ['winnerId'],
             where: whereClause,
             _sum: { points: true },
             orderBy: { _sum: { points: 'desc' } },
             take: 100
          });

          // Filtra quem zerou
          const validAggregations = aggregations.filter(a => a._sum.points > 0);
          
          if (validAggregations.length === 0) return [];

          const userIds = validAggregations.map(a => a.winnerId);
          const users = await prisma.user.findMany({
              where: { id: { in: userIds } },
              include: { school: true }
          });

          const leaderMapping = validAggregations.map(agg => {
              const user = users.find(u => u.id === agg.winnerId);
              if (!user) return null;
              return {
                  id: user.id,
                  name: user.fullName,
                  points: agg._sum.points,
                  school: user.school?.name || 'Sem Escola'
              };
          }).filter(Boolean);

          return leaderMapping.map((l, index) => ({ ...l, rank: index + 1 }));

      } catch (error) {
          console.error('❌ [RankingService] Erro ao buscar leaderboard:', error);
          return [];
      }
  }

  /**
   * Busca os líderes em criação: quem teve mais partidas concluídas usando seus temas
   */
  async getCreatorsLeaderboard() {
      try {
          const prisma = getPrisma();
          
          // Busco todos os temas que têm dono, somando o count de partidas em cada t
          const themeStats = await prisma.theme.findMany({
              where: { ownerId: { not: null } },
              select: {
                  ownerId: true,
                  _count: { select: { gameMatches: true } }
              }
          });

          // Agrupando in-memory
          const creatorCounts = {};
          themeStats.forEach(t => {
              if (t._count.gameMatches > 0) {
                  if (!creatorCounts[t.ownerId]) creatorCounts[t.ownerId] = 0;
                  creatorCounts[t.ownerId] += t._count.gameMatches;
              }
          });

          const validCreators = Object.entries(creatorCounts)
              .sort((a, b) => b[1] - a[1]);

          if (validCreators.length === 0) return [];

          const userIds = validCreators.map(arr => arr[0]).slice(0, 50); // limit 50
          const users = await prisma.user.findMany({
              where: { id: { in: userIds } },
              include: { school: true }
          });

          const leaderMapping = validCreators.slice(0, 50).map(([id, count]) => {
              const user = users.find(u => u.id === id);
              if (!user) return null;
              return {
                  id: user.id,
                  name: user.fullName,
                  points: count,
                  school: user.school?.name || 'Sem Escola'
              };
          }).filter(Boolean);

          return leaderMapping.map((l, index) => ({ ...l, rank: index + 1 }));

      } catch (e) {
          console.error("❌ Erro em getCreatorsLeaderboard:", e);
          return [];
      }
  }
}

module.exports = new RankingService();
