const RedisService = require("../services/RedisService");
const ScoringService = require("../services/ScoringService");
const GameService = require("../services/GameService");
const RankingService = require("../services/RankingService");

/**
 * Socket.io Controller for Domino Game.
 */
module.exports = (io) => {
  const touch = async (roomId) => {
    try {
      const room = await RedisService.getRoom(roomId);
      if (room) {
        room.lastActivity = Date.now();
        await RedisService.setRoom(roomId, room);
      }
    } catch (e) {
      console.warn(`[Redis Touch Error] Sala ${roomId}:`, e.message);
    }
  };

  // Job de limpeza a cada 60s para salas inativas (3 minutos)
  setInterval(async () => {
    try {
      const allRooms = await RedisService.getAllRooms();
      const now = Date.now();
      const TIMEOUT = 600000; // 10 minutos

      for (const roomId in allRooms) {
        const room = allRooms[roomId];
        if (room && room.lastActivity) {
          const inactiveTime = now - room.lastActivity;
          if (inactiveTime > TIMEOUT) {
            console.log(`[Inatividade] Sala ${roomId} encerrada após ${Math.round(inactiveTime/1000)}s.`);
            io.to(roomId).emit("gameForcedEnd", { 
              message: "A sala foi encerrada por inatividade. Interaja com o jogo para mantê-la ativa." 
            });
            await RedisService.deleteRoom(roomId);
          }
        }
      }
    } catch (error) {
      console.error("[Cleanup Job Error]:", error);
    }
  }, 60000);

  io.on("connection", (socket) => {
    console.log(`🔌 Usuário conectado: ${socket.id}`);

    /**
     * Create Room Handler
     */
    socket.on("createRoom", async ({ playerId, playerName, themeId }) => {
      try {
        const roomId = GameService.generateRoomId();
        socket.join(roomId);
        const nameToUse = playerName || 'JOGADOR';
        const roomData = { 
          players: [{ id: socket.id, playerId, name: nameToUse }], 
          status: 'lobby',
          maxPlayers: 2,
          themeId: themeId || 'animais',
          lastActivity: Date.now() // Inicializa atividade
        };
        await RedisService.setRoom(roomId, roomData);
        socket.emit("roomCreated", { roomId });
        io.to(roomId).emit("playerJoined", [{ id: socket.id, playerId, name: nameToUse }]);
        io.to(roomId).emit("roomUpdated", { 
          maxPlayers: 2,
          themeId: roomData.themeId 
        });
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

          room.lastActivity = Date.now(); // Atualiza atividade
          await RedisService.setRoom(roomId, room);
          io.to(roomId).emit("playerJoined", room.players);
          io.to(roomId).emit("roomUpdated", { 
            maxPlayers: room.maxPlayers || 2,
            themeId: room.themeId || 'animais'
          });
          socket.emit("joinedSuccess", { 
            roomId, 
            status: room.status, 
            themeId: room.themeId || 'animais',
            maxPlayers: room.maxPlayers || 2
          });

          if (room.status === 'playing') {
            io.to(roomId).emit("updateBoard", { 
              board: room.board, 
              currentTurn: room.currentTurn 
            });

            socket.emit("gameStarted", {
              hand: room.hands[socket.id],
              currentTurn: room.currentTurn,
              startingPieceId: room.startingPieceId,
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
     * Select Theme Handler (Lobby)
     */
    socket.on("selectTheme", async ({ roomId, themeId }) => {
      try {
        const room = await RedisService.getRoom(roomId);
        if (room && room.status === 'lobby') {
          room.themeId = themeId;
          room.lastActivity = Date.now();
          await RedisService.setRoom(roomId, room);
          io.to(roomId).emit("roomUpdated", { 
            themeId: room.themeId,
            maxPlayers: room.maxPlayers 
          });
        }
      } catch (error) {
        console.error("❌ Erro ao selecionar tema:", error);
      }
    });

    /**
     * Select Max Players Handler (Lobby)
     */
    socket.on("selectMaxPlayers", async ({ roomId, maxPlayers }) => {
      try {
        const room = await RedisService.getRoom(roomId);
        if (room && room.status === 'lobby') {
          room.maxPlayers = maxPlayers;
          room.lastActivity = Date.now();
          await RedisService.setRoom(roomId, room);
          io.to(roomId).emit("roomUpdated", { 
            themeId: room.themeId,
            maxPlayers: room.maxPlayers 
          });
        }
      } catch (error) {
        console.error("❌ Erro ao selecionar capacidade:", error);
      }
    });

    /**
     * Start Game Handler
     */
    socket.on("startGame", async ({ roomId, themeId }) => {
      try {
        let room = await RedisService.getRoom(roomId);
        if (!room) return;

        if (room.status === 'finished') {
          const readyPlayers = room.players.filter(p => p.ready);
          if (readyPlayers.length < 2) return;

          room.players = readyPlayers;
          room.maxPlayers = readyPlayers.length;
          room.players.forEach(p => delete p.ready);
        }

        if (room.players.length >= 2) {
          const gameData = await GameService.createGame(room.players, themeId);
          const updatedRoom = { ...room, ...gameData, status: 'playing', lastActivity: Date.now() };
          await RedisService.setRoom(roomId, updatedRoom);

          room.players.forEach(p => {
            io.to(p.id).emit("gameStarted", {
              hand: updatedRoom.hands[p.id],
              currentTurn: updatedRoom.currentTurn,
              startingPieceId: updatedRoom.startingPieceId,
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
     * Play Again Vote Handler
     */
    socket.on("playAgain", async ({ roomId }) => {
      try {
        const room = await RedisService.getRoom(roomId);
        if (room && room.status === 'finished') {
          const playerIdx = room.players.findIndex(p => p.id === socket.id);
          if (playerIdx !== -1) {
            room.players[playerIdx].ready = true;
            room.lastActivity = Date.now(); // Atualiza atividade
            await RedisService.setRoom(roomId, room);
            io.to(roomId).emit("playerJoined", room.players);
          }
        }
      } catch (e) { console.error(e); }
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
          const result = ScoringService.getTrancamentoWinner(game);
          
          if (result.isTie) {
            result.tiedPlayers.forEach(pId => {
              if (game.scores[pId] !== undefined) game.scores[pId] += result.points;
            });
            result.tiedPlayers.forEach(pId => {
              const playerObj = game.players.find(p => p.id === pId);
              if (playerObj && playerObj.playerId) {
                RankingService.saveGameResult(playerObj.playerId, result.winType, result.points, roomId, game.theme?.id);
              }
            });
          } else {
            if (game.scores[result.winnerId] !== undefined) game.scores[result.winnerId] += result.points;
            const playerObj = game.players.find(p => p.id === result.winnerId);
            if (playerObj && playerObj.playerId) {
              RankingService.saveGameResult(playerObj.playerId, result.winType, result.points, roomId, game.theme?.id);
            }
          }
          
          playerIds.forEach(pId => {
            const winnerId = result.winnerId;
            const winnerInfo = game.players.find(p => p.id === winnerId);
            const isWinner = winnerId === pId;
            const winnerIsGuest = winnerInfo && winnerInfo.playerId && winnerInfo.playerId.startsWith('guest-');
            
            let message = "";
            if (isWinner) {
              const baseMsg = result.isTie ? "Empate no trancamento!" : "Você trancou com menos pontos!";
              message = winnerIsGuest ? baseMsg : `${baseMsg} (+${result.points} pts)`;
            } else {
              message = result.isTie ? "O jogo trancou em empate!" : "O jogo trancou! Alguém tinha menos pontos.";
            }

            io.to(pId).emit("gameOver", { 
              iWon: isWinner, 
              message,
              winnerId: winnerId,
              winnerName: winnerInfo ? winnerInfo.name : 'Vencedor'
            });
          });
          game.status = 'finished';
        } else {
          io.to(roomId).emit("updateBoard", { board: game.board, currentTurn: game.currentTurn });
        }
        game.lastActivity = Date.now(); // Atualiza atividade
        await RedisService.setRoom(roomId, game);
      } catch (e) { console.error(e); }
    };

    /**
     * Move Execution Handler
     */
    socket.on("makeMove", async ({ pieceId, side, roomId }) => {
      try {
        const game = await RedisService.getRoom(roomId);
        if (!game || game.currentTurn !== socket.id) return;

        const moveResult = GameService.processMove(game, socket.id, pieceId, side);
        
        if (moveResult.canPlay) {
          socket.emit("updateHand", game.hands[socket.id]);
          if (moveResult.isOver) {
             const pointsData = ScoringService.calculateWinScore(moveResult.finalPiece, moveResult.isLailoa);
             game.scores[socket.id] += pointsData.points;
             
             const playerObj = game.players.find(p => p.id === socket.id);
             if (playerObj && playerObj.playerId) {
               RankingService.saveGameResult(playerObj.playerId, pointsData.winType, pointsData.points, roomId, game.theme?.id);
             }

             io.to(roomId).emit("updateScores", game.scores);
             io.to(roomId).emit("updateBoard", { board: game.board, currentTurn: null });
             
             socket.to(roomId).emit("gameOver", { 
               iWon: false, 
               message: "Alguém bateu o jogo!",
               winnerId: socket.id,
               winnerName: playerObj ? playerObj.name : 'Vencedor'
             });
             
             const winnerIsGuest = playerObj && playerObj.playerId && playerObj.playerId.startsWith('guest-');
             const msgText = moveResult.isLailoa 
                 ? `Parabéns! LAILOA!${winnerIsGuest ? '' : ` (+${pointsData.points} pts)`}`
                 : `Parabéns! Você bateu e venceu!${winnerIsGuest ? '' : ` (+${pointsData.points} pts)`}`;
             
             socket.emit("gameOver", { 
               iWon: true, 
               message: msgText,
               winnerId: socket.id,
               winnerName: playerObj ? playerObj.name : 'Vencedor'
             });
             
             game.status = 'finished';
             game.lastActivity = Date.now(); // Atualiza atividade
             await RedisService.setRoom(roomId, game);
             return;
          }
          await finalizeTurn(game, roomId);
        }
      } catch (error) { console.error(error); }
    });

    socket.on("passTurn", async ({ roomId }) => {
      try {
        const game = await RedisService.getRoom(roomId);
        await touch(roomId);
        await finalizeTurn(game, roomId);
      } catch (e) { console.error(e); }
    });

    socket.on("leaveRoom", async ({ roomId }) => {
      try {
        const room = await RedisService.getRoom(roomId);
        if (room) {
          socket.leave(roomId);
          if (room.players.length > 0 && room.players[0].id === socket.id) {
             io.to(roomId).emit("gameForcedEnd", { message: "O dono da sala saiu e a sala foi encerrada." });
             await RedisService.deleteRoom(roomId);
             return;
          }

          room.players = room.players.filter(p => p.id !== socket.id);
          if (room.players.length === 0) await RedisService.deleteRoom(roomId);
          else {
            room.lastActivity = Date.now(); // Atualiza atividade
            io.to(roomId).emit("playerJoined", room.players);
            await RedisService.setRoom(roomId, room);
          }
        }
      } catch (e) { console.error(e); }
    });
    
    socket.on("forceEndGame", async ({ roomId }) => {
      try {
        const room = await RedisService.getRoom(roomId);
        if (room) {
          io.to(roomId).emit("gameForcedEnd", { message: "A partida foi encerrada por um dos jogadores." });
          await RedisService.deleteRoom(roomId);
          console.log(`💀 Partida ${roomId} encerrada forçadamente.`);
        }
      } catch (e) { console.error(e); }
    });

    socket.on("disconnect", async () => {
      const disconnectedSocketId = socket.id;
      try {
        const allRooms = await RedisService.getAllRooms();
        for (const roomId in allRooms) {
          const room = allRooms[roomId];
          const playerIdx = room.players.findIndex(p => p.id === disconnectedSocketId);
          
          if (playerIdx !== -1) {
            const player = room.players[playerIdx];
            console.log(`🔌 ${player.playerId} desconectado da sala ${roomId}. Aguardando 1 min para reconexão...`);
            
            if (room.status !== 'playing') continue;

            setTimeout(async () => {
              try {
                const updatedRoom = await RedisService.getRoom(roomId);
                if (!updatedRoom || updatedRoom.status !== 'playing') return;

                const currentPlayer = updatedRoom.players.find(p => p.playerId === player.playerId);
                
                if (currentPlayer && currentPlayer.id === disconnectedSocketId) {
                  console.log(`⏰ Tempo de reconexão esgotado para ${player.playerId} na sala ${roomId}.`);
                  io.to(roomId).emit("gameForcedEnd", { 
                    message: `A partida foi encerrada porque ${player.name} saiu e não voltou a tempo.` 
                  });
                  await RedisService.deleteRoom(roomId);
                }
              } catch (err) {
                console.error("❌ Erro no timeout de desconexão:", err);
              }
            }, 60000);
          }
        }
      } catch (e) { 
        console.warn("⚠️ Erro no disconnect async:", e.message); 
      }
    });
  });
};
