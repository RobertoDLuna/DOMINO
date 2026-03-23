const rooms = new Map();

const generateRoomId = () => Math.random().toString(36).substring(2, 7).toUpperCase();

const createGame = (players) => {
  const images = ["🐶", "🐱", "🐰", "🦊", "🐨", "🦁", "🐯"];
  const pieces = [];

  for (let i = 0; i < images.length; i++) {
    for (let j = i; j < images.length; j++) {
      pieces.push({ id: `p-${i}-${j}`, ladoA: images[i], ladoB: images[j] });
    }
  }

  pieces.sort(() => Math.random() - 0.5);

  const playerHands = {};
  players.forEach((pId) => {
    playerHands[pId] = pieces.splice(0, 7);
  });

  return {
    board: [],
    hands: playerHands,
    pile: pieces,
    currentTurn: players[0],
    players: players,
    status: 'playing'
  };
};

const checkDeadlock = (game) => {
  if (game.board.length === 0) return false;

  const leftEnd = game.board[0].ladoA;
  const rightEnd = game.board[game.board.length - 1].ladoB;
  
  console.log(`🔎 Checando deadlock. Bordas: ${leftEnd} | ${rightEnd}`);

  for (const pId of game.players) {
    const hand = game.hands[pId];
    if (!hand) continue;
    
    const canPlay = hand.some(p => 
      p.ladoA === leftEnd || p.ladoB === leftEnd || 
      p.ladoA === rightEnd || p.ladoB === rightEnd
    );
    
    if (canPlay) {
      console.log(`✅ Jogador ${pId} ainda pode jogar.`);
      return false;
    }
  }

  console.log("🏳️ DEADLOCK DETECTADO!");
  return true;
};

const getWinnerOnDeadlock = (game) => {
  let winner = game.players[0];
  let minPieces = game.hands[winner] ? game.hands[winner].length : 999;

  game.players.forEach(pId => {
    const handLen = game.hands[pId] ? game.hands[pId].length : 999;
    if (handLen < minPieces) {
      minPieces = handLen;
      winner = pId;
    }
  });

  return winner;
};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Novo usuário conectado: ${socket.id}`);

    socket.on("createRoom", () => {
      const roomId = generateRoomId();
      socket.join(roomId);
      rooms.set(roomId, { players: [socket.id], status: 'lobby' });
      socket.emit("roomCreated", { roomId });
      io.to(roomId).emit("playerJoined", [{ id: socket.id }]);
    });

    socket.on("joinRoom", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        socket.join(roomId);
        if (!room.players.includes(socket.id)) room.players.push(socket.id);
        const playerList = room.players.map(id => ({ id }));
        io.to(roomId).emit("playerJoined", playerList);
        socket.emit("joinedSuccess", { roomId });
      } else {
        socket.emit("error", { message: "Sala não encontrada." });
      }
    });

    socket.on("startGame", ({ room: roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const activeSocketIds = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
      
      if (activeSocketIds.length >= 2) {
        const gameData = createGame(activeSocketIds);
        rooms.set(roomId, { ...room, players: activeSocketIds, ...gameData, status: 'playing' });

        activeSocketIds.forEach(pId => {
          io.to(pId).emit("gameStarted", {
            hand: gameData.hands[pId],
            currentTurn: gameData.currentTurn,
            board: gameData.board
          });
        });
      }
    });

    socket.on("makeMove", ({ pieceId, side, room: roomId }) => {
      const game = rooms.get(roomId);
      if (!game || game.currentTurn !== socket.id) {
        console.warn(`🛑 Tentativa de jogada inválida: Sala ${roomId}, Turno: ${game?.currentTurn}, Socket: ${socket.id}`);
        return;
      }

      const playerHand = game.hands[socket.id];
      if (!playerHand) return;

      const pieceIdx = playerHand.findIndex(p => p.id === pieceId);
      if (pieceIdx === -1) return;

      const piece = playerHand[pieceIdx];
      let canPlay = false;
      let finalPiece = { ...piece };

      console.log(`🎲 Tentando mover: ${piece.ladoA}|${piece.ladoB} na ponta: ${side}`);

      if (game.board.length === 0) {
        canPlay = true;
        console.log("📌 Primeira peça da mesa.");
      } else {
        const leftEnd = game.board[0].ladoA;
        const rightEnd = game.board[game.board.length - 1].ladoB;
        console.log(`🔍 Bordas Atuais - Left: ${leftEnd}, Right: ${rightEnd}`);

        if (side === 'left') {
          if (piece.ladoB === leftEnd) {
            canPlay = true;
          } else if (piece.ladoA === leftEnd) {
            finalPiece = { ...piece, ladoA: piece.ladoB, ladoB: piece.ladoA };
            canPlay = true;
            console.log("🔄 Girando peça para o lado esquerdo.");
          }
        } else if (side === 'right') {
          if (piece.ladoA === rightEnd) {
            canPlay = true;
          } else if (piece.ladoB === rightEnd) {
            finalPiece = { ...piece, ladoA: piece.ladoB, ladoB: piece.ladoA };
            canPlay = true;
            console.log("🔄 Girando peça para o lado direito.");
          }
        }
      }

      if (canPlay) {
        console.log(`✅ Jogada válida: ${finalPiece.ladoA}|${finalPiece.ladoB}`);
        playerHand.splice(pieceIdx, 1);
        if (side === 'left' || game.board.length === 0) game.board.unshift(finalPiece);
        else game.board.push(finalPiece);

        socket.emit("updateHand", playerHand);

        if (playerHand.length === 0) {
           // MENSAGEM PERSONALIZADA PARA O VENCEDOR
           socket.emit("gameOver", { iWon: true, message: "🏆 Parabéns! Você jogou todas as peças!" });
           // MENSAGEM PERSONALIZADA PARA OS PERDEDORES
           socket.to(roomId).emit("gameOver", { iWon: false, message: "😿 Alguém venceu! Ele jogou todas as peças." });
           return;
        }

        const currentIdx = game.players.indexOf(socket.id);
        game.currentTurn = game.players[(currentIdx + 1) % game.players.length];

        if (checkDeadlock(game)) {
           const winnerId = getWinnerOnDeadlock(game);
           
           game.players.forEach(pId => {
              const won = pId === winnerId;
              io.to(pId).emit("gameOver", { 
                 iWon: won, 
                 message: won ? "🏆 Você venceu! Tinha menos peças no impasse." : "🏳️ Jogo travado! O outro jogador tinha menos peças." 
              });
           });
        } else {
           io.to(roomId).emit("updateBoard", { board: game.board, currentTurn: game.currentTurn });
        }
      }
    });

    socket.on("passTurn", ({ room: roomId }) => {
      const game = rooms.get(roomId);
      if (!game || game.currentTurn !== socket.id) return;

      const currentIdx = game.players.indexOf(socket.id);
      game.currentTurn = game.players[(currentIdx + 1) % game.players.length];

      if (checkDeadlock(game)) {
        const winnerId = getWinnerOnDeadlock(game);
        game.players.forEach(pId => {
           const won = pId === winnerId;
           io.to(pId).emit("gameOver", { 
              iWon: won, 
              message: won ? "🏆 Você venceu! Tinha menos peças no impasse." : "🏳️ Jogo travado! O outro jogador tinha menos peças." 
           });
        });
      } else {
        io.to(roomId).emit("updateBoard", { board: game.board, currentTurn: game.currentTurn });
      }
    });

    socket.on("disconnect", () => {
      console.log(`👋 Usuário desconectado: ${socket.id}`);
    });
  });
};
