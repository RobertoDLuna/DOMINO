const { getPrisma } = require("../../shared/config/prismaClient");
const ScoringService = require("./ScoringService");
const themes = require("../../shared/config/themes");

/**
 * GameService gerencia as regras de negócio centrais para o jogo de Dominó.
 */
class GameService {
  /**
   * Gera um ID único para a sala.
   */
  generateRoomId() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  /**
   * Inicializa uma nova instância de jogo.
   * Assíncrono para permitir a busca de temas personalizados no Postgres.
   */
  async createGame(players, themeId = 'animais') {
    let theme = themes[themeId];

    if (!theme) {
      try {
        const prisma = getPrisma();
        const dbTheme = await prisma.theme.findUnique({ 
          where: { id: themeId },
          include: { category: true } 
        });
        if (dbTheme) {
          theme = {
            id: dbTheme.id,
            name: dbTheme.name,
            symbols: ["", ...dbTheme.symbols],
            color: dbTheme.color
          };
        }
      } catch (err) {
        console.warn("[GameService] DB indisponível, usando fallback de temas padrão.", err.message);
      }
    }

    if (!theme) theme = themes.animais;
    
    const images = theme.symbols;
    const pieces = [];

    // Gera todas as combinações para um conjunto de duplo-6 (usando os símbolos do tema)
    for (let i = 0; i < images.length; i++) {
      for (let j = i; j < images.length; j++) {
        pieces.push({ 
          id: `p-${i}-${j}`, 
          ladoA: images[i], 
          ladoB: images[j],
          vA: i,
          vB: j,
          theme: theme.name 
        });
      }
    }

    // Embaralha as peças
    pieces.sort(() => Math.random() - 0.5);

    const playerHands = {};
    const playerScores = {};
    players.forEach((p) => {
      const pId = typeof p === 'string' ? p : p.id;
      playerHands[pId] = pieces.splice(0, 7);
      playerScores[pId] = 0;
    });

    let startingPlayerId = typeof players[0] === 'string' ? players[0] : players[0].id;
    let startingPieceId = null;
    let maxDouble = -1;
    let maxPieceValueSum = -1;
    let fallbackPlayerId = startingPlayerId;
    let fallbackPieceId = null;

    Object.entries(playerHands).forEach(([pId, hand]) => {
      hand.forEach(piece => {
        // Encontra a maior carroça
        if (piece.vA === piece.vB && piece.vA > maxDouble) {
          maxDouble = piece.vA;
          startingPlayerId = pId;
          startingPieceId = piece.id;
        }
        
        // Em paralelo, calculamos fallback caso ninguém tire carroça na distribuição
        const pieceSum = piece.vA + piece.vB;
        if (maxDouble === -1 && pieceSum > maxPieceValueSum) {
          maxPieceValueSum = pieceSum;
          fallbackPlayerId = pId;
          fallbackPieceId = piece.id;
        }
      });
    });

    // Se nenhuma carroça foi distribuída (raro mas possível em menos de 4 jogadores), usa o fallback
    if (maxDouble === -1) {
      startingPlayerId = fallbackPlayerId;
      startingPieceId = fallbackPieceId;
    }

    return {
      board: [],
      hands: playerHands,
      scores: playerScores,
      pile: pieces,
      currentTurn: startingPlayerId,
      startingPieceId: startingPieceId, // Armazena qual peça DEVE ser a primeira jogada
      players: players,
      theme: theme, // Armazena dados do tema para a interface
      status: 'playing'
    };
  }

  /**
   * Verifica se não há mais jogadas possíveis para nenhum jogador (trancamento/fechamento).
   */
  checkDeadlock(game) {
    if (game.board.length === 0) return false;

    const leftEnd = game.board[0].ladoA;
    const rightEnd = game.board[game.board.length - 1].ladoB;
    
    for (const p of game.players) {
      const pId = typeof p === 'string' ? p : p.id;
      const hand = game.hands[pId];
      if (!hand) continue;
      
      const canPlay = hand.some(p => 
        p.ladoA === leftEnd || p.ladoB === leftEnd || 
        p.ladoA === rightEnd || p.ladoB === rightEnd
      );
      
      if (canPlay) return false;
    }

    return true;
  }

  /**
   * Determina o vencedor em caso de trancamento (jogador com menos pontos/peças).
   */
  getWinnerOnDeadlock(game) {
    return ScoringService.getTrancamentoWinner(game);
  }

  /**
   * Valida e processa uma jogada.
   * Retorna { canPlay: boolean, finalPiece: object, nextTurn: string, isOver: boolean }
   */
  processMove(game, playerId, pieceId, side) {
    const playerHand = game.hands[playerId];
    if (!playerHand) return { canPlay: false };

    const pieceIdx = playerHand.findIndex(p => p.id === pieceId);
    if (pieceIdx === -1) return { canPlay: false };

    const piece = playerHand[pieceIdx];
    let canPlay = false;
    let finalPiece = { ...piece };
    let isLailoa = false;

    if (game.board.length === 0) {
      // Primeira jogada do jogo: DEVE ser obrigatoriamente a peça que definiu o início
      if (game.startingPieceId && game.startingPieceId !== piece.id) {
        return { canPlay: false, error: 'Você deve começar o jogo com a maior carroça que possui!' };
      }
      canPlay = true;
    } else {
      const leftEnd = game.board[0].ladoA;
      const rightEnd = game.board[game.board.length - 1].ladoB;

      // Verifica se é lailoa (se a peça tem o leftEnd de um lado e o rightEnd do outro)
      // Nota: lailoa de verdade importa só se a pessoa bater, mas verificamos de antemão
      if ((piece.ladoA === leftEnd && piece.ladoB === rightEnd) || (piece.ladoB === leftEnd && piece.ladoA === rightEnd)) {
        isLailoa = true;
      }

      if (side === 'left') {
        if (piece.ladoB === leftEnd) {
          canPlay = true;
        } else if (piece.ladoA === leftEnd) {
          finalPiece = { ...piece, ladoA: piece.ladoB, ladoB: piece.ladoA, vA: piece.vB, vB: piece.vA };
          canPlay = true;
        }
      } else if (side === 'right') {
        if (piece.ladoA === rightEnd) {
          canPlay = true;
        } else if (piece.ladoB === rightEnd) {
          finalPiece = { ...piece, ladoA: piece.ladoB, ladoB: piece.ladoA, vA: piece.vB, vB: piece.vA };
          canPlay = true;
        }
      }
    }

    if (canPlay) {
      // Remove da mão
      playerHand.splice(pieceIdx, 1);
      
      // Atualiza o tabuleiro
      if (side === 'left' || game.board.length === 0) {
        game.board.unshift(finalPiece);
      } else {
        game.board.push(finalPiece);
      }

      const isOver = playerHand.length === 0;
      // Se não for a última peça (bater), não é Lailoa pontuável final
      if (!isOver) isLailoa = false;

      return { canPlay: true, finalPiece, isOver, isLailoa };
    }

    return { canPlay: false };
  }
}

module.exports = new GameService();
