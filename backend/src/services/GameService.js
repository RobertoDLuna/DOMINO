const { getPrisma } = require("../config/prismaClient");
const ScoringService = require("./ScoringService");
const themes = require("../config/themes");

/**
 * GameService handles the core business logic for the Dominoes game.
 */
class GameService {
  /**
   * Generates a unique room ID.
   */
  generateRoomId() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  /**
   * Initializes a new game instance.
   * Now async to fetch potential custom themes from Postgres.
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

    // Generate all combinations for a double-6 set (using theme symbols)
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

    // Shuffle
    pieces.sort(() => Math.random() - 0.5);

    const playerHands = {};
    const playerScores = {};
    players.forEach((p) => {
      const pId = typeof p === 'string' ? p : p.id;
      playerHands[pId] = pieces.splice(0, 7);
      playerScores[pId] = 0;
    });

    const firstPlayerId = typeof players[0] === 'string' ? players[0] : players[0].id;

    return {
      board: [],
      hands: playerHands,
      scores: playerScores,
      pile: pieces,
      currentTurn: firstPlayerId,
      players: players,
      theme: theme, // Store theme for UI info
      status: 'playing'
    };
  }

  /**
   * Checks if no more moves are possible for any player.
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
   * Determines the winner when a deadlock occurs (player with fewer pieces).
   */
  getWinnerOnDeadlock(game) {
    return ScoringService.getTrancamentoWinner(game);
  }

  /**
   * Validates and processes a move.
   * Returns { canPlay: boolean, finalPiece: object, nextTurn: string, isOver: boolean }
   */
  processMove(game, playerId, pieceId, side) {
    const playerHand = game.hands[playerId];
    if (!playerHand) return { canPlay: false };

    const pieceIdx = playerHand.findIndex(p => p.id === pieceId);
    if (pieceIdx === -1) return { canPlay: false };

    const piece = playerHand[pieceIdx];
    let canPlay = false;
    let finalPiece = { ...piece };

    if (game.board.length === 0) {
      canPlay = true;
    } else {
      const leftEnd = game.board[0].ladoA;
      const rightEnd = game.board[game.board.length - 1].ladoB;

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
      // Remove from hand
      playerHand.splice(pieceIdx, 1);
      
      // Update board
      if (side === 'left' || game.board.length === 0) {
        game.board.unshift(finalPiece);
      } else {
        game.board.push(finalPiece);
      }

      const isOver = playerHand.length === 0;
      return { canPlay: true, finalPiece, isOver };
    }

    return { canPlay: false };
  }
}

module.exports = new GameService();
