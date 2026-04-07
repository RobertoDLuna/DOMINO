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
    let minPoints = Infinity;
    let isTie = false;

    game.players.forEach((player) => {
      const pId = typeof player === 'string' ? player : player.id;
      const hand = game.hands[pId] || [];
      
      // Calculate total points in hand
      const totalPoints = hand.reduce((sum, piece) => {
        return sum + (piece.vA || 0) + (piece.vB || 0);
      }, 0);

      console.log(`📊 Jogador ${pId} tem ${totalPoints} pontos na mão (${hand.length} peças).`);

      if (totalPoints < minPoints) {
        minPoints = totalPoints;
        winnerId = pId;
        isTie = false;
      } else if (totalPoints === minPoints) {
        // Regra de desempate se os pontos forem iguais: quem tem menos peças vence?
        // Se ainda assim for igual, é empate.
        const currentWinnerHandLen = game.hands[winnerId]?.length || 0;
        if (hand.length < currentWinnerHandLen) {
            winnerId = pId;
            isTie = false;
        } else if (hand.length === currentWinnerHandLen) {
            isTie = true;
        }
      }
    });

    if (isTie) {
        console.log("🤝 Empate absoluto no trancamento (pontos e peças iguais).");
        return null;
    }
    
    console.log(`🏆 Vencedor do trancamento: ${winnerId} com ${minPoints} pontos.`);
    return winnerId;
  }
}

module.exports = ScoringService;
