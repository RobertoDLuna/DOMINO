const rooms = new Map();
const ScoringService = require("../services/ScoringService");
const GameService = require("../services/GameService");

/**
 * Socket.io Controller for Domino Game.
 * Handles event routing and session management.
 */
module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Usuário conectado: ${socket.id}`);

    /**
     * Create Room Handler
     */
    socket.on("createRoom", () => {
      const roomId = GameService.generateRoomId();
      socket.join(roomId);
      rooms.set(roomId, { players: [socket.id], status: 'lobby' });
      socket.emit("roomCreated", { roomId });
      io.to(roomId).emit("playerJoined", [{ id: socket.id }]);
      console.log(`🏠 Sala criada: ${roomId} por ${socket.id}`);
    });

    /**
     * Join Room Handler
     */
    socket.on("joinRoom", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        socket.join(roomId);
        if (!room.players.includes(socket.id)) {
          room.players.push(socket.id);
        }
        const playerList = room.players.map(id => ({ id }));
        io.to(roomId).emit("playerJoined", playerList);
        socket.emit("joinedSuccess", { roomId });
        console.log(`🤝 ${socket.id} entrou na sala ${roomId}`);
      } else {
        socket.emit("error", { message: "Sala não encontrada." });
      }
    });

    /**
     * Start Game Handler
     */
    socket.on("startGame", ({ room: roomId, themeId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const activeSocketIds = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
      
      if (activeSocketIds.length >= 2) {
        const gameData = GameService.createGame(activeSocketIds, themeId);
        rooms.set(roomId, { ...room, players: activeSocketIds, ...gameData, status: 'playing' });

        activeSocketIds.forEach(pId => {
          io.to(pId).emit("gameStarted", {
            hand: gameData.hands[pId],
            currentTurn: gameData.currentTurn,
            board: gameData.board,
            scores: gameData.scores,
            theme: gameData.theme
          });
        });
        console.log(`🚀 Jogo iniciado na sala ${roomId} com o tema ${gameData.theme.name}`);
      }
    });

    /**
     * Helper to handle turn transitions and deadlock checks
     */
    const finalizeTurn = (game, roomId, socketId) => {
      const currentIdx = game.players.indexOf(socketId);
      game.currentTurn = game.players[(currentIdx + 1) % game.players.length];

      if (GameService.checkDeadlock(game)) {
        console.log(`🏳️ Deadlock na sala ${roomId}`);
        const winnerId = GameService.getWinnerOnDeadlock(game);

        // Trancamento Rule: +1 point for winner
        const trancamentoWinnerId = ScoringService.getTrancamentoWinner(game);
        if (trancamentoWinnerId) {
          const deadlockPoints = ScoringService.calculateDeadlockScore();
          game.scores[trancamentoWinnerId] += deadlockPoints;
          io.to(roomId).emit("updateScores", game.scores);
        }
        
        game.players.forEach(pId => {
          const won = pId === winnerId;
          io.to(pId).emit("gameOver", { 
            iWon: won, 
            message: won 
              ? `🏆 Você venceu! Ganhou 1 ponto de trancamento.` 
              : "🏳️ Jogo travado! O outro jogador tinha menos peças." 
          });
        });
      } else {
        io.to(roomId).emit("updateBoard", { board: game.board, currentTurn: game.currentTurn });
      }
    };

    /**
     * Move Execution Handler
     */
    socket.on("makeMove", ({ pieceId, side, room: roomId }) => {
      const game = rooms.get(roomId);
      if (!game || game.currentTurn !== socket.id) {
        console.warn(`🛑 Tentativa inválida: Sala ${roomId}, Socket: ${socket.id}`);
        return;
      }

      const moveResult = GameService.processMove(game, socket.id, pieceId, side);

      if (moveResult.canPlay) {
        console.log(`✅ Jogada válida de ${socket.id} na sala ${roomId}`);
        
        socket.emit("updateHand", game.hands[socket.id]);

        if (moveResult.isOver) {
           const piece = game.board[side === 'left' ? 0 : game.board.length - 1]; // Last played piece
           const winPoints = ScoringService.calculateWinScore(piece);
           game.scores[socket.id] += winPoints;
           io.to(roomId).emit("updateScores", game.scores);

           socket.emit("gameOver", { iWon: true, message: `🏆 Parabéns! Você bateu e ganhou mais ${winPoints} pontos!` });
           socket.to(roomId).emit("gameOver", { iWon: false, message: "😿 Alguém venceu! Ele jogou todas as peças." });
           return;
        }

        finalizeTurn(game, roomId, socket.id);
      }
    });

    /**
     * Pass Turn Handler
     */
    socket.on("passTurn", ({ room: roomId }) => {
      const game = rooms.get(roomId);
      if (!game || game.currentTurn !== socket.id) return;
      
      console.log(`⏭️ Turno passado por ${socket.id} na sala ${roomId}`);
      finalizeTurn(game, roomId, socket.id);
    });

    /**
     * Leave Room Handler
     */
    socket.on("leaveRoom", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        socket.leave(roomId);
        room.players = room.players.filter(id => id !== socket.id);
        
        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log(`🗑️ Sala ${roomId} excluída (vazia)`);
        } else {
          const playerList = room.players.map(id => ({ id }));
          io.to(roomId).emit("playerJoined", playerList);
          console.log(`🚪 ${socket.id} saiu da sala ${roomId}`);
        }
      }
    });

    /**
     * Disconnect Handler
     */
    socket.on("disconnect", () => {
      // Remover de todas as salas onde o usuário estava
      rooms.forEach((room, roomId) => {
        if (room.players.includes(socket.id)) {
          room.players = room.players.filter(id => id !== socket.id);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            const playerList = room.players.map(id => ({ id }));
            io.to(roomId).emit("playerJoined", playerList);
          }
        }
      });
      console.log(`👋 Usuário desconectado: ${socket.id}`);
    });
  });
};
