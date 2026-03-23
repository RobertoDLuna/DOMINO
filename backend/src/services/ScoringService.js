/**
 * Serviço de Pontuação para o Jogo de Dominó
 */
class ScoringService {
  /**
   * Calcula a pontuação de vitória baseada na última peça jogada.
   * Regra: Se a última peça for uma "Carroça" (dupla), ganha +6 pontos.
   * Se for uma peça normal, ganha +3 pontos.
   */
  static calculateWinScore(lastPiece) {
    if (lastPiece.ladoA === lastPiece.ladoB) {
      console.log(`✨ Vitória com Carroça (${lastPiece.ladoA}|${lastPiece.ladoB}): +6 pontos`);
      return 6;
    }
    console.log(`🏆 Vitória normal: +3 pontos`);
    return 3;
  }

  /**
   * Retorna a pontuação para vitória por Trancamento (impasse).
   * Regra: +1 ponto.
   */
  static calculateDeadlockScore() {
    console.log("🔒 Vitória por Trancamento: +1 ponto");
    return 1;
  }

  /**
   * Identifica o vencedor por Trancamento (quem tem menos peças).
   */
  static getTrancamentoWinner(game) {
    let winnerId = null;
    let minPieces = Infinity;
    let isTie = false;

    game.players.forEach((pId) => {
      const handLen = game.hands[pId] ? game.hands[pId].length : 0;
      if (handLen < minPieces) {
        minPieces = handLen;
        winnerId = pId;
        isTie = false;
      } else if (handLen === minPieces) {
        isTie = true;
      }
    });

    if (isTie) return null;
    return winnerId;
  }
}

module.exports = ScoringService;
