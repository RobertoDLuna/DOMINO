const { getPrisma } = require('../config/prismaClient');

class RankingService {
  /**
   * Salva o resultado de um jogo finalizado no banco de dados
   * Adiciona o registro no histórico e atualiza os pontos totais do usuário.
   */
  async saveGameResult(winnerId, winType, points, roomId, themeId) {
    if (!winnerId || winnerId.length < 10 || winnerId.startsWith('guest-')) {
        console.log(`⚠️ Jogo s/ ranking: Vencedor (${winnerId}) é um convidado ou tem ID inválido.`);
        return;
    }

    try {
      const prisma = getPrisma();
      
      const user = await prisma.user.findUnique({ where: { id: winnerId } });
      if (!user) return;

      // Validação de Tema
      let validThemeId = null;
      if (themeId) {
        try {
          // Verifica se o tema existe no banco (Customizado ou Padrão Sincronizado)
          const theme = await prisma.theme.findUnique({ where: { id: themeId } });
          if (theme) validThemeId = theme.id;
        } catch(e) {
          console.warn(`[RankingService] Tema ${themeId} não encontrado no banco. Salvando apenas ranking global.`);
        }
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

  /**
   * Avalia quais escolas acumulam mais pontos com seus alunos
   */
  async getSchoolsLeaderboard() {
      try {
          const prisma = getPrisma();
          const schools = await prisma.school.findMany({
              select: { id: true, name: true, users: { select: { rankingPoints: true } } }
          });
          
          const mapped = schools.map(s => {
              const totalPts = s.users.reduce((acc, user) => acc + (user.rankingPoints || 0), 0);
              return { id: s.id, name: s.name, points: totalPts };
          }).filter(s => s.points > 0).sort((a, b) => b.points - a.points);
          
          return mapped.map((s, index) => ({ ...s, rank: index + 1 }));
      } catch (e) {
          console.error("❌ Erro em getSchoolsLeaderboard:", e);
          return [];
      }
  }

  /**
   * Avalia quais níveis letivos tem mais engajamento (Mais partidas vencidas/pontos)
   */
  async getCategoriesLeaderboard() {
      try {
          const prisma = getPrisma();
          
          // Agrega partidas que tem vencedores, agrupando por Tema -> para achar Categoria.
          // O mais simples pra evitar join pesado: buscar Categorias e incluir Sub > Themes > GameMatches
          const categories = await prisma.category.findMany({
              include: {
                  subs: {
                      include: {
                          themes: {
                              include: { gameMatches: true }
                          }
                      }
                  }
              }
          });

          const mapped = categories.map(cat => {
              let matchCount = 0;
              cat.subs.forEach(sub => {
                  sub.themes.forEach(theme => {
                      matchCount += theme.gameMatches.length;
                  });
              });
              return { id: cat.id, name: cat.name, points: matchCount }; // points aqui atuará como "PARTIDAS"
          }).filter(c => c.points > 0).sort((a, b) => b.points - a.points);
          
          return mapped.map((c, index) => ({ ...c, rank: index + 1 }));
      } catch (e) {
          console.error("❌ Erro em getCategoriesLeaderboard:", e);
          return [];
      }
  }

  /**
   * Helper para Ofuscar nomes e proteger a identidade ao listar logs públicos (LGPD)
   * Exemplo: Roberto D. Luna -> Roberto L.
   */
  obfuscateName(fullName) {
      if (!fullName) return 'Anônimo';
      const parts = fullName.trim().split(' ');
      if (parts.length === 1) return parts[0];
      const lastName = parts[parts.length - 1];
      return `${parts[0]} ${lastName.charAt(0)}.`;
  }

  /**
   * Puxa compactamente a nata dos rankings para a vitrine deslogada (Tela de Login)
   */
  async getPreviewLeaderboards() {
      try {
          const rawGeneral = await this.getLeaderboard();
          const topPlayers = rawGeneral.slice(0, 3).map(p => ({
             ...p,
             name: this.obfuscateName(p.name)
          }));

          const rawCreators = await this.getCreatorsLeaderboard();
          const topCreators = rawCreators.slice(0, 3).map(c => ({
             ...c,
             name: this.obfuscateName(c.name)
          }));

          const topSchools = (await this.getSchoolsLeaderboard()).slice(0,3);
          const topCategories = (await this.getCategoriesLeaderboard()).slice(0,3);

          return { topPlayers, topCreators, topSchools, topCategories };
      } catch (e) {
          console.error("❌ Erro no preview de Leaderboards:", e);
          return { topPlayers: [], topCreators: [], topSchools: [], topCategories: [] };
      }
  }
}

module.exports = new RankingService();
