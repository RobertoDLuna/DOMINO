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
  const [lobbyTheme, setLobbyTheme] = useState(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isSelectingTheme, setIsSelectingTheme] = useState(false);
  const isManualJoinRef = useRef(false);

  // Função centralizada para limpar todo o estado da sala/jogo
  const resetRoomState = () => {
    console.log("🧹 Resetando estado global do jogo...");
    setRoom(null);
    localStorage.removeItem('domino_current_room');
    setPlayers([]);
    setGameState('lobby');
    setMyHand([]);
    setBoard([]);
    setWinner(null);
    setGameOverMsg("");
    setCurrentTheme(null);
    setLobbyTheme(null);
    setMaxPlayers(2);
    setIsSelectingTheme(false);
  };

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

    socket.on('joinedSuccess', ({ roomId, status, themeId }) => {
      setRoom(roomId);
      localStorage.setItem('domino_current_room', roomId);
      if (themeId) setLobbyTheme(themeId);
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

    socket.on('gameOver', ({ iWon, message, winnerId, winnerName }) => {
      setIWon(iWon);
      setGameOverMsg(message);
      if (winnerId || winnerName) {
        setWinner({ id: winnerId, name: winnerName });
      }
      setGameState('finished');
    });

    socket.on('roomUpdated', ({ maxPlayers, themeId }) => {
      console.log('📏 Sala atualizada:', { maxPlayers, themeId });
      if (maxPlayers) setMaxPlayers(maxPlayers);
      if (themeId) {
        setLobbyTheme(themeId);
        setIsSelectingTheme(false); // Sempre que o tema muda, assume-se que a seleção acabou
      }
    });

    socket.on('selectingThemeStatus', ({ status }) => {
      console.log('👀 Status de seleção de tema:', status);
      setIsSelectingTheme(status);
    });

    const handleForcedEnd = ({ message }) => {
      console.warn('⚠️ Partida encerrada forçadamente:', message);
      resetRoomState();
      if (message) alert(message);
    };
 
    socket.on('gameForcedEnd', handleForcedEnd);

    socket.on('error', ({ message }) => {
      console.error('❌ Erro do servidor:', message);
      
      const sessionBlockers = ["Sala não encontrada.", "Sala cheia.", "O jogo já começou."];
      
      if (sessionBlockers.includes(message)) {
        if (isManualJoinRef.current) alert(message);
        console.warn(`🧹 Limpando sala após erro de sessão: ${message}`);
        resetRoomState();
      } else {
        alert(message);
      }
      
      isManualJoinRef.current = false;
    });

    return () => {
      console.log("🚿 Limpando listeners do socket...");
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomCreated');
      socket.off('joinedSuccess');
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('updateBoard');
      socket.off('updateHand');
      socket.off('updateScores');
      socket.off('gameOver');
      socket.off('roomUpdated');
      socket.off('selectingThemeStatus');
      socket.off('gameForcedEnd');
      socket.off('error');
    };
  }, []);

  const createRoom = (playerName, themeId) => {
    resetRoomState(); // Garante limpeza total antes de nova criação
    setLobbyTheme(themeId || 'animais');
    socket.emit('createRoom', { playerId, playerName, themeId });
  };

  const joinRoom = (roomId, playerName) => {
    if (!roomId) return alert("Por favor, digite o código da sala.");
    resetRoomState(); // Garante limpeza total antes de nova entrada
    const id = roomId.trim().toUpperCase();
    isManualJoinRef.current = true;
    socket.emit('joinRoom', { roomId: id, playerId, playerName });
  };

  const startGame = (themeId) => {
    socket.emit('startGame', { roomId: room, themeId });
  };

  const leaveRoom = () => {
    console.log("🚪 Saindo da sala e limpando cache...");
    if (room) {
      socket.emit('leaveRoom', { roomId: room });
    }
    // Sempre reseta o estado local, independente se o room no contexto está preenchido,
    // para garantir remoção de itens órfãos no localStorage.
    resetRoomState();
  };

  const playAgain = () => {
    if (room) {
      socket.emit('playAgain', { roomId: room });
    }
  };

  const passTurn = () => {
    socket.emit('passTurn', { roomId: room });
  };

  const makeMove = (pieceId, side) => {
    socket.emit('makeMove', { pieceId, side, roomId: room });
  };

  const forceEndGame = () => {
    if (room) {
      socket.emit('forceEndGame', { roomId: room });
      // Reset local state immediately for the initiator
      resetRoomState();
    }
  };

  const updateMaxPlayers = (count) => {
    if (room) {
      socket.emit('selectMaxPlayers', { roomId: room, maxPlayers: count });
    }
  };

  const selectTheme = (themeId) => {
    if (room) {
      setLobbyTheme(themeId);
      setIsSelectingTheme(false);
      socket.emit('selectTheme', { roomId: room, themeId });
    }
  };

  const setSelectingTheme = (status) => {
    if (room) {
      setIsSelectingTheme(status);
      socket.emit('setSelectingTheme', { roomId: room, status });
    }
  };

  const handleMaxPlayersSelect = (num) => {
    setMaxPlayers(num);
    updateMaxPlayers(num);
  };

  const handleThemeSelect = (themeId) => {
    setLobbyTheme(themeId);
    selectTheme(themeId);
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
    lobbyTheme,
    maxPlayers,
    setGameState,
    forceEndGame,
    playAgain,
    updateMaxPlayers,
    selectTheme,
    isSelectingTheme,
    setSelectingTheme,
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
