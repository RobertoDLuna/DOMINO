/**
 * velhaSocket.js
 * Manipulador Socket.IO para o módulo de Xadrez da Velha (PVP).
 */

// Armazenamento em memória: roomCode → Estado da Sala
const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Lógica do Xadrez da Velha - Auxiliares
 */
function checkWin(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[b] && board[c] && board[a][0] === board[b][0] && board[a][0] === board[c][0]) {
      return { winner: board[a][0], line: lines[i] };
    }
  }
  return null;
}

function checkDraw(board, colorCode) {
  return false; 
}

module.exports = function velhaSocket(io) {
  const chessNsp = io.of('/chess');

  chessNsp.on('connection', (socket) => {

    // ── CRIAR SALA ───────────────────────────────────────────────────────────
    socket.on('create-velha-room', ({ userId, userName, mode = 'PVP' }) => {
      const roomCode = generateRoomCode();

      const room = {
        roomCode,
        mode,
        player1: { socketId: socket.id, userId, userName },
        player2: null,
        white: null,
        black: null,
        board: Array(9).fill(null),
        inventory: { W: { T: 1, C: 1, B: 1 }, B: { T: 1, C: 1, B: 1 } },
        turn: 'W',
        phase: 'DROP',
        boardHistory: [Array(9).fill(null).join(',')],
        rematchRequests: new Set(),
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);

      socket.emit('velha-room-created', { roomCode });
      console.log(`[Velha] Sala criada: ${roomCode} por ${userName}`);
    });

    // ── ENTRAR NA SALA ───────────────────────────────────────────────────────
    socket.on('join-velha-room', ({ roomCode, userId, userName }) => {
      const room = rooms.get(roomCode);

      if (!room) {
        socket.emit('velha-error', { message: 'Sala não encontrada.' });
        return;
      }
      if (room.player2) {
        socket.emit('velha-error', { message: 'Sala já está cheia.' });
        return;
      }
      if (room.player1.userId === userId) {
        socket.emit('velha-error', { message: 'Você já está nesta sala.' });
        return;
      }

      room.player2 = { socketId: socket.id, userId, userName };
      socket.join(roomCode);

      socket.to(room.player1.socketId).emit('velha-opponent-joined', {
        opponentId: userId,
        opponentName: userName,
      });

      socket.emit('velha-room-joined', {
        roomCode,
        whiteName: room.player1.userName,
        blackName: userName,
        board: room.board,
        turn: room.turn,
        phase: room.phase,
      });

      // SORTEIO AUTOMÁTICO
      setTimeout(() => {
        if (!rooms.has(roomCode)) return;
        const winner = Math.random() > 0.5 ? room.player1 : room.player2;
        chessNsp.to(roomCode).emit('velha-draw-result', {
          winnerId: winner.userId,
          winnerName: winner.userName,
        });
        console.log(`[Velha] Resultado do sorteio para ${roomCode}: ${winner.userName}`);
      }, 1000);
    });

    // ── ESCOLHA DE COR ────────────────────────────────────────────────────────
    socket.on('velha-pick-color', ({ roomCode, color }) => {
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

      chessNsp.to(roomCode).emit('velha-game-ready', {
        white: room.white,
        black: room.black,
        board: room.board,
        inventory: room.inventory,
        turn: room.turn,
        phase: room.phase,
      });
    });

    // ── EXECUTAR JOGADA (COLOCAÇÃO E MOVIMENTO) ───────────────────────────────
    socket.on('velha-drop-piece', ({ roomCode, idx, pieceType }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const colorCode = socket.id === room.white.socketId ? 'W' : 'B';
      
      // Atualiza o estado
      room.board[idx] = colorCode + pieceType;
      room.inventory[colorCode][pieceType] -= 1;

      let newPhase = room.phase;
      const invW = Object.values(room.inventory.W).reduce((a, b) => a + b, 0);
      const invB = Object.values(room.inventory.B).reduce((a, b) => a + b, 0);
      if (invW === 0 && invB === 0) newPhase = 'MOVE';

      room.phase = newPhase;
      room.turn = colorCode === 'W' ? 'B' : 'W';
      room.boardHistory.push(room.board.join(','));

      chessNsp.to(roomCode).emit('velha-piece-dropped', {
        board: room.board,
        inventory: room.inventory,
        turn: room.turn,
        phase: room.phase,
      });

      checkGameOver(room, roomCode);
    });

    socket.on('velha-move-piece', ({ roomCode, from, to }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const colorCode = socket.id === room.white.socketId ? 'W' : 'B';

      room.board[to] = room.board[from];
      room.board[from] = null;
      room.turn = colorCode === 'W' ? 'B' : 'W';
      room.boardHistory.push(room.board.join(','));

      chessNsp.to(roomCode).emit('velha-piece-moved', {
        board: room.board,
        turn: room.turn,
        phase: room.phase,
      });

      checkGameOver(room, roomCode);
    });

    function checkGameOver(room, roomCode) {
      const win = checkWin(room.board);
      if (win) {
        chessNsp.to(roomCode).emit('velha-game-over', { 
          result: win.winner === 'W' ? 'WHITE_WIN' : 'BLACK_WIN', 
          reason: 'checkmate' 
        });
        return;
      }
      // Verifica repetição tríplice
      const repetitions = room.boardHistory.filter(s => s === room.board.join(',')).length;
      if (repetitions >= 3) {
        chessNsp.to(roomCode).emit('velha-game-over', { result: 'DRAW', reason: 'repetition' });
      }
    }

    // ── REVANCHE ──────────────────────────────────────────────────────────────
    socket.on('velha-request-rematch', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      room.rematchRequests.add(socket.id);
      socket.to(roomCode).emit('velha-rematch-requested');

      if (room.rematchRequests.size === 2) {
        // Inverte cores
        const oldWhite = room.white;
        const oldBlack = room.black;
        room.white = oldBlack;
        room.black = oldWhite;

        // Reseta estado do jogo
        room.board = Array(9).fill(null);
        room.inventory = { W: { T: 1, C: 1, B: 1 }, B: { T: 1, C: 1, B: 1 } };
        room.turn = 'W';
        room.phase = 'DROP';
        room.boardHistory = [room.board.join(',')];
        room.rematchRequests.clear();

        chessNsp.to(roomCode).emit('velha-game-ready', {
          white: room.white,
          black: room.black,
          board: room.board,
          inventory: room.inventory,
          turn: room.turn,
          phase: room.phase,
        });
      }
    });

    // ── DESISTIR ──────────────────────────────────────────────────────────────
    socket.on('velha-resign', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const isWhite = room.white?.socketId === socket.id;
      const result = isWhite ? 'BLACK_WIN' : 'WHITE_WIN';
      chessNsp.to(roomCode).emit('velha-game-over', { result, reason: 'resignation' });
    });

    // ── DESCONEXÃO ────────────────────────────────────────────────────────────
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
          chessNsp.to(roomCode).emit('velha-game-over', {
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
