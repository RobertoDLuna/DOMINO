const ScoringService = require("./ScoringService");

/**
 * GameService handles the core business logic for the Dominoes game.
 * Separation of concerns: Logic is here, Event handling is in the socket controller.
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
   */
  createGame(players) {
    const images = ["🐶", "🐱", "🐰", "🦊", "🐨", "🦁", "🐯"];
    const pieces = [];

    // Generate all combinations for a double-6 set (using emojis)
    for (let i = 0; i < images.length; i++) {
      for (let j = i; j < images.length; j++) {
        pieces.push({ id: `p-${i}-${j}`, ladoA: images[i], ladoB: images[j] });
      }
    }

    // Shuffle
    pieces.sort(() => Math.random() - 0.5);

    const playerHands = {};
    const playerScores = {};
    players.forEach((pId) => {
      playerHands[pId] = pieces.splice(0, 7);
      playerScores[pId] = 0;
    });

    return {
      board: [],
      hands: playerHands,
      scores: playerScores,
      pile: pieces,
      currentTurn: players[0],
      players: players,
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
    
    for (const pId of game.players) {
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
    let winner = game.players[0];
    let minPieces = game.hands[winner] ? game.hands[winner].length : 999;

    game.players.forEach(pId => {
      const handLen = game.hands[pId] ? game.hands[pId].length : 999;
      if (handLen < minPieces) {
        minPieces = handLen;
        winner = pId;
      }
    });

    return winner;
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
          finalPiece = { ...piece, ladoA: piece.ladoB, ladoB: piece.ladoA };
          canPlay = true;
        }
      } else if (side === 'right') {
        if (piece.ladoA === rightEnd) {
          canPlay = true;
        } else if (piece.ladoB === rightEnd) {
          finalPiece = { ...piece, ladoA: piece.ladoB, ladoB: piece.ladoA };
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
