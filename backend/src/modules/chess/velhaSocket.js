const velhaRankingService = require('./VelhaRankingService');

const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWin(board) {
  for (let l of WIN_LINES) {
    if (board[l[0]] && board[l[0]][0] === board[l[1]]?.[0] && board[l[0]][0] === board[l[2]]?.[0]) {
      return { winner: board[l[0]][0], line: l };
    }
  }
  return null;
}

function isPathClear(board, r1, c1, r2, c2) {
  let stepR = r2 > r1 ? 1 : (r2 < r1 ? -1 : 0);
  let stepC = c2 > c1 ? 1 : (c2 < c1 ? -1 : 0);

  let currR = r1 + stepR;
  let currC = c1 + stepC;

  while (currR !== r2 || currC !== c2) {
    if (board[currR * 3 + currC]) return false;
    currR += stepR;
    currC += stepC;
  }
  return true;
}

function getValidMoves(board, idx) {
  let moves = [];
  let pData = board[idx];
  if (!pData) return [];

  let type = pData[1];
  let r = Math.floor(idx/3), c = idx%3;

  for (let i=0; i<9; i++) {
    if (board[i]) continue;

    let tr = Math.floor(i/3), tc = i%3;
    let dr = Math.abs(r-tr), dc = Math.abs(c-tc);

    if (type === 'T') {
      if (r === tr || c === tc) {
        if (isPathClear(board, r, c, tr, tc)) moves.push(i);
      }
    } else if (type === 'B') {
      if (dr === dc) {
        if (isPathClear(board, r, c, tr, tc)) moves.push(i);
      }
    } else if (type === 'C') {
      if ((dr===2 && dc===1) || (dr===1 && dc===2)) moves.push(i);
    }
  }
  return moves;
}

function checkDraw(board, turnColor) {
  for (let i=0; i<9; i++) {
    if (board[i] && board[i][0] === turnColor) {
      if (getValidMoves(board, i).length > 0) return false;
    }
  }
  return true;
}

module.exports = function velhaSocket(io) {
  const velhaNsp = io.of('/velha');

  velhaNsp.on('connection', (socket) => {
    console.log(`[Velha] Player connected: ${socket.id}`);

    // ── CREATE ROOM ──────────────────────────────────────────────────────────
    socket.on('create-velha-room', ({ userId, userName, mode = 'PVP', aiLevel = 3 }) => {
      const roomCode = generateRoomCode();
      const room = {
        roomCode,
        mode,
        aiLevel: mode === 'PVC' ? aiLevel : null,
        board: Array(9).fill(null),
        inventory: { W: { T: 1, C: 1, B: 1 }, B: { T: 1, C: 1, B: 1 } },
        turn: 'W',
        phase: 'DROP',
        moves: [],
        white: { socketId: socket.id, userId, userName },
        black: null,
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);

      socket.emit('velha-room-created', {
        roomCode,
        color: 'white',
      });

      console.log(`[Velha] Room created: ${roomCode} by ${userName} (mode: ${mode})`);
    });

    // ── JOIN ROOM ─────────────────────────────────────────────────────────────
    socket.on('join-velha-room', ({ roomCode, userId, userName }) => {
      const room = rooms.get(roomCode);

      if (!room) {
        return socket.emit('velha-error', { message: 'Sala não encontrada.' });
      }
      if (room.black) {
        return socket.emit('velha-error', { message: 'Sala já está cheia.' });
      }
      if (room.white.userId === userId) {
        return socket.emit('velha-error', { message: 'Você já está nesta sala.' });
      }

      room.black = { socketId: socket.id, userId, userName };
      socket.join(roomCode);

      const payload = {
        roomCode,
        whiteId: room.white.userId,
        whiteName: room.white.userName,
        blackId: room.black.userId,
        blackName: room.black.userName,
        board: room.board,
        turn: room.turn,
        phase: room.phase,
      };

      socket.emit('velha-room-joined', { ...payload, color: 'black' });

      velhaNsp.to(room.white.socketId).emit('velha-opponent-joined', {
        opponentName: userName,
        blackId: userId,
      });

      console.log(`[Velha] ${userName} joined room ${roomCode}`);
    });

    // ── DROP PIECE ───────────────────────────────────────────────────────────
    socket.on('velha-drop-piece', ({ roomCode, idx, pieceType }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const isWhite = room.white?.socketId === socket.id;
      const isBlack = room.black?.socketId === socket.id;
      const myColor = isWhite ? 'W' : (isBlack ? 'B' : null);

      if (!myColor || room.turn !== myColor || room.phase !== 'DROP') return;
      if (room.board[idx] || room.inventory[myColor][pieceType] <= 0) return;

      // Executa o Drop
      room.board[idx] = myColor + pieceType;
      room.inventory[myColor][pieceType]--;
      room.moves.push(`Drop ${myColor}${pieceType} at ${idx}`);

      // Verifica se a fase DROP acabou
      const invW = Object.values(room.inventory.W).reduce((a, b) => a + b, 0);
      const invB = Object.values(room.inventory.B).reduce((a, b) => a + b, 0);
      if (invW === 0 && invB === 0) {
        room.phase = 'MOVE';
      }

      room.turn = room.turn === 'W' ? 'B' : 'W';

      velhaNsp.to(roomCode).emit('velha-piece-dropped', {
        board: room.board,
        turn: room.turn,
        phase: room.phase,
        inventory: room.inventory,
        lastMove: { idx, piece: myColor + pieceType }
      });

      checkGameOver(room, roomCode);
    });

    // ── MOVE PIECE ───────────────────────────────────────────────────────────
    socket.on('velha-move-piece', ({ roomCode, from, to }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const isWhite = room.white?.socketId === socket.id;
      const isBlack = room.black?.socketId === socket.id;
      const myColor = isWhite ? 'W' : (isBlack ? 'B' : null);

      if (!myColor || room.turn !== myColor || room.phase !== 'MOVE') return;
      if (!room.board[from] || room.board[from][0] !== myColor || room.board[to]) return;

      const validMoves = getValidMoves(room.board, from);
      if (!validMoves.includes(to)) return;

      // Executa o movimento
      room.board[to] = room.board[from];
      room.board[from] = null;
      room.moves.push(`Move ${room.board[to]} ${from}->${to}`);

      room.turn = room.turn === 'W' ? 'B' : 'W';

      velhaNsp.to(roomCode).emit('velha-piece-moved', {
        board: room.board,
        turn: room.turn,
        lastMove: { from, to }
      });

      checkGameOver(room, roomCode);
    });

    // ── RESIGN ────────────────────────────────────────────────────────────────
    socket.on('velha-resign', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const isWhite = room.white?.socketId === socket.id;
      const result = isWhite ? 'BLACK_WIN' : 'WHITE_WIN';

      velhaNsp.to(roomCode).emit('velha-game-over', { result, reason: 'resignation' });
      _persistVelhaResult(room, result, 'resignation');
      rooms.delete(roomCode);
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      for (const [roomCode, room] of rooms.entries()) {
        const wasWhite = room.white?.socketId === socket.id;
        const wasBlack = room.black?.socketId === socket.id;

        if (wasWhite || wasBlack) {
          const result = wasWhite ? 'BLACK_WIN' : 'WHITE_WIN';
          velhaNsp.to(roomCode).emit('velha-game-over', {
            result,
            reason: 'disconnection',
          });
          _persistVelhaResult(room, result, 'disconnection');
          rooms.delete(roomCode);
          break;
        }
      }
    });
  });

  function checkGameOver(room, roomCode) {
    const win = checkWin(room.board);
    if (win) {
      const result = win.winner === 'W' ? 'WHITE_WIN' : 'BLACK_WIN';
      velhaNsp.to(roomCode).emit('velha-game-over', { result, reason: 'checkmate', winLine: win.line });
      _persistVelhaResult(room, result, 'checkmate');
      rooms.delete(roomCode);
      return;
    }

    if (room.phase === 'MOVE' && checkDraw(room.board, room.turn)) {
      velhaNsp.to(roomCode).emit('velha-game-over', { result: 'DRAW', reason: 'stalemate' });
      _persistVelhaResult(room, 'DRAW', 'stalemate');
      rooms.delete(roomCode);
    }
  }

  async function _persistVelhaResult(room, result, reason) {
    if (room.mode !== 'PVP') return; // PVC não conta pro ranking
    if (!room.white?.userId || !room.black?.userId) return; // convidados não contam

    try {
      const { getPrisma } = require('../../shared/config/prismaClient');
      const prisma = getPrisma();

      await prisma.velhaGame.upsert({
        where: { roomCode: room.roomCode },
        update: {
          status: 'FINISHED',
          result,
          boardState: room.board.map(c => c || ''),
          moves: room.moves,
          finishedAt: new Date(),
        },
        create: {
          roomCode: room.roomCode,
          mode: 'PVP',
          status: 'FINISHED',
          result,
          boardState: room.board.map(c => c || ''),
          moves: room.moves,
          whiteId: room.white.userId,
          whiteName: room.white.userName,
          blackId: room.black.userId,
          blackName: room.black.userName,
          finishedAt: new Date(),
        },
      });

      await velhaRankingService.updateRanking(room.white.userId, room.black.userId, result);
      console.log(`[Velha] Game ${room.roomCode} persisted. Result: ${result}`);
    } catch (err) {
      console.error('[Velha] Error persisting game result:', err);
    }
  }
};
