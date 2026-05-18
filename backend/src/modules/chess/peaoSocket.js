const peaoRankingService = require('./PeaoRankingService');

const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── ENGINE: Estado inicial ────────────────────────────────────────────────────
function createInitialBoard() {
  // 64 posições: índice 0 = topo-esquerda (linha 0 col 0)
  // Peões pretos: linha 1 (índices 8–15)
  // Peões brancos: linha 6 (índices 48–55)
  const board = Array(64).fill(null);
  for (let i = 8; i < 16; i++) board[i] = 'b';
  for (let i = 48; i < 56; i++) board[i] = 'w';
  return board;
}

function createHasMoved() {
  return Array(64).fill(false);
}

// ── ENGINE: Movimentos válidos de um peão ────────────────────────────────────
function getValidMoves(board, idx, hasMoved) {
  const color = board[idx];
  if (!color) return [];

  const moves = [];
  const dir = color === 'w' ? -8 : +8;
  const col = idx % 8;

  // Avança 1
  const fwd1 = idx + dir;
  if (fwd1 >= 0 && fwd1 < 64 && board[fwd1] === null) {
    moves.push(fwd1);
    // Avança 2 (1º movimento)
    const fwd2 = idx + dir * 2;
    if (!hasMoved[idx] && fwd2 >= 0 && fwd2 < 64 && board[fwd2] === null) {
      moves.push(fwd2);
    }
  }

  // Captura diagonal esquerda
  const diagL = idx + dir - 1;
  if (col > 0 && diagL >= 0 && diagL < 64 && board[diagL] && board[diagL] !== color) {
    moves.push(diagL);
  }

  // Captura diagonal direita
  const diagR = idx + dir + 1;
  if (col < 7 && diagR >= 0 && diagR < 64 && board[diagR] && board[diagR] !== color) {
    moves.push(diagR);
  }

  return moves;
}

// ── ENGINE: Verificar vitória ─────────────────────────────────────────────────
function checkWin(board) {
  // Brancas chegaram na linha 0 (índices 0-7)
  for (let i = 0; i < 8; i++) {
    if (board[i] === 'w') return 'WHITE_WIN';
  }
  // Pretas chegaram na linha 7 (índices 56-63)
  for (let i = 56; i < 64; i++) {
    if (board[i] === 'b') return 'BLACK_WIN';
  }
  // Todos os peões de um lado foram capturados
  const hasW = board.some(c => c === 'w');
  const hasB = board.some(c => c === 'b');
  if (!hasW) return 'BLACK_WIN';
  if (!hasB) return 'WHITE_WIN';
  return null;
}

// ── ENGINE: Verificar stalemate (sem movimentos legais) ───────────────────────
function hasAnyMove(board, hasMoved, color) {
  for (let i = 0; i < 64; i++) {
    if (board[i] === color && getValidMoves(board, i, hasMoved).length > 0) return true;
  }
  return false;
}

// ── ENGINE: IA com Minimax ────────────────────────────────────────────────────
function evaluateBoard(board) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    if (board[i] === 'w') {
      const row = Math.floor(i / 8);
      score += 10 + (6 - row); // quanto mais avançado, melhor
    } else if (board[i] === 'b') {
      const row = Math.floor(i / 8);
      score -= 10 + (row - 1);
    }
  }
  return score;
}

function minimax(board, hasMoved, depth, isMaximizing, alpha, beta) {
  const win = checkWin(board);
  if (win === 'WHITE_WIN') return 1000 + depth;
  if (win === 'BLACK_WIN') return -1000 - depth;

  const color = isMaximizing ? 'w' : 'b';
  if (!hasAnyMove(board, hasMoved, color)) return isMaximizing ? -500 : 500;
  if (depth === 0) return evaluateBoard(board);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < 64; i++) {
      if (board[i] !== 'w') continue;
      for (const to of getValidMoves(board, i, hasMoved)) {
        const newBoard = [...board];
        const newMoved = [...hasMoved];
        newBoard[to] = 'w';
        newBoard[i] = null;
        newMoved[i] = true;
        const ev = minimax(newBoard, newMoved, depth - 1, false, alpha, beta);
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < 64; i++) {
      if (board[i] !== 'b') continue;
      for (const to of getValidMoves(board, i, hasMoved)) {
        const newBoard = [...board];
        const newMoved = [...hasMoved];
        newBoard[to] = 'b';
        newBoard[i] = null;
        newMoved[i] = true;
        const ev = minimax(newBoard, newMoved, depth - 1, true, alpha, beta);
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
    }
    return minEval;
  }
}

function getBestAIMove(board, hasMoved, depth = 3) {
  let bestScore = Infinity;
  let bestFrom = -1;
  let bestTo = -1;

  for (let i = 0; i < 64; i++) {
    if (board[i] !== 'b') continue;
    for (const to of getValidMoves(board, i, hasMoved)) {
      const newBoard = [...board];
      const newMoved = [...hasMoved];
      newBoard[to] = 'b';
      newBoard[i] = null;
      newMoved[i] = true;
      const score = minimax(newBoard, newMoved, depth - 1, true, -Infinity, Infinity);
      if (score < bestScore) {
        bestScore = score;
        bestFrom = i;
        bestTo = to;
      }
    }
  }
  return { from: bestFrom, to: bestTo };
}

// ── SOCKET ────────────────────────────────────────────────────────────────────
module.exports = function peaoSocket(io) {
  const peaoNsp = io.of('/peao');

  peaoNsp.on('connection', (socket) => {
    console.log(`[Peão] Player connected: ${socket.id}`);

    // ── CREATE ROOM ──────────────────────────────────────────────────────────
    socket.on('create-peao-room', ({ userId, userName, mode = 'PVP', aiLevel = 3 }) => {
      const roomCode = generateRoomCode();
      const room = {
        roomCode,
        mode,
        aiLevel: mode === 'PVC' ? aiLevel : null,
        board: createInitialBoard(),
        hasMoved: createHasMoved(),
        turn: 'w', // brancas começam
        phase: 'WAITING', // WAITING | DRAW | PLAYING | FINISHED
        moves: [],
        player1: { socketId: socket.id, userId, userName },
        player2: null,
        white: null,
        black: null,
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);

      if (mode === 'PVC') {
        // No PVC, player1 é sempre branco
        room.white = room.player1;
        room.player2 = { socketId: 'AI', userId: 'ai', userName: 'Computador' };
        room.black = room.player2;
        room.phase = 'PLAYING';

        socket.emit('peao-room-created', { roomCode, color: 'white' });
        socket.emit('peao-game-ready', {
          board: room.board,
          turn: room.turn,
          whiteName: userName,
          blackName: 'Computador',
        });
      } else {
        socket.emit('peao-room-created', { roomCode, color: 'white' });
      }

      console.log(`[Peão] Room created: ${roomCode} by ${userName} (mode: ${mode})`);
    });

    // ── JOIN ROOM ─────────────────────────────────────────────────────────────
    socket.on('join-peao-room', ({ roomCode, userId, userName }) => {
      const room = rooms.get(roomCode);
      if (!room) return socket.emit('peao-error', { message: 'Sala não encontrada.' });
      if (room.player2) return socket.emit('peao-error', { message: 'Sala já está cheia.' });
      if (room.player1.userId === userId) return socket.emit('peao-error', { message: 'Você já está nesta sala.' });

      room.player2 = { socketId: socket.id, userId, userName };
      socket.join(roomCode);

      // Notifica criador
      peaoNsp.to(room.player1.socketId).emit('peao-opponent-joined', {
        opponentName: userName,
        opponentId: userId,
      });

      // Notifica quem entrou
      socket.emit('peao-room-joined', { roomCode });

      // Sorteio automático
      setTimeout(() => {
        if (!rooms.has(roomCode)) return;
        const winnerId = Math.random() > 0.5 ? room.player1.userId : room.player2.userId;
        room.drawWinnerId = winnerId;
        room.phase = 'DRAW';

        peaoNsp.to(roomCode).emit('peao-draw-result', {
          winnerId,
          winnerName: winnerId === room.player1.userId ? room.player1.userName : room.player2.userName,
        });
      }, 800);
    });

    // ── PICK COLOR ───────────────────────────────────────────────────────────
    socket.on('peao-pick-color', ({ roomCode, color }) => {
      const room = rooms.get(roomCode);
      if (!room || room.phase !== 'DRAW') return;

      const currentPlayerId = socket.id === room.player1.socketId ? room.player1.userId : room.player2.userId;
      if (room.drawWinnerId != currentPlayerId) return;

      const p1IsWinner = room.player1.userId == room.drawWinnerId;
      const winner = p1IsWinner ? room.player1 : room.player2;
      const loser = p1IsWinner ? room.player2 : room.player1;

      if (color === 'white') { room.white = winner; room.black = loser; }
      else { room.white = loser; room.black = winner; }

      room.board = createInitialBoard();
      room.hasMoved = createHasMoved();
      room.turn = 'w';
      room.phase = 'PLAYING';
      room.moves = [];

      peaoNsp.to(roomCode).emit('peao-game-ready', {
        board: room.board,
        turn: room.turn,
        whiteName: room.white.userName,
        blackName: room.black.userName,
      });
    });

    // ── MOVE ─────────────────────────────────────────────────────────────────
    socket.on('peao-move', ({ roomCode, from, to }) => {
      const room = rooms.get(roomCode);
      if (!room || room.phase !== 'PLAYING') return;

      const isWhite = room.white?.socketId === socket.id;
      const isBlack = room.black?.socketId === socket.id;
      const myColor = isWhite ? 'w' : (isBlack ? 'b' : null);
      if (!myColor || room.turn !== myColor) return;

      if (room.board[from] !== myColor) return;
      const validMoves = getValidMoves(room.board, from, room.hasMoved);
      if (!validMoves.includes(to)) return;

      // Executa movimento
      room.board[to] = room.board[from];
      room.board[from] = null;
      room.hasMoved[to] = true;
      room.moves.push(`${from}->${to}`);
      room.turn = room.turn === 'w' ? 'b' : 'w';

      peaoNsp.to(roomCode).emit('peao-piece-moved', {
        board: room.board,
        turn: room.turn,
        lastMove: { from, to },
      });

      const win = checkWin(room.board);
      if (win) {
        room.phase = 'FINISHED';
        peaoNsp.to(roomCode).emit('peao-game-over', { result: win, reason: 'breakthrough' });
        _persistPeaoResult(room, win, 'breakthrough');
        return;
      }

      if (!hasAnyMove(room.board, room.hasMoved, room.turn)) {
        const result = room.turn === 'w' ? 'BLACK_WIN' : 'WHITE_WIN';
        room.phase = 'FINISHED';
        peaoNsp.to(roomCode).emit('peao-game-over', { result, reason: 'stalemate' });
        _persistPeaoResult(room, result, 'stalemate');
        return;
      }

      // IA joga se for PVC
      if (room.mode === 'PVC' && room.turn === 'b') {
        setTimeout(() => {
          if (room.phase !== 'PLAYING') return;
          const depth = Math.min(room.aiLevel || 3, 4);
          const aiMove = getBestAIMove(room.board, room.hasMoved, depth);
          if (aiMove.from === -1) return;

          room.board[aiMove.to] = 'b';
          room.board[aiMove.from] = null;
          room.hasMoved[aiMove.to] = true;
          room.moves.push(`${aiMove.from}->${aiMove.to}`);
          room.turn = 'w';

          peaoNsp.to(roomCode).emit('peao-piece-moved', {
            board: room.board,
            turn: room.turn,
            lastMove: aiMove,
          });

          const aiWin = checkWin(room.board);
          if (aiWin) {
            room.phase = 'FINISHED';
            peaoNsp.to(roomCode).emit('peao-game-over', { result: aiWin, reason: 'breakthrough' });
          } else if (!hasAnyMove(room.board, room.hasMoved, 'w')) {
            room.phase = 'FINISHED';
            peaoNsp.to(roomCode).emit('peao-game-over', { result: 'BLACK_WIN', reason: 'stalemate' });
          }
        }, 400);
      }
    });

    // ── RESIGN ────────────────────────────────────────────────────────────────
    socket.on('peao-resign', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      const isWhite = room.white?.socketId === socket.id;
      const result = isWhite ? 'BLACK_WIN' : 'WHITE_WIN';
      room.phase = 'FINISHED';
      peaoNsp.to(roomCode).emit('peao-game-over', { result, reason: 'resignation' });
      _persistPeaoResult(room, result, 'resignation');
    });

    // ── REMATCH ──────────────────────────────────────────────────────────────
    socket.on('peao-request-rematch', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      const isP1 = socket.id === room.player1.socketId;
      if (isP1) room.p1WantsRematch = true;
      else room.p2WantsRematch = true;
      socket.to(roomCode).emit('peao-rematch-requested', {
        fromName: isP1 ? room.player1.userName : room.player2.userName,
      });
      if (room.p1WantsRematch && room.p2WantsRematch) {
        const oldWhite = room.white;
        room.white = room.black;
        room.black = oldWhite;
        room.board = createInitialBoard();
        room.hasMoved = createHasMoved();
        room.turn = 'w';
        room.phase = 'PLAYING';
        room.moves = [];
        room.p1WantsRematch = false;
        room.p2WantsRematch = false;
        peaoNsp.to(roomCode).emit('peao-game-ready', {
          board: room.board,
          turn: room.turn,
          whiteName: room.white.userName,
          blackName: room.black.userName,
          isRematch: true,
        });
      }
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      for (const [roomCode, room] of rooms.entries()) {
        const wasP1 = room.player1?.socketId === socket.id;
        const wasP2 = room.player2?.socketId === socket.id;
        if ((wasP1 || wasP2) && room.phase === 'PLAYING') {
          const result = wasP1 ? 'BLACK_WIN' : 'WHITE_WIN';
          room.phase = 'FINISHED';
          peaoNsp.to(roomCode).emit('peao-game-over', { result, reason: 'disconnection' });
          _persistPeaoResult(room, result, 'disconnection');
          rooms.delete(roomCode);
          break;
        }
      }
    });
  });

  // ── PERSISTÊNCIA ────────────────────────────────────────────────────────────
  async function _persistPeaoResult(room, result, reason) {
    if (room.mode !== 'PVP') return;
    if (!room.white?.userId || !room.black?.userId) return;
    try {
      const { getPrisma } = require('../../shared/config/prismaClient');
      const prisma = getPrisma();
      await prisma.peaoGame.upsert({
        where: { roomCode: room.roomCode },
        update: { status: 'FINISHED', result, moves: room.moves, finishedAt: new Date() },
        create: {
          roomCode: room.roomCode,
          mode: 'PVP',
          status: 'FINISHED',
          result,
          moves: room.moves,
          whiteId: room.white.userId,
          whiteName: room.white.userName,
          blackId: room.black.userId,
          blackName: room.black.userName,
          finishedAt: new Date(),
        },
      });
      await peaoRankingService.updateRanking(room.white.userId, room.black.userId, result);
      console.log(`[Peão] Game ${room.roomCode} persisted. Result: ${result}`);
    } catch (err) {
      console.error('[Peão] Error persisting game result:', err);
    }
  }
};
