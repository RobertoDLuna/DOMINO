const RedisService = require("../services/RedisService");
const ScoringService = require("../services/ScoringService");
const GameService = require("../services/GameService");

/**
 * Socket.io Controller for Domino Game.
 */
module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Usuário conectado: ${socket.id}`);

    /**
     * Create Room Handler
     */
    socket.on("createRoom", async ({ playerId, playerName }) => {
      try {
        const roomId = GameService.generateRoomId();
        socket.join(roomId);
        const nameToUse = playerName || 'JOGADOR';
        await RedisService.setRoom(roomId, { 
          players: [{ id: socket.id, playerId, name: nameToUse }], 
          status: 'lobby',
          maxPlayers: 2
        });
        socket.emit("roomCreated", { roomId });
        io.to(roomId).emit("playerJoined", [{ id: socket.id, playerId, name: nameToUse }]);
        io.to(roomId).emit("roomUpdated", { maxPlayers: 2 });
        console.log(`🏠 Sala criada: ${roomId} por ${playerId}`);
      } catch (error) {
        console.error("❌ Erro ao criar sala:", error);
        socket.emit("error", { message: "Erro ao criar sala no servidor." });
      }
    });

    /**
     * Join Room Handler
     */
    socket.on("joinRoom", async ({ roomId, playerId, playerName }) => {
      try {
        const room = await RedisService.getRoom(roomId);
        if (room) {
          socket.join(roomId);
          
          const existingPlayerIdx = room.players.findIndex(p => p.playerId === playerId);
          
          if (existingPlayerIdx !== -1) {
            const oldSocketId = room.players[existingPlayerIdx].id;
            const newSocketId = socket.id;
            room.players[existingPlayerIdx].id = newSocketId;
            
            if (room.status === 'playing') {
              if (room.hands && room.hands[oldSocketId]) {
                room.hands[newSocketId] = room.hands[oldSocketId];
                delete room.hands[oldSocketId];
              }
              if (room.scores && room.scores[oldSocketId] !== undefined) {
                room.scores[newSocketId] = room.scores[oldSocketId];
                delete room.scores[oldSocketId];
              }
              if (room.currentTurn === oldSocketId) room.currentTurn = newSocketId;
            }
          } else if (room.status === 'lobby' && room.players.length < (room.maxPlayers || 2)) {
            const nameToUse = playerName || `JOGADOR ${room.players.length + 1}`;
            room.players.push({ id: socket.id, playerId, name: nameToUse });
          } else if (room.status !== 'lobby') {
             return socket.emit("error", { message: "O jogo já começou." });
          } else {
             return socket.emit("error", { message: "Sala cheia." });
          }

          await RedisService.setRoom(roomId, room);
          io.to(roomId).emit("playerJoined", room.players);
          io.to(roomId).emit("roomUpdated", { maxPlayers: room.maxPlayers || 2 });
          socket.emit("joinedSuccess", { roomId, status: room.status });

          if (room.status === 'playing') {
            // Sincronizar turno com todos da sala (importante para atualizar IDs de socket)
            io.to(roomId).emit("updateBoard", { 
              board: room.board, 
              currentTurn: room.currentTurn 
            });

            socket.emit("gameStarted", {
              hand: room.hands[socket.id],
              currentTurn: room.currentTurn,
              board: room.board,
              scores: room.scores,
              theme: room.theme
            });
          }
        } else {
          socket.emit("error", { message: "Sala não encontrada." });
        }
      } catch (error) {
        console.error("❌ Erro ao entrar na sala:", error);
      }
    });

    /**
     * Start Game Handler
     */
    socket.on("startGame", async ({ room: roomId, themeId }) => {
      try {
        const room = await RedisService.getRoom(roomId);
        if (!room) return;

        if (room.players.length >= (room.maxPlayers || 2)) {
          const gameData = GameService.createGame(room.players, themeId);
          const updatedRoom = { ...room, ...gameData, status: 'playing' };
          await RedisService.setRoom(roomId, updatedRoom);

          const socketIds = room.players.map(p => p.id);
          socketIds.forEach(pId => {
            io.to(pId).emit("gameStarted", {
              hand: updatedRoom.hands[pId],
              currentTurn: updatedRoom.currentTurn,
              board: updatedRoom.board,
              scores: updatedRoom.scores,
              theme: updatedRoom.theme
            });
          });
        }
      } catch (error) {
        console.error("❌ Erro ao iniciar jogo:", error);
      }
    });

    /**
     * Helper to handle turn transitions
     */
    const finalizeTurn = async (game, roomId) => {
      try {
        const playerIds = game.players.map(p => p.id);
        const currentIdx = playerIds.indexOf(game.currentTurn);
        game.currentTurn = playerIds[(currentIdx + 1) % playerIds.length];

        if (GameService.checkDeadlock(game)) {
          const winnerId = GameService.getWinnerOnDeadlock(game);
          const trancamentoWinnerId = ScoringService.getTrancamentoWinner(game);
          if (trancamentoWinnerId) game.scores[trancamentoWinnerId] += 1;
          
          playerIds.forEach(pId => {
            io.to(pId).emit("gameOver", { iWon: pId === winnerId, message: "Fim de jogo!" });
          });
          game.status = 'finished';
        } else {
          io.to(roomId).emit("updateBoard", { board: game.board, currentTurn: game.currentTurn });
        }
        await RedisService.setRoom(roomId, game);
      } catch (e) { console.error(e); }
    };

    /**
     * Move Execution Handler
     */
    socket.on("makeMove", async ({ pieceId, side, room: roomId }) => {
      try {
        const game = await RedisService.getRoom(roomId);
        if (!game || game.currentTurn !== socket.id) return;

        const moveResult = GameService.processMove(game, socket.id, pieceId, side);
        if (moveResult.canPlay) {
          socket.emit("updateHand", game.hands[socket.id]);
          if (moveResult.isOver) {
             game.scores[socket.id] += 3;
             io.to(roomId).emit("updateScores", game.scores);
             io.to(roomId).emit("updateBoard", { board: game.board, currentTurn: null });
             socket.to(roomId).emit("gameOver", { iWon: false, message: "Fim de jogo!" });
             socket.emit("gameOver", { iWon: true, message: "Parabéns! Você venceu!" });
             game.status = 'finished';
             await RedisService.setRoom(roomId, game);
             return;
          }
          await finalizeTurn(game, roomId);
        }
      } catch (error) { console.error(error); }
    });

    socket.on("passTurn", async ({ room: roomId }) => {
      try {
        const game = await RedisService.getRoom(roomId);
        if (!game || game.currentTurn !== socket.id) return;
        await finalizeTurn(game, roomId);
      } catch (e) { console.error(e); }
    });

    socket.on("leaveRoom", async ({ roomId }) => {
      try {
        const room = await RedisService.getRoom(roomId);
        if (room) {
          socket.leave(roomId);
          room.players = room.players.filter(p => p.id !== socket.id);
          if (room.players.length === 0) await RedisService.deleteRoom(roomId);
          else {
            io.to(roomId).emit("playerJoined", room.players);
            await RedisService.setRoom(roomId, room);
          }
        }
      } catch (e) { console.error(e); }
    });
    
    /**
     * Terminate Game Handler (Force End)
     */
    socket.on("forceEndGame", async ({ room: roomId }) => {
      try {
        const room = await RedisService.getRoom(roomId);
        if (room) {
          io.to(roomId).emit("gameForcedEnd", { message: "A partida foi encerrada por um dos jogadores." });
          await RedisService.deleteRoom(roomId);
          console.log(`💀 Partida ${roomId} encerrada forçadamente.`);
        }
      } catch (e) { console.error(e); }
    });

    /**
     * Update Max Players Handler
     */
    socket.on("updateMaxPlayers", async ({ room: roomId, maxPlayers }) => {
      try {
        const room = await RedisService.getRoom(roomId);
        if (room && room.players[0].id === socket.id && room.status === 'lobby') {
          room.maxPlayers = maxPlayers;
          await RedisService.setRoom(roomId, room);
          io.to(roomId).emit("roomUpdated", { maxPlayers: room.maxPlayers });
          console.log(`📏 Sala ${roomId} atualizada para ${maxPlayers} jogadores.`);
        }
      } catch (e) { console.error(e); }
    });

    socket.on("disconnect", async () => {
      try {
        const allRooms = await RedisService.getAllRooms();
        for (const roomId in allRooms) {
          const room = allRooms[roomId];
          const player = room.players.find(p => p.id === socket.id);
          if (player) console.log(`🔌 ${player.playerId} desconectado temporariamente.`);
        }
      } catch (e) { console.warn("Erro no disconnect async:", e.message); }
    });
  });
};
