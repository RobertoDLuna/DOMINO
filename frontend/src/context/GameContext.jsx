import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { socket } from "../services/socket";

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState('lobby'); // 'lobby', 'playing', 'finished'
  const [myHand, setMyHand] = useState([]);
  const [board, setBoard] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [startingPieceId, setStartingPieceId] = useState(null);
  const [myId, setMyId] = useState(null);
  const [playerId, setPlayerId] = useState(() => {
    // 1. Tenta usar o ID Real do Jogador Logado
    try {
      const authUser = localStorage.getItem('domino_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        if (user && user.id) return user.id;
      }
    } catch (e) {}

    // 2. Fallback para ID de Convidado Local
    const saved = localStorage.getItem('domino_player_id');
    const id = saved || Math.random().toString(36).substring(2, 15);
    if (!saved) localStorage.setItem('domino_player_id', id);
    return id;
  });

  const [winner, setWinner] = useState(null);
  const [gameOverMsg, setGameOverMsg] = useState("");
  const [iWon, setIWon] = useState(false);
  const [scores, setScores] = useState({});
  const [currentTheme, setCurrentTheme] = useState(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const isManualJoinRef = useRef(false);

  useEffect(() => {
    // Se já estiver conectado, pega o ID imediatamente
    if (socket.connected) {
      console.log('✅ Socket já conectado:', socket.id);
      setMyId(socket.id);
    }

    socket.on('connect', () => {
      console.log('🔗 Conectado ao servidor!', socket.id);
      setIsConnected(true);
      setMyId(socket.id);
      
      const savedRoom = localStorage.getItem('domino_current_room');
      if (savedRoom) {
        console.log('🔄 Tentando reconectar à sala:', savedRoom);
        socket.emit('joinRoom', { roomId: savedRoom, playerId });
      }
    });

    socket.on('disconnect', () => {
      console.warn('❌ Socket desconectado!');
      setIsConnected(false);
    });

    socket.on('roomCreated', ({ roomId }) => {
      console.log('✅ Sala criada no servidor:', roomId);
      setRoom(roomId);
      localStorage.setItem('domino_current_room', roomId);
    });

    socket.on('joinedSuccess', ({ roomId, status }) => {
      setRoom(roomId);
      localStorage.setItem('domino_current_room', roomId);
    });

    socket.on('playerJoined', (updatedPlayers) => {
      console.log('👥 Jogadores atualizados:', updatedPlayers);
      setPlayers(updatedPlayers);
    });

    socket.on('gameStarted', ({ hand, currentTurn, startingPieceId, board, scores, theme }) => {
      setMyHand(hand || []); // Garantir array
      setCurrentTurn(currentTurn);
      setStartingPieceId(startingPieceId);
      setBoard(board || []); // Garantir array
      setScores(scores || {});
      setCurrentTheme(theme);
      setWinner(null);
      setGameOverMsg("");
      setGameState('playing');
    });

    socket.on('updateBoard', ({ board, currentTurn }) => {
      console.log('🔄 Tabuleiro atualizado:', board);
      setBoard(board || []);
      setCurrentTurn(currentTurn);
    });

    socket.on('updateHand', (hand) => {
      console.log('🎒 Sua mão:', hand);
      setMyHand(hand || []);
    });

    socket.on('updateScores', (newScores) => {
      console.log('📊 Placar atualizado:', newScores);
      setScores(newScores);
    });

    socket.on('gameOver', ({ iWon, message }) => {
      setIWon(iWon);
      setGameOverMsg(message);
      setGameState('finished');
    });

    socket.on('roomUpdated', ({ maxPlayers }) => {
      console.log('📏 Sala atualizada:', { maxPlayers });
      if (maxPlayers) setMaxPlayers(maxPlayers);
    });

    const handleForcedEnd = ({ message }) => {
      console.warn('⚠️ Partida encerrada forçadamente:', message);
      setRoom(null);
      localStorage.removeItem('domino_current_room');
      setPlayers([]);
      setGameState('lobby');
      setMyHand([]);
      setBoard([]);
      setWinner(null);
      setGameOverMsg("");
      setCurrentTheme(null);
      if (message) alert(message);
    };

    socket.on('gameForcedEnd', handleForcedEnd);

    socket.on('error', ({ message }) => {
      console.error('❌ Erro do servidor:', message);
      
      if (message === "Sala não encontrada.") {
        if (isManualJoinRef.current) alert(message);
        console.warn('🧹 Limpando sala inválida do cache.');
        setRoom(null);
        localStorage.removeItem('domino_current_room');
      } else {
        alert(message);
      }
      
      isManualJoinRef.current = false;
    });

    return () => {
      socket.off('error');
      socket.off('gameOver');
      socket.off('gameForcedEnd');
      socket.off('updateBoard');
      socket.off('updateHand');
      socket.off('updateScores');
    };
  }, []);

  const createRoom = (playerName) => {
    socket.emit('createRoom', { playerId, playerName });
  };

  const joinRoom = (roomId, playerName) => {
    if (!roomId) return alert("Por favor, digite o código da sala.");
    const id = roomId.trim().toUpperCase();
    isManualJoinRef.current = true;
    socket.emit('joinRoom', { roomId: id, playerId, playerName });
  };

  const startGame = (themeId) => {
    socket.emit('startGame', { room, themeId });
  };

  const leaveRoom = () => {
    if (room) {
      socket.emit('leaveRoom', { roomId: room });
      setRoom(null);
      localStorage.removeItem('domino_current_room');
      setPlayers([]);
      setGameState('lobby');
      setMyHand([]);
      setBoard([]);
      setWinner(null);
      setGameOverMsg("");
      setCurrentTheme(null);
    }
  };

  const playAgain = () => {
    if (room) {
      socket.emit('playAgain', { room });
    }
  };

  const passTurn = () => {
    socket.emit('passTurn', { room });
  };

  const makeMove = (pieceId, side) => {
    socket.emit('makeMove', { pieceId, side, room });
  };

  const forceEndGame = () => {
    if (room) {
      socket.emit('forceEndGame', { room });
      // Reset local state immediately for the initiator
      setRoom(null);
      localStorage.removeItem('domino_current_room');
      setPlayers([]);
      setGameState('lobby');
      setMyHand([]);
      setBoard([]);
      setCurrentTheme(null);
    }
  };

  const updateMaxPlayers = (count) => {
    if (room) {
      socket.emit('updateMaxPlayers', { room, maxPlayers: count });
    }
  };

  const value = {
    room,
    players,
    gameState,
    myHand,
    board,
    currentTurn,
    startingPieceId,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    passTurn,
    makeMove,
    winner,
    iWon,
    gameOverMsg,
    scores,
    currentTheme,
    maxPlayers,
    setGameState,
    forceEndGame,
    playAgain,
    updateMaxPlayers,
    myId, // <--- EXPORTANDO ID
    playerId,
    isConnected,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext deve ser usado dentro de um GameProvider");
  }
  return context;
};
