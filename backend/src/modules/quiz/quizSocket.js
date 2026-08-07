module.exports = (io) => {
  const quizNamespace = io.of('/quiz');

  // Estado em memória para quizzes ao vivo
  // roomCode -> { hostId, players: [{ socketId, name, score }], currentQuestionIndex, isStarted }
  const liveRooms = new Map();

  quizNamespace.on('connection', (socket) => {
    // --- Eventos do Anfitrião (Host) ---
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
        // Reconexão do anfitrião
        room.hostId = socket.id;
      }
      console.log(`[Quiz] Anfitrião entrou na sala ${roomCode}`);
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
        // Transmite o início da questão para que os clientes iniciem os temporizadores
        quizNamespace.to(roomCode).emit('quiz:questionStarted', { questionIndex, durationSecs });
      }
    });

    socket.on('quiz:questionEnd', ({ roomCode, correctAnswerId, leaderboard }) => {
      const room = liveRooms.get(roomCode);
      if (room && room.hostId === socket.id) {
        // Transmite o fim do tempo, exibe alternativa correta e ranking parcial
        quizNamespace.to(roomCode).emit('quiz:questionEnded', { correctAnswerId, leaderboard });
      }
    });

    socket.on('quiz:finish', ({ roomCode, finalLeaderboard }) => {
      const room = liveRooms.get(roomCode);
      if (room && room.hostId === socket.id) {
        quizNamespace.to(roomCode).emit('quiz:finished', { finalLeaderboard });
        liveRooms.delete(roomCode); // Limpeza da memória
      }
    });

    // --- Eventos do Jogador/Aluno ---
    socket.on('quiz:playerJoin', ({ roomCode, playerName }) => {
      socket.join(roomCode);
      const room = liveRooms.get(roomCode);
      if (room) {
        // Verifica se o jogador com este nome já existia na sala (reconexão)
        const existingPlayer = room.players.find(p => p.name.toUpperCase() === playerName.toUpperCase());
        
        if (existingPlayer) {
          existingPlayer.socketId = socket.id; // Atualiza com o novo socket.id da reconexão
          // Notifica o host sobre a reconexão mantendo a pontuação
          quizNamespace.to(room.hostId).emit('quiz:playerJoined', existingPlayer);
          console.log(`[Quiz] Jogador ${playerName} reconectou à sala ${roomCode} com ${existingPlayer.score} pontos`);
        } else {
          const newPlayer = { socketId: socket.id, name: playerName, score: 0 };
          room.players.push(newPlayer);
          // Notifica o anfitrião
          quizNamespace.to(room.hostId).emit('quiz:playerJoined', newPlayer);
          console.log(`[Quiz] Jogador ${playerName} entrou na sala ${roomCode}`);
        }
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
          // Notifica o anfitrião para atualizar o placar ao vivo
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

    // --- Desconexão ---
    socket.on('disconnect', () => {
      // Procura em qual sala o participante ou host desconectado estava
      for (const [roomCode, room] of liveRooms.entries()) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          // Notifica o host sobre a perda temporária de conexão, mas NÃO remove o jogador do array
          quizNamespace.to(room.hostId).emit('quiz:playerLeft', { socketId: socket.id, name: player.name });
          console.log(`[Quiz] Jogador ${player.name} desconectou temporariamente da sala ${roomCode}`);
          break;
        }
      }
    });
  });
};
