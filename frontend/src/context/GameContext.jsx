import React, { createContext, useContext, useState, useEffect } from "react";
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

  const [winner, setWinner] = useState(null);
  const [gameOverMsg, setGameOverMsg] = useState("");
  const [iWon, setIWon] = useState(false);
  const [scores, setScores] = useState({});

  useEffect(() => {
    // Se já estiver conectado, pega o ID imediatamente
    if (socket.connected) {
      console.log('✅ Socket já conectado:', socket.id);
      setMyId(socket.id);
    }

    socket.on('connect', () => {
      console.log('🔗 Conectado ao servidor!', socket.id);
      setMyId(socket.id);
    });

    socket.on('roomCreated', ({ roomId }) => {
      console.log('🏠 Sala criada:', roomId);
      setRoom(roomId);
    });

    socket.on('joinedSuccess', ({ roomId }) => {
      setRoom(roomId);
    });

    socket.on('playerJoined', (updatedPlayers) => {
      console.log('👥 Jogadores atualizados:', updatedPlayers);
      setPlayers(updatedPlayers);
    });

    socket.on('gameStarted', ({ hand, currentTurn, board, scores }) => {
      setMyHand(hand || []); // Garantir array
      setCurrentTurn(currentTurn);
      setBoard(board || []); // Garantir array
      setScores(scores || {});
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
      alert(message);
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
    socket.emit('createRoom');
  };

  const joinRoom = (roomId) => {
    if (!roomId) return alert("Por favor, digite o código da sala.");
    socket.emit('joinRoom', { roomId: roomId.trim().toUpperCase() });
  };

  const startGame = () => {
    socket.emit('startGame', { room });
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
    startGame,
    passTurn,
    makeMove,
    winner,
    iWon,
    gameOverMsg,
    scores,
    setGameState,
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
