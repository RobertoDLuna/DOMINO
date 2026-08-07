/**
 * chessSocket.js
 * Manipulador Socket.IO para o módulo de Xadrez.
 * Segue o mesmo padrão de gameSocket.js.
 *
 * Eventos (cliente → servidor):
 *   create-chess-room  → cria uma sala, retorna roomCode
 *   join-chess-room    → entra em uma sala como segundo jogador
 *   chess-move         → envia movimento (formato UCI), validado no servidor
 *   chess-resign       → jogador desiste da partida
 *   chess-offer-draw   → propõe empate
 *   chess-accept-draw  → aceita proposta de empate
 *   chess-decline-draw → recusa proposta de empate
 *
 * Eventos (servidor → cliente):
 *   chess-room-created    → { roomCode, color: 'white' }
 *   chess-room-joined     → { fen, moves, whiteId, blackId, whiteName, blackName }
 *   chess-opponent-joined → oponente conectado, partida pronta
 *   chess-move-made       → { fen, move, san, moves }
 *   chess-game-over       → { result, reason }
 *   chess-draw-offered    → proposta de empate feita pelo oponente
 *   chess-draw-declined   → oponente recusou o empate
 *   chess-error           → { message }
 */

const { Chess } = require('chess.js');

// Armazenamento em memória: roomCode → Estado da Sala
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
    console.log(`[Chess] Jogador conectado: ${socket.id}`);

    // ── CRIAR SALA ───────────────────────────────────────────────────────────
    socket.on('create-chess-room', ({ userId, userName, mode = 'PVP', aiLevel = 5, timeLimit = 600 }) => {
      const roomCode = generateRoomCode();
      const chess = new Chess();

      const room = {
        roomCode,
        mode,
        aiLevel: mode === 'PVC' ? aiLevel : null,
        chess,
        player1: { socketId: socket.id, userId, userName },
        player2: null,
        white: null,
        black: null,
        timeLimit: mode === 'PVP' ? timeLimit : null,
        whiteTimeRemaining: mode === 'PVP' && timeLimit ? timeLimit * 1000 : null,
        blackTimeRemaining: mode === 'PVP' && timeLimit ? timeLimit * 1000 : null,
        lastMoveTimestamp: null,
        drawOfferedBy: null,
        rematchRequests: new Set(),
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);

      socket.emit('chess-room-created', {
        roomCode,
        fen: chess.fen(),
        timeLimit: room.timeLimit,
      });

      console.log(`[Chess] Sala criada: ${roomCode} por ${userName} (modo: ${mode})`);
    });

    // ── ENTRAR NA SALA ───────────────────────────────────────────────────────
    socket.on('join-chess-room', ({ roomCode, userId, userName }) => {
      let room = rooms.get(roomCode);

      if (!room) {
        if (roomCode && roomCode.startsWith('T-')) {
          // Auto-cria a sala do torneio quando o primeiro jogador tentar entrar
          const chess = new Chess();
          room = {
            roomCode,
            mode: 'PVP',
            aiLevel: null,
            chess,
            player1: { socketId: socket.id, userId, userName },
            player2: null,
            white: null,
            black: null,
            timeLimit: 600, // 10 min
            whiteTimeRemaining: 600 * 1000,
            blackTimeRemaining: 600 * 1000,
            lastMoveTimestamp: null,
            drawOfferedBy: null,
            rematchRequests: new Set(),
          };
          rooms.set(roomCode, room);
          socket.join(roomCode);
          socket.emit('chess-room-created', {
            roomCode,
            fen: chess.fen(),
            timeLimit: room.timeLimit,
          });
          console.log(`[Chess] Sala de torneio criada automaticamente: ${roomCode} por ${userName}`);
          return;
        }

        socket.emit('chess-error', { message: 'Sala não encontrada.' });
        return;
      }
      if (room.player1.userId === userId) {
        room.player1.socketId = socket.id;
        socket.join(roomCode);
        if (room.white?.userId === userId) room.white.socketId = socket.id;
        if (room.black?.userId === userId) room.black.socketId = socket.id;
        
        socket.emit('chess-room-joined', {
          roomCode,
          whiteName: room.white?.userName || room.player1.userName,
          blackName: room.black?.userName || room.player2?.userName,
          fen: room.chess.fen(),
          color: room.white?.userId === userId ? 'white' : 'black',
          timeLimit: room.timeLimit,
        });

        if (room.white && room.black) {
          socket.emit('chess-game-ready', {
            white: room.white,
            black: room.black,
            fen: room.chess.fen(),
            turn: room.chess.turn(),
          });
        }
        console.log(`[Chess] Jogador 1 (${userId}) reconectou à sala ${roomCode}`);
        return;
      }
      
      if (room.player2) {
        if (room.player2.userId === userId) {
          room.player2.socketId = socket.id;
          socket.join(roomCode);
          if (room.white?.userId === userId) room.white.socketId = socket.id;
          if (room.black?.userId === userId) room.black.socketId = socket.id;
          
          socket.emit('chess-room-joined', {
            roomCode,
            whiteName: room.white?.userName || room.player1.userName,
            blackName: room.black?.userName || room.player2.userName,
            fen: room.chess.fen(),
            color: room.white?.userId === userId ? 'white' : 'black',
            timeLimit: room.timeLimit,
          });

          if (room.white && room.black) {
            socket.emit('chess-game-ready', {
              white: room.white,
              black: room.black,
              fen: room.chess.fen(),
              turn: room.chess.turn(),
            });
          }
          console.log(`[Chess] Jogador 2 (${userId}) reconectou à sala ${roomCode}`);
          return;
        } else {
          socket.emit('chess-error', { message: 'Sala já está cheia.' });
          return;
        }
      }

      room.player2 = { socketId: socket.id, userId, userName };
      socket.join(roomCode);

      // 1. Notifica o criador da sala
      socket.to(room.player1.socketId).emit('chess-opponent-joined', {
        blackId: userId,
        blackName: userName,
      });

      // 2. Notifica o participante que entrou
      socket.emit('chess-room-joined', {
        roomCode,
        whiteName: room.player1.userName,
        blackName: userName,
        fen: room.chess.fen(),
        color: 'black',
        timeLimit: room.timeLimit,
      });

      // 3. Sorteio automático (com delay para garantir montagem no cliente)
      setTimeout(() => {
        if (!rooms.has(roomCode)) return;
        const winner = Math.random() > 0.5 ? room.player1 : room.player2;
        chessNsp.to(roomCode).emit('chess-draw-result', {
          userId: winner.userId,
          userName: winner.userName,
        });
        console.log(`[Chess] Resultado do sorteio para ${roomCode}: ${winner.userName}`);
      }, 1000);
    });

    // ── ESCOLHA DE COR ────────────────────────────────────────────────────────
    socket.on('chess-pick-color', ({ roomCode, color }) => {
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

      chessNsp.to(roomCode).emit('chess-game-ready', {
        white: room.white,
        black: room.black,
        fen: room.chess.fen(),
        turn: 'w',
      });
      room.lastMoveTimestamp = Date.now();
      if (room.timeLimit) {
        room.whiteTimeRemaining = room.timeLimit * 1000;
        room.blackTimeRemaining = room.timeLimit * 1000;
      }
    });

    // ── REVANCHE ──────────────────────────────────────────────────────────────
    socket.on('chess-request-rematch', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      room.rematchRequests.add(socket.id);
      socket.to(roomCode).emit('chess-rematch-requested');

      if (room.rematchRequests.size === 2) {
        // Inverte as cores na revanche
        const oldWhite = room.white;
        const oldBlack = room.black;
        room.white = oldBlack;
        room.black = oldWhite;

        room.chess = new Chess();
        room.rematchRequests.clear();
        room.drawOfferedBy = null;

        chessNsp.to(roomCode).emit('chess-game-ready', {
          white: room.white,
          black: room.black,
          fen: room.chess.fen(),
          turn: 'w',
        });
        room.lastMoveTimestamp = Date.now();
        if (room.timeLimit) {
          room.whiteTimeRemaining = room.timeLimit * 1000;
          room.blackTimeRemaining = room.timeLimit * 1000;
        }
      }
    });

    // ── INICIAR JOGO ──────────────────────────────────────────────────────────
    socket.on('chess-start-game', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      
      // Apenas o criador da sala (peças brancas) pode iniciar
      if (room.white.socketId === socket.id) {
        room.status = 'PLAYING';
        chessNsp.to(roomCode).emit('chess-game-started');
        console.log(`[Chess] Partida na sala ${roomCode} iniciada pelo anfitrião.`);
      }
    });

    // ── EXECUTAR MOVIMENTO ───────────────────────────────────────────────────
    socket.on('chess-move', ({ roomCode, move }) => {
      const room = rooms.get(roomCode);
      if (!room) {
        socket.emit('chess-error', { message: 'Sala não encontrada.' });
        return;
      }

      // Determina a cor correspondente a este socket
      const isWhite = room.white?.socketId === socket.id;
      const isBlack = room.black?.socketId === socket.id;
      if (!isWhite && !isBlack) {
        socket.emit('chess-error', { message: 'Você não está nesta sala.' });
        return;
      }

      const isFirstMove = room.chess.history().length === 0;

      // Verifica timeout antes de processar o lance (avaliação preguiçosa de timestamp)
      const turn = room.chess.turn(); // 'w' ou 'b'
      if (room.timeLimit && room.lastMoveTimestamp && !isFirstMove) {
        const elapsed = Date.now() - room.lastMoveTimestamp;
        if (turn === 'w') {
          if (room.whiteTimeRemaining - elapsed <= 0) {
             room.whiteTimeRemaining = 0;
             const result = 'BLACK_WIN';
             chessNsp.to(roomCode).emit('chess-game-over', { result, reason: 'timeout' });
             _persistGameResult(room, result, 'timeout');
             return;
          }
        } else {
          if (room.blackTimeRemaining - elapsed <= 0) {
             room.blackTimeRemaining = 0;
             const result = 'WHITE_WIN';
             chessNsp.to(roomCode).emit('chess-game-over', { result, reason: 'timeout' });
             _persistGameResult(room, result, 'timeout');
             return;
          }
        }
      }

      // Valida o turno
      if ((turn === 'w' && !isWhite) || (turn === 'b' && !isBlack)) {
        socket.emit('chess-error', { message: 'Não é sua vez.' });
        return;
      }

      // Tenta realizar o movimento
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

      // Reseta oferta de empate em qualquer movimento realizado
      room.drawOfferedBy = null;

      // Atualiza marcadores de tempo
      if (room.timeLimit) {
         if (isFirstMove) {
            // Se for o primeiro movimento (das brancas), apenas inicia o marcador temporal para o próximo turno
            room.lastMoveTimestamp = Date.now();
         } else if (room.lastMoveTimestamp) {
            const elapsed = Date.now() - room.lastMoveTimestamp;
            if (turn === 'w') {
               room.whiteTimeRemaining -= elapsed;
            } else {
               room.blackTimeRemaining -= elapsed;
            }
            room.lastMoveTimestamp = Date.now();
         }
      }

      const payload = {
        fen: room.chess.fen(),
        move: result,
        san: result.san,
        moves: room.chess.history({ verbose: true }),
      };

      // Transmite para todos na sala
      chessNsp.to(roomCode).emit('chess-move-made', payload);

      // Verifica fim de jogo
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
      }
    });

    // ── REIVINDICAR TIMEOUT ───────────────────────────────────────────────────
    socket.on('chess-claim-timeout', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room || !room.timeLimit || !room.lastMoveTimestamp || room.chess.isGameOver()) return;
      if (room.chess.history().length === 0) return; // O tempo não corre antes do primeiro lance

      const elapsed = Date.now() - room.lastMoveTimestamp;
      const turn = room.chess.turn();

      if (turn === 'w') {
        if (room.whiteTimeRemaining - elapsed <= 0) {
          const result = 'BLACK_WIN';
          chessNsp.to(roomCode).emit('chess-game-over', { result, reason: 'timeout' });
          _persistGameResult(room, result, 'timeout');
        }
      } else {
        if (room.blackTimeRemaining - elapsed <= 0) {
          const result = 'WHITE_WIN';
          chessNsp.to(roomCode).emit('chess-game-over', { result, reason: 'timeout' });
          _persistGameResult(room, result, 'timeout');
        }
      }
    });

    // ── DESISTIR ──────────────────────────────────────────────────────────────
    socket.on('chess-resign', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const isWhite = room.white?.socketId === socket.id;
      const result = isWhite ? 'BLACK_WIN' : 'WHITE_WIN';

      chessNsp.to(roomCode).emit('chess-game-over', { result, reason: 'resignation' });
      _persistGameResult(room, result, 'resignation');
    });

    // ── PROPOR EMPATE ─────────────────────────────────────────────────────────
    socket.on('chess-offer-draw', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const isWhite = room.white?.socketId === socket.id;
      room.drawOfferedBy = isWhite ? 'white' : 'black';

      // Notifica o adversário
      const opponentSocketId = isWhite ? room.black?.socketId : room.white?.socketId;
      if (opponentSocketId) {
        chessNsp.to(opponentSocketId).emit('chess-draw-offered');
      }
    });

    // ── ACEITAR EMPATE ────────────────────────────────────────────────────────
    socket.on('chess-accept-draw', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room || !room.drawOfferedBy) return;

      chessNsp.to(roomCode).emit('chess-game-over', { result: 'DRAW', reason: 'agreement' });
      _persistGameResult(room, 'DRAW', 'agreement');
    });

    // ── RECUSAR EMPATE ────────────────────────────────────────────────────────
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

    // ── DESCONEXÃO ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const disconnectedSocketId = socket.id;
      for (const [roomCode, room] of rooms.entries()) {
        const wasP1 = room.player1?.socketId === disconnectedSocketId;
        const wasP2 = room.player2?.socketId === disconnectedSocketId;

        if (wasP1 || wasP2) {
          const player = wasP1 ? room.player1 : room.player2;
          console.log(`[Chess] ${player.userId} desconectou da sala ${roomCode}. Aguardando 1 min para reconexão...`);

          if (room.status === 'FINISHED') break;

          setTimeout(() => {
             const updatedRoom = rooms.get(roomCode);
             if (!updatedRoom || updatedRoom.status === 'FINISHED') return;
             
             // Verifica se o jogador ainda está com o socket antigo (não reconectou)
             const currentPlayer = wasP1 ? updatedRoom.player1 : updatedRoom.player2;
             if (currentPlayer && currentPlayer.socketId === disconnectedSocketId) {
                console.log(`[Chess] Tempo de reconexão esgotado para ${player.userId} na sala ${roomCode}. Partida concedida.`);
                const result = (wasP1 && updatedRoom.white?.socketId === disconnectedSocketId) || (!wasP1 && updatedRoom.black?.socketId === disconnectedSocketId) ? 'BLACK_WIN' : 'WHITE_WIN';
                
                updatedRoom.status = 'FINISHED';
                chessNsp.to(roomCode).emit('chess-game-over', {
                  result,
                  reason: 'disconnection',
                });
                _persistGameResult(updatedRoom, result, 'disconnection');
                rooms.delete(roomCode);
             }
          }, 60000);
          
          break;
        }
      }
    });
  });
};

const chessRankingService = require('./ChessRankingService');

/**
 * Persiste o resultado do jogo no banco de dados (Apenas PVP, para ranking).
 * Executa assincronamente sem travar o socket.
 */
async function _persistGameResult(room, result, reason) {
  if (room.mode !== 'PVP') return; // PVC não pontua no ranking
  if (!room.white?.userId || !room.black?.userId) return; // Convidados não pontuam

  try {
    const { getPrisma } = require('../../shared/config/prismaClient');
    const prisma = getPrisma();

    // Salva o registro da partida
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

    // Atualiza o ranking utilizando o serviço centralizado
    await chessRankingService.updateRanking(room.white.userId, room.black.userId, result);

    console.log(`[Chess] Jogo ${room.roomCode} persistido. Resultado: ${result}`);

    // Integração automática com o módulo de Torneios
    if (room.roomCode.startsWith('T-')) {
       try {
         const tournamentService = require('./../tournament/TournamentService');
         
         let winnerId = null;

         if (result === 'WHITE_WIN') {
           winnerId = room.white.userId;
         } else if (result === 'BLACK_WIN') {
           winnerId = room.black.userId;
         }

         await tournamentService.autoRegisterMatchByRoomCode(room.roomCode, {
           winnerId
         });
         console.log(`[Chess] Partida do torneio ${room.roomCode} avançada automaticamente.`);
       } catch (e) {
         console.error('[Chess] Erro ao avançar partida de torneio:', e);
       }
    }
  } catch (err) {
    console.error('[Chess] Erro ao persistir resultado do jogo:', err);
  }
}
