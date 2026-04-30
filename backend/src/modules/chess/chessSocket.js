/**
 * chessSocket.js
 * Socket.IO handler for the Chess module.
 * Follows the same pattern as gameSocket.js.
 *
 * Events (client → server):
 *   create-chess-room  → creates a room, returns roomCode
 *   join-chess-room    → joins a room as second player
 *   chess-move         → sends a move (UCI format), validated server-side
 *   chess-resign       → player resigns
 *   chess-offer-draw   → offers a draw
 *   chess-accept-draw  → accepts the draw offer
 *   chess-decline-draw → declines the draw offer
 *
 * Events (server → client):
 *   chess-room-created  → { roomCode, color: 'white' }
 *   chess-room-joined   → { fen, moves, whiteId, blackId, whiteName, blackName }
 *   chess-opponent-joined → opponent connected, game starts
 *   chess-move-made     → { fen, move, san, moves }
 *   chess-game-over     → { result, reason }
 *   chess-draw-offered  → draw was offered by opponent
 *   chess-draw-declined → opponent declined
 *   chess-error         → { message }
 */

const { Chess } = require('chess.js');

// In-memory store: roomCode → RoomState
const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * @param {import('socket.io').Server} io
 */
module.exports = function chessSocket(io) {
  const chessNsp = io.of('/chess');

  chessNsp.on('connection', (socket) => {
    console.log(`[Chess] Player connected: ${socket.id}`);

    // ── CREATE ROOM ──────────────────────────────────────────────────────────
    socket.on('create-chess-room', ({ userId, userName, mode = 'PVP', aiLevel = 5 }) => {
      const roomCode = generateRoomCode();
      const chess = new Chess();

      const room = {
        roomCode,
        mode,
        aiLevel: mode === 'PVC' ? aiLevel : null,
        chess,
        white: { socketId: socket.id, userId, userName },
        black: null,
        drawOfferedBy: null,
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);

      socket.emit('chess-room-created', {
        roomCode,
        color: 'white',
        fen: chess.fen(),
      });

      console.log(`[Chess] Room created: ${roomCode} by ${userName} (mode: ${mode})`);
    });

    // ── JOIN ROOM ─────────────────────────────────────────────────────────────
    socket.on('join-chess-room', ({ roomCode, userId, userName }) => {
      const room = rooms.get(roomCode);

      if (!room) {
        socket.emit('chess-error', { message: 'Sala não encontrada.' });
        return;
      }
      if (room.black) {
        socket.emit('chess-error', { message: 'Sala já está cheia.' });
        return;
      }
      if (room.white.userId === userId) {
        socket.emit('chess-error', { message: 'Você já está nesta sala.' });
        return;
      }

      room.black = { socketId: socket.id, userId, userName };
      socket.join(roomCode);

      const payload = {
        fen: room.chess.fen(),
        moves: room.chess.history({ verbose: true }),
        whiteId: room.white.userId,
        whiteName: room.white.userName,
        blackId: room.black.userId,
        blackName: room.black.userName,
        roomCode,
      };

      // Notify the joiner
      socket.emit('chess-room-joined', { ...payload, color: 'black' });

      // Notify the creator that opponent joined
      chessNsp.to(room.white.socketId).emit('chess-opponent-joined', {
        ...payload,
        opponentName: userName,
      });

      console.log(`[Chess] ${userName} joined room ${roomCode}`);
    });

    // ── START GAME ────────────────────────────────────────────────────────────
    socket.on('chess-start-game', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      
      // Only the room creator (white) can start
      if (room.white.socketId === socket.id) {
        room.status = 'PLAYING';
        chessNsp.to(roomCode).emit('chess-game-started');
        console.log(`[Chess] Room ${roomCode} started by host.`);
      }
    });

    // ── MAKE MOVE ─────────────────────────────────────────────────────────────
    socket.on('chess-move', ({ roomCode, move }) => {
      const room = rooms.get(roomCode);
      if (!room) {
        socket.emit('chess-error', { message: 'Sala não encontrada.' });
        return;
      }

      // Determine which color this socket is
      const isWhite = room.white?.socketId === socket.id;
      const isBlack = room.black?.socketId === socket.id;
      if (!isWhite && !isBlack) {
        socket.emit('chess-error', { message: 'Você não está nesta sala.' });
        return;
      }

      // Validate turn
      const turn = room.chess.turn(); // 'w' or 'b'
      if ((turn === 'w' && !isWhite) || (turn === 'b' && !isBlack)) {
        socket.emit('chess-error', { message: 'Não é sua vez.' });
        return;
      }

      // Attempt move
      let result;
      try {
        result = room.chess.move(move);
      } catch {
        socket.emit('chess-error', { message: 'Movimento inválido.' });
        return;
      }
      if (!result) {
        socket.emit('chess-error', { message: 'Movimento inválido.' });
        return;
      }

      // Reset draw offer on any move
      room.drawOfferedBy = null;

      const payload = {
        fen: room.chess.fen(),
        move: result,
        san: result.san,
        moves: room.chess.history({ verbose: true }),
      };

      // Broadcast to all in room
      chessNsp.to(roomCode).emit('chess-move-made', payload);

      // Check for game over
      if (room.chess.isGameOver()) {
        let result = 'DRAW';
        let reason = 'draw';

        if (room.chess.isCheckmate()) {
          result = turn === 'w' ? 'WHITE_WIN' : 'BLACK_WIN';
          reason = 'checkmate';
        } else if (room.chess.isStalemate()) {
          reason = 'stalemate';
        } else if (room.chess.isInsufficientMaterial()) {
          reason = 'insufficient_material';
        } else if (room.chess.isThreefoldRepetition()) {
          reason = 'threefold_repetition';
        } else if (room.chess.isDraw()) {
          reason = 'fifty_move_rule';
        }

        chessNsp.to(roomCode).emit('chess-game-over', { result, reason });
        _persistGameResult(room, result, reason);
        rooms.delete(roomCode);
      }
    });

    // ── RESIGN ────────────────────────────────────────────────────────────────
    socket.on('chess-resign', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const isWhite = room.white?.socketId === socket.id;
      const result = isWhite ? 'BLACK_WIN' : 'WHITE_WIN';

      chessNsp.to(roomCode).emit('chess-game-over', { result, reason: 'resignation' });
      _persistGameResult(room, result, 'resignation');
      rooms.delete(roomCode);
    });

    // ── OFFER DRAW ────────────────────────────────────────────────────────────
    socket.on('chess-offer-draw', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const isWhite = room.white?.socketId === socket.id;
      room.drawOfferedBy = isWhite ? 'white' : 'black';

      // Notify the opponent
      const opponentSocketId = isWhite ? room.black?.socketId : room.white?.socketId;
      if (opponentSocketId) {
        chessNsp.to(opponentSocketId).emit('chess-draw-offered');
      }
    });

    // ── ACCEPT DRAW ───────────────────────────────────────────────────────────
    socket.on('chess-accept-draw', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room || !room.drawOfferedBy) return;

      chessNsp.to(roomCode).emit('chess-game-over', { result: 'DRAW', reason: 'agreement' });
      _persistGameResult(room, 'DRAW', 'agreement');
      rooms.delete(roomCode);
    });

    // ── DECLINE DRAW ──────────────────────────────────────────────────────────
    socket.on('chess-decline-draw', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      room.drawOfferedBy = null;
      const offererSocketId =
        room.drawOfferedBy === 'white' ? room.white?.socketId : room.black?.socketId;
      if (offererSocketId) {
        chessNsp.to(offererSocketId).emit('chess-draw-declined');
      }
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      for (const [roomCode, room] of rooms.entries()) {
        const wasWhite = room.white?.socketId === socket.id;
        const wasBlack = room.black?.socketId === socket.id;

        if (wasWhite || wasBlack) {
          const result = wasWhite ? 'BLACK_WIN' : 'WHITE_WIN';
          chessNsp.to(roomCode).emit('chess-game-over', {
            result,
            reason: 'disconnection',
          });
          _persistGameResult(room, result, 'disconnection');
          rooms.delete(roomCode);
          break;
        }
      }
    });
  });
};

const chessRankingService = require('./ChessRankingService');

/**
 * Persists game result to the database (PVP only, for ranking).
 * Runs async without blocking the socket.
 */
async function _persistGameResult(room, result, reason) {
  if (room.mode !== 'PVP') return; // PVC does not count for ranking
  if (!room.white?.userId || !room.black?.userId) return; // guests don't count

  try {
    const { getPrisma } = require('../../shared/config/prismaClient');
    const prisma = getPrisma();

    // Save game record
    await prisma.chessGame.upsert({
      where: { roomCode: room.roomCode },
      update: {
        status: 'FINISHED',
        result,
        fen: room.chess.fen(),
        moves: room.chess.history(),
        finishedAt: new Date(),
      },
      create: {
        roomCode: room.roomCode,
        mode: 'PVP',
        status: 'FINISHED',
        result,
        fen: room.chess.fen(),
        moves: room.chess.history(),
        whiteId: room.white.userId,
        whiteName: room.white.userName,
        blackId: room.black.userId,
        blackName: room.black.userName,
        finishedAt: new Date(),
      },
    });

    // Update ranking using the centralized service
    await chessRankingService.updateRanking(room.white.userId, room.black.userId, result);

    console.log(`[Chess] Game ${room.roomCode} persisted. Result: ${result}`);
  } catch (err) {
    console.error('[Chess] Error persisting game result:', err);
  }
}
