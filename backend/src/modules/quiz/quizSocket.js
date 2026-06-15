module.exports = (io) => {
  const quizNamespace = io.of('/quiz');

  // In-memory state for live quizzes (simple mapping for now)
  // roomCode -> { hostId, players: [{ socketId, name, score }], currentQuestionIndex, isStarted }
  const liveRooms = new Map();

  quizNamespace.on('connection', (socket) => {
    // --- Host Events ---
    socket.on('quiz:hostJoin', ({ roomCode }) => {
      socket.join(roomCode);
      let room = liveRooms.get(roomCode);
      
      if (!room) {
        room = {
          hostId: socket.id,
          players: [],
          currentQuestionIndex: -1,
          isStarted: false
        };
        liveRooms.set(roomCode, room);
      } else {
        // Reconnect host
        room.hostId = socket.id;
      }
      console.log(`[Quiz] Host joined room ${roomCode}`);
      // Enviar estado atual para o host (útil se ele atualizar a página)
      socket.emit('quiz:roomState', { players: room.players, isStarted: room.isStarted });
    });

    socket.on('quiz:start', ({ roomCode }) => {
      const room = liveRooms.get(roomCode);
      if (room && room.hostId === socket.id) {
        room.isStarted = true;
        room.currentQuestionIndex = 0;
        quizNamespace.to(roomCode).emit('quiz:started');
      }
    });

    socket.on('quiz:nextQuestion', ({ roomCode, questionIndex, durationSecs }) => {
      const room = liveRooms.get(roomCode);
      if (room && room.hostId === socket.id) {
        room.currentQuestionIndex = questionIndex;
        // Iniciar ou redefinir a contagem de respostas dadas nesta questão
        room.answersCount = 0;
        // Broadcast the question start so clients start their timers
        quizNamespace.to(roomCode).emit('quiz:questionStarted', { questionIndex, durationSecs });
      }
    });

    socket.on('quiz:questionEnd', ({ roomCode, correctAnswerId, leaderboard }) => {
      const room = liveRooms.get(roomCode);
      if (room && room.hostId === socket.id) {
        // Broadcast that time is up, show correct answer and partial leaderboard
        quizNamespace.to(roomCode).emit('quiz:questionEnded', { correctAnswerId, leaderboard });
      }
    });

    socket.on('quiz:finish', ({ roomCode, finalLeaderboard }) => {
      const room = liveRooms.get(roomCode);
      if (room && room.hostId === socket.id) {
        quizNamespace.to(roomCode).emit('quiz:finished', { finalLeaderboard });
        liveRooms.delete(roomCode); // Clean up
      }
    });

    // --- Player Events ---
    socket.on('quiz:playerJoin', ({ roomCode, playerName }) => {
      socket.join(roomCode);
      const room = liveRooms.get(roomCode);
      if (room) {
        const newPlayer = { socketId: socket.id, name: playerName, score: 0 };
        room.players.push(newPlayer);
        // Notify host
        quizNamespace.to(room.hostId).emit('quiz:playerJoined', newPlayer);
        console.log(`[Quiz] Player ${playerName} joined room ${roomCode}`);
      } else {
        socket.emit('quiz:error', 'Sala não encontrada ou não está ao vivo');
      }
    });

    socket.on('quiz:submitAnswer', ({ roomCode, isCorrect, pointsEarned }) => {
      const room = liveRooms.get(roomCode);
      if (room) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.score += pointsEarned;
          // Notify host so they can update live scoreboard
          quizNamespace.to(room.hostId).emit('quiz:playerAnswered', {
            socketId: socket.id,
            name: player.name,
            score: player.score,
            isCorrect
          });

          // Incrementar contagem de respostas dadas
          room.answersCount = (room.answersCount || 0) + 1;

          // Se todos os participantes conectados responderam, avisa o host para encerrar o tempo
          if (room.answersCount >= room.players.length) {
            quizNamespace.to(room.hostId).emit('quiz:allAnswered');
          }
        }
      }
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      // Find which room the player was in
      for (const [roomCode, room] of liveRooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          const pName = room.players[playerIndex].name;
          room.players.splice(playerIndex, 1);
          quizNamespace.to(room.hostId).emit('quiz:playerLeft', { socketId: socket.id, name: pName });
          console.log(`[Quiz] Player left room ${roomCode}`);
          break;
        }
      }
    });
  });
};
