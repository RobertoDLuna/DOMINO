const { getPrisma } = require('../../shared/config/prismaClient');

class ChessReportService {
  /**
   * Busca as estatísticas e histórico de um jogador específico
   */
  async getPlayerStats(userId) {
    if (!userId) throw new Error('ID do usuário é obrigatório');

    try {
      const prisma = getPrisma();

      // 1. Buscar o ranking (estatísticas de vitórias/derrotas/pontos)
      const ranking = await prisma.chessRanking.findUnique({
        where: { userId }
      });

      // Se não existir ranking, retornar objeto zerado
      const stats = ranking || {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        userName: 'Jogador Desconhecido'
      };

      // 2. Buscar as últimas 10 partidas concluídas onde o usuário participou
      const recentGames = await prisma.chessGame.findMany({
        where: {
          OR: [
            { whiteId: userId },
            { blackId: userId }
          ],
          status: { in: ['FINISHED', 'ABANDONED'] }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        select: {
          id: true,
          mode: true,
          status: true,
          result: true,
          whiteName: true,
          blackName: true,
          whiteId: true,
          blackId: true,
          createdAt: true,
          finishedAt: true,
          moves: true
        }
      });

      // 3. Processar as partidas para um formato amigável para o front
      const processedGames = recentGames.map(game => {
        const isWhite = game.whiteId === userId;
        const opponentName = isWhite ? (game.blackName || 'Computador') : (game.whiteName || 'Computador');
        const color = isWhite ? 'Brancas' : 'Negras';
        const numMoves = game.moves ? game.moves.length : 0;
        
        let outcome = 'DRAW'; // WIN, LOSS, DRAW
        if (game.result === 'WHITE_WIN') {
          outcome = isWhite ? 'WIN' : 'LOSS';
        } else if (game.result === 'BLACK_WIN') {
          outcome = !isWhite ? 'WIN' : 'LOSS';
        } else if (game.status === 'ABANDONED') {
          outcome = 'DRAW'; // Consideraremos empate ou sem resultado por abandono para simplificar a visualização
        }

        // Calcula duração aproximada
        const durationMs = game.finishedAt ? (new Date(game.finishedAt).getTime() - new Date(game.createdAt).getTime()) : 0;
        const durationMins = Math.max(1, Math.round(durationMs / 60000));

        return {
          id: game.id,
          opponentName,
          color,
          outcome,
          numMoves,
          durationMins,
          date: game.createdAt
        };
      });

      return {
        stats,
        history: processedGames
      };

    } catch (error) {
      console.error('❌ [ChessReportService] Erro ao buscar stats do jogador:', error);
      throw new Error('Erro ao buscar estatísticas do jogador');
    }
  }
}

module.exports = new ChessReportService();
