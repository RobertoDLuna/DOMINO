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
  const [myId, setMyId] = useState(null);
  const [playerId, setPlayerId] = useState(() => {
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

    socket.on('gameStarted', ({ hand, currentTurn, board, scores, theme }) => {
      setMyHand(hand || []); // Garantir array
      setCurrentTurn(currentTurn);
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
      socket.off('connect');
      socket.off('roomCreated');
      socket.off('joinedSuccess');
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('error');
    };
  }, []);

  const createRoom = () => {
    socket.emit('createRoom', { playerId });
  };

  const joinRoom = (roomId) => {
    if (!roomId) return alert("Por favor, digite o código da sala.");
    const id = roomId.trim().toUpperCase();
    isManualJoinRef.current = true;
    socket.emit('joinRoom', { roomId: id, playerId });
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

  const passTurn = () => {
    socket.emit('passTurn', { room });
  };

  const makeMove = (pieceId, side) => {
    socket.emit('makeMove', { pieceId, side, room });
  };

  const value = {
    room,
    players,
    gameState,
    myHand,
    board,
    currentTurn,
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
    setGameState,
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
