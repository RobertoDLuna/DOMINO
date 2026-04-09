/**
 * Serviço de Pontuação para o Jogo de Dominó
 */
class ScoringService {
  /**
   * Calcula a pontuação e tipo de vitória baseada na última peça jogada e se foi Lailoa.
   */
  static calculateWinScore(lastPiece, isLailoa = false) {
    const isCarroca = lastPiece.ladoA === lastPiece.ladoB;

    if (isLailoa && isCarroca) {
      console.log(`🔥 Vitória com LAILOA DE CARROÇA (${lastPiece.ladoA}|${lastPiece.ladoB}): +7 pontos`);
      return { winType: 'LAILOA_CARROCA', points: 7 };
    }
    
    if (isLailoa && !isCarroca) {
      console.log(`💥 Vitória com LAILOA (${lastPiece.ladoA}|${lastPiece.ladoB}): +6 pontos`);
      return { winType: 'LAILOA', points: 6 };
    }
    
    if (!isLailoa && isCarroca) {
      console.log(`✨ Vitória com Carroça (${lastPiece.ladoA}|${lastPiece.ladoB}): +5 pontos`);
      return { winType: 'CARROCA', points: 5 };
    }
    
    console.log(`🏆 Vitória normal: +3 pontos`);
    return { winType: 'NORMAL', points: 3 };
  }

  /**
   * Identifica o vencedor por Trancamento (quem tem menos peças) e o cenário.
   */
  static getTrancamentoWinner(game) {
    let winnerId = null;
    let minPoints = Infinity;
    let isTie = false;
    let tiedPlayers = [];

    game.players.forEach((player) => {
      const pId = typeof player === 'string' ? player : player.id;
      const hand = game.hands[pId] || [];
      
      const totalPoints = hand.reduce((sum, piece) => sum + (piece.vA || 0) + (piece.vB || 0), 0);
      console.log(`📊 Jogador ${pId} tem ${totalPoints} pontos na mão (${hand.length} peças).`);

      if (totalPoints < minPoints) {
        minPoints = totalPoints;
        winnerId = pId;
        isTie = false;
        tiedPlayers = [pId];
      } else if (totalPoints === minPoints) {
        const currentWinnerHandLen = game.hands[winnerId]?.length || 0;
        if (hand.length < currentWinnerHandLen) {
            winnerId = pId;
            isTie = false;
            tiedPlayers = [pId];
        } else if (hand.length === currentWinnerHandLen) {
            isTie = true;
            tiedPlayers.push(pId);
        }
      }
    });

    if (isTie) {
        console.log(`🤝 Empate no trancamento entre: ${tiedPlayers.join(', ')}.`);
        // Para empate, vamos avisar quem sao os empatados, 
        // e o sistema dá 1 ponto (TRANCOU_EMPATE).
        return { winnerId: null, isTie: true, tiedPlayers, points: 1, winType: 'TRANCOU_EMPATE' };
    }
    
    console.log(`🏆 Vencedor do trancamento: ${winnerId} com ${minPoints} pontos. (+2 pts)`);
    return { winnerId, isTie: false, tiedPlayers: [winnerId], points: 2, winType: 'TRANCOU_MENOS' };
  }
}

module.exports = ScoringService;
