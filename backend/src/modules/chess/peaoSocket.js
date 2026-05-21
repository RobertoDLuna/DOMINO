/**
 * peaoSocket.js
 * Socket.IO handler for the Batalha de Peões module (PVP).
 */

const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function checkWinLocal(board) {
  // White wins se chegar na linha 8 (índices 0 a 7)
  for (let i = 0; i <= 7; i++) {
    if (board[i] === 'w') return 'WHITE_WIN';
  }
  // Black wins se chegar na linha 1 (índices 56 a 63)
  for (let i = 56; i <= 63; i++) {
    if (board[i] === 'b') return 'BLACK_WIN';
  }
  return null;
}

function createInitialBoard() {
  const b = Array(64).fill(null);
  for (let i = 8; i < 16; i++) b[i] = 'b';
  for (let i = 48; i < 56; i++) b[i] = 'w';
  return b;
}

module.exports = function peaoSocket(io) {
  const chessNsp = io.of('/chess');

  chessNsp.on('connection', (socket) => {

    // ── CREATE ROOM ──────────────────────────────────────────────────────────
    socket.on('create-peao-room', ({ userId, userName, mode = 'PVP' }) => {
      const roomCode = generateRoomCode();

      const room = {
        roomCode,
        mode,
        player1: { socketId: socket.id, userId, userName },
        player2: null,
        white: null,
        black: null,
        board: createInitialBoard(),
        turn: 'w',
        rematchRequests: new Set(),
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);

      socket.emit('peao-room-created', { roomCode });
      console.log(`[Peao] Room created: ${roomCode} by ${userName}`);
    });

    // ── JOIN ROOM ─────────────────────────────────────────────────────────────
    socket.on('join-peao-room', ({ roomCode, userId, userName }) => {
      const room = rooms.get(roomCode);

      if (!room) {
        socket.emit('peao-error', { message: 'Sala não encontrada.' });
        return;
      }
      if (room.player2) {
        socket.emit('peao-error', { message: 'Sala já está cheia.' });
        return;
      }
      if (room.player1.userId === userId) {
        socket.emit('peao-error', { message: 'Você já está nesta sala.' });
        return;
      }

      room.player2 = { socketId: socket.id, userId, userName };
      socket.join(roomCode);

      socket.to(room.player1.socketId).emit('peao-opponent-joined', {
        opponentId: userId,
        opponentName: userName,
      });

      socket.emit('peao-room-joined', {
        roomCode,
        whiteName: room.player1.userName,
        blackName: userName,
        board: room.board,
        turn: room.turn,
      });

      // SORTEIO AUTOMÁTICO
      setTimeout(() => {
        if (!rooms.has(roomCode)) return;
        const winner = Math.random() > 0.5 ? room.player1 : room.player2;
        chessNsp.to(roomCode).emit('peao-draw-result', {
          userId: winner.userId,
          userName: winner.userName,
        });
        console.log(`[Peao] Draw result for ${roomCode}: ${winner.userName}`);
      }, 1000);
    });

    // ── COLOR PICKING ─────────────────────────────────────────────────────────
    socket.on('peao-pick-color', ({ roomCode, color }) => {
      const room = rooms.get(roomCode);
      if (!room || room.white || room.black) return;

      const p1 = room.player1;
      const p2 = room.player2;

      if (color === 'white') {
        room.white = socket.id === p1.socketId ? p1 : p2;
        room.black = socket.id === p1.socketId ? p2 : p1;
      } else {
        room.black = socket.id === p1.socketId ? p1 : p2;
        room.white = socket.id === p1.socketId ? p2 : p1;
      }

      chessNsp.to(roomCode).emit('peao-game-ready', {
        white: room.white,
        black: room.black,
        board: room.board,
        turn: room.turn,
        whiteName: room.white.userName,
        blackName: room.black.userName,
      });
    });

    // ── MAKE MOVE ─────────────────────────────────────────────────────────────
    socket.on('peao-move', ({ roomCode, from, to }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      room.board[to] = room.board[from];
      room.board[from] = null;
      room.turn = room.turn === 'w' ? 'b' : 'w';

      chessNsp.to(roomCode).emit('peao-piece-moved', {
        board: room.board,
        turn: room.turn,
        lastMove: { from, to }
      });

      const win = checkWinLocal(room.board);
      if (win) {
        chessNsp.to(roomCode).emit('peao-game-over', { result: win, reason: 'breakthrough' });
      }
    });

    // ── REMATCH ───────────────────────────────────────────────────────────────
    socket.on('peao-request-rematch', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      room.rematchRequests.add(socket.id);
      socket.to(roomCode).emit('peao-rematch-requested');

      if (room.rematchRequests.size === 2) {
        // Inverte cores
        const oldWhite = room.white;
        const oldBlack = room.black;
        room.white = oldBlack;
        room.black = oldWhite;

        // Reseta estado do jogo
        room.board = createInitialBoard();
        room.turn = 'w';
        room.rematchRequests.clear();

        chessNsp.to(roomCode).emit('peao-game-ready', {
          white: room.white,
          black: room.black,
          board: room.board,
          turn: room.turn,
          whiteName: room.white.userName,
          blackName: room.black.userName,
        });
      }
    });

    // ── RESIGN ────────────────────────────────────────────────────────────────
    socket.on('peao-resign', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const isWhite = room.white?.socketId === socket.id;
      const result = isWhite ? 'BLACK_WIN' : 'WHITE_WIN';
      chessNsp.to(roomCode).emit('peao-game-over', { result, reason: 'resignation' });
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      for (const [roomCode, room] of rooms.entries()) {
        const wasP1 = room.player1?.socketId === socket.id;
        const wasP2 = room.player2?.socketId === socket.id;

        if (wasP1 || wasP2) {
          if (!room.white) {
             rooms.delete(roomCode);
             break;
          }
          const result = (wasP1 && room.white?.socketId === socket.id) || (!wasP1 && room.black?.socketId === socket.id) ? 'BLACK_WIN' : 'WHITE_WIN';
          chessNsp.to(roomCode).emit('peao-game-over', {
            result,
            reason: 'disconnection',
          });
          rooms.delete(roomCode);
          break;
        }
      }
    });
  });
};
