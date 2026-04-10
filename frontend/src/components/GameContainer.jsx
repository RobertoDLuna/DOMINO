import React, { useState, useEffect } from "react";
import useGame from "../hooks/useGame";
import { socket } from "../services/socket";
import Piece from "./Piece";
import SnakeBoard from "./SnakeBoard";
import AvatarGuide from "./AvatarGuide";
import ThemeSelector from "./ThemeSelector";
import ThemeCreator from "./ThemeCreator";
import HomeScreen from "./HomeScreen";
import AdminDashboard from "./AdminDashboard";
import SoundService from "../services/SoundService";
import AuthService from "../services/AuthService";
import ThemeService from "../services/ThemeService";
import { themes as defaultThemes } from "../config/themes";

import logoCampina from '../assets/logo-campina.png';
import logoPrefeitura from '../assets/logo-prefeitura.png';

export default function GameContainer({ user, isGuest, initialTheme, onBack }) {
  const {
    room, players, gameState, myHand, board, currentTurn, startingPieceId,
    createRoom, joinRoom, leaveRoom, startGame, makeMove, passTurn, forceEndGame, updateMaxPlayers, playAgain,
    iWon, gameOverMsg, winner, scores, currentTheme, lobbyTheme, maxPlayers, myId, playerId, isConnected, selectTheme, isSelectingTheme, setSelectingTheme: setGlobalSelectingTheme
  } = useGame();

  const [selectedTheme, setSelectedTheme] = useState(initialTheme?.id || lobbyTheme || 'animais');
  const [showCreator, setShowCreator] = useState(false);
  const [selectingTheme, setSelectingTheme] = useState(isSelectingTheme || false);

  // Sync with global context (server updates)
  useEffect(() => {
    if (lobbyTheme) setSelectedTheme(lobbyTheme);
  }, [lobbyTheme]);

  useEffect(() => {
    setSelectingTheme(isSelectingTheme);
  }, [isSelectingTheme]);
  const [dbThemes, setDbThemes] = useState([]);

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const themes = await ThemeService.getThemes(localStorage.getItem('domino_player_id'));
        setDbThemes(prev => {
          // Mescla temas mantendo os que já foram buscados manualmente (como o tema da sala)
          const merged = [...prev];
          themes.forEach(t => {
            if (!merged.some(m => m.id === t.id)) merged.push(t);
          });
          return merged;
        });
      } catch (err) {}
    };
    fetchThemes();
  }, []);

  // Sincroniza o ID selecionado com o lobby vindo do contexto
  useEffect(() => {
    // Se o servidor enviou um tema para o lobby, ele tem prioridade total
    if (lobbyTheme && lobbyTheme !== selectedTheme) {
      console.log('🎨 Sincronizando tema do lobby:', lobbyTheme);
      setSelectedTheme(lobbyTheme);
    }
  }, [lobbyTheme]);

  // Se o tema inicial veio da Home e ainda não temos uma sala, cria uma automaticamente
  useEffect(() => {
    const hasRoomSession = !!room || !!localStorage.getItem('domino_current_room');
    if (initialTheme?.id && !hasRoomSession && gameState === 'lobby') {
      console.log('🚀 Criando sala automática para o tema:', initialTheme.id);
      createRoom(playerInfo.name || "JOGADOR", initialTheme.id);
    }
  }, [initialTheme, room, gameState]);

  useEffect(() => {
    if (initialTheme?.id && !lobbyTheme && !selectedTheme) {
      setSelectedTheme(initialTheme.id);
    }
  }, [initialTheme, lobbyTheme, selectedTheme]);

  useEffect(() => {
    // Busca dados extras se for um tema de banco e não estiver carregado
    const fetchUnknownTheme = async () => {
      const targetId = lobbyTheme || selectedTheme;
      if (!targetId) return;
      
      const isDefault = defaultThemes.some(t => t.id === targetId);
      if (isDefault) return;

      const isAlreadyInDb = dbThemes.some(t => t.id === targetId);
      if (isAlreadyInDb) return;

      try {
        const themeInfo = await ThemeService.getThemeInfo(targetId);
        if (themeInfo) {
          setDbThemes(prev => {
            if (prev.some(t => t.id === themeInfo.id)) return prev;
            return [...prev, themeInfo];
          });
        }
      } catch (err) {
        console.error("Erro ao buscar tema desconhecido:", err);
      }
    };
    
    fetchUnknownTheme();
  }, [lobbyTheme, selectedTheme, dbThemes]);

  const allThemes = [
    ...defaultThemes.map(t => ({ ...t, isDefault: true })),
    ...dbThemes.map(t => ({ 
      id: t.id, 
      name: t.name, 
      emoji: '🎨', 
      description: t.description || 'Tema customizado 🎲',
      isDefault: false 
    }))
  ];

  // Busca robusta do tema atual
  const currentLobbyTheme = React.useMemo(() => {
    const targetId = (lobbyTheme || selectedTheme || '').toString().trim();
    if (!targetId) return null;
    
    // Tenta encontrar nos temas da memória (padrões + banco)
    return allThemes.find(t => t.id.toString() === targetId);
  }, [lobbyTheme, selectedTheme, allThemes]);

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    selectTheme(themeId);
  };

  const handleMaxPlayersSelect = (num) => {
    updateMaxPlayers(num);
  };

  const [playerInfo, setPlayerInfo] = useState({
    name: user?.fullName || localStorage.getItem("domino_player_name") || "",
    avatar: localStorage.getItem("domino_player_avatar") || "0",
    id: user?.id || localStorage.getItem("domino_player_id") || `guest-${Date.now()}`
  });

  const canCreateThemes = user && (user.role === 'PROFESSOR' || user.role === 'ADMIN');

  const [timer, setTimer] = useState(30);
  const [showAvatar, setShowAvatar] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [sideModal, setSideModal] = useState(null);
  const [isMuted, setIsMuted] = useState(() => SoundService.muted);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);



  const [roomIdInput, setRoomIdInput] = useState("");
  const [playerNameInput, setPlayerNameInput] = useState(() => localStorage.getItem('domino_player_name') || "");
  const [draggingPiece, setDraggingPiece] = useState(null);

  const handleNameChange = (e) => {
    const val = e.target.value.substring(0, 20);
    setPlayerNameInput(val.toUpperCase());
    localStorage.setItem('domino_player_name', val.toUpperCase());
  };

  const getFinalName = () => {
    if (playerNameInput.trim()) return playerNameInput.trim();
    const names = ["MESTRE", "LENDA", "NINJA", "HERÓI", "FOCA", "LEÃO"];
    const rnd = names[Math.floor(Math.random() * names.length)];
    setPlayerNameInput(rnd);
    localStorage.setItem('domino_player_name', rnd);
    return rnd;
  };

  const handleCreateRoom = () => {
    createRoom(playerInfo.name || "JOGADOR", selectedTheme);
  };

  const handleJoinRoom = () => {
    joinRoom(roomIdInput, playerInfo.name || "JOGADOR");
  };

  const isMyTurn = currentTurn === myId;
  const isRoomOwner = players.length > 0 && (players[0].id === myId || players[0].playerId === playerId);

  const handleStartGame = () => {
    const themeToUse = selectedTheme || lobbyTheme || 'animais';
    startGame(themeToUse);
  };

  useEffect(() => {
    let interval;
    if (gameState === "playing" && isMyTurn) {
      setTimer(30);
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            passTurn();
            return 30;
          }
          if (prev <= 11) {
            SoundService.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, isMyTurn]);

  useEffect(() => {
    let timeout;
    if (gameState === "playing") {
      setShowAvatar(false);
      timeout = setTimeout(() => {
        setShowAvatar(true);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [gameState, currentTurn, board.length]);

  useEffect(() => {
    if (gameState === "playing" && board.length > 0) {
      SoundService.playPlace();
    }
  }, [board.length]);

  useEffect(() => {
    if (gameState === "finished") {
      if (iWon) SoundService.playWin();
      else SoundService.playLose();
    }
  }, [gameState, iWon]);

  const handleDragStart = (pieceId) => {
    if (board.length === 0 && startingPieceId && pieceId !== startingPieceId) {
      return; // Bloqueia o drag se não for a peça obrigatória inicial
    }
    setDraggingPiece(pieceId);
  };

  const handleDrop = (side) => {
    if (draggingPiece) {
      makeMove(draggingPiece, side);
      setDraggingPiece(null);
    }
  };

  const handlePieceClick = (piece) => {
    if (!isMyTurn) return;
    
    // Bloqueia qualquer peça que não seja a carroça inicial se o tabuleiro for vazio
    if (board.length === 0 && startingPieceId && piece.id !== startingPieceId) {
      return;
    }

    if (selectedPiece?.id === piece.id) {
      setSelectedPiece(null);
      return;
    }
    if (board.length === 0) {
      makeMove(piece.id, 'right');
      setSelectedPiece(null);
      return;
    }
    const leftEnd = board[0]?.ladoA;
    const rightEnd = board[board.length - 1]?.ladoB;
    const fitsLeft = piece.ladoA === leftEnd || piece.ladoB === leftEnd;
    const fitsRight = piece.ladoA === rightEnd || piece.ladoB === rightEnd;

    if (fitsLeft && fitsRight) {
      setSelectedPiece(piece);
      setSideModal({ pieceId: piece.id, leftEnd, rightEnd });
    } else if (fitsLeft) {
      makeMove(piece.id, 'left');
      setSelectedPiece(null);
    } else if (fitsRight) {
      makeMove(piece.id, 'right');
      setSelectedPiece(null);
    } else {
      setSelectedPiece(null);
    }
  };

  const handleSideChoice = (side) => {
    if (sideModal) {
      makeMove(sideModal.pieceId, side);
      setSideModal(null);
      setSelectedPiece(null);
    }
  };



  // 1. LOBBY - MAIN SCREEN
  if (gameState === "lobby" && !room) {
    return (
      <div className="flex flex-col h-screen bg-[#009660] text-white font-sans p-4 sm:p-8 overflow-hidden relative">
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-[#FFCE00]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <header className="flex flex-col items-center flex-shrink-0 z-10 pt-4 sm:pt-10">
          <div className="flex items-center gap-4 sm:gap-8 mb-4 sm:mb-6 bg-white px-6 py-2 sm:px-8 sm:py-3 rounded-[3rem] shadow-[0_15px_40px_rgba(0,0,0,0.2)] border-4 border-emerald-900/10 transition-all hover:scale-105">
            <img src={logoCampina} alt="Seduc" className="h-8 sm:h-16 w-auto object-contain pointer-events-none" />
            <div className="w-px h-6 sm:h-12 bg-gray-200 self-center"></div>
            <img src={logoPrefeitura} alt="Prefeitura" className="h-8 sm:h-16 w-auto object-contain pointer-events-none" />
          </div>
          <h1 className="text-4xl sm:text-7xl font-black drop-shadow-[0_5px_0_rgba(0,0,0,0.2)] text-center tracking-tighter italic uppercase text-[#FFCE00] mb-2 leading-none">
            EDU <span className="text-white block sm:inline">GAMES</span>
          </h1>
          <p className="text-xs text-white/50 font-bold uppercase tracking-[0.3em] bg-black/10 px-4 py-1 rounded-full flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
            {isConnected ? 'Servidor Conectado' : 'Conectando ao Servidor...'}
          </p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-start z-10 w-full overflow-y-auto scrollbar-hide py-2 sm:pt-8">
          <div className="w-full max-w-sm lg:max-w-[480px] flex flex-col items-center gap-3 sm:gap-4">
            <div className="w-full bg-white/0 sm:bg-white sm:p-8 rounded-[3.5rem] sm:shadow-[0_25px_80px_rgba(0,0,0,0.3)] text-center sm:border-b-[10px] sm:border-emerald-900/10 sm:overflow-hidden">
              <div className="mb-3 sm:mb-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 w-full p-0.5">
                  <input 
                    type="text" 
                    placeholder="SEU NOME" 
                    value={playerInfo.name} 
                    disabled={!!user} 
                    onChange={(e) => setPlayerInfo({...playerInfo, name: e.target.value.toUpperCase()})} 
                    className="flex-1 bg-white sm:bg-emerald-50 border-2 sm:border-[3px] border-emerald-200/50 sm:border-emerald-100 p-4 sm:p-4 rounded-[2.5rem] sm:rounded-[1.5rem] focus:outline-none focus:border-[#FFCE00] sm:focus:border-[#009660] focus:ring-4 sm:focus:ring-0 focus:ring-[#FFCE00]/20 placeholder-emerald-900/20 sm:placeholder-emerald-900/30 text-center text-xl sm:text-xl font-black uppercase text-[#009660] transition-all shadow-xl sm:shadow-none min-w-0" 
                  />
                </div>

                {isGuest && <p className="text-[10px] font-black uppercase text-white/40 sm:text-emerald-900/40 tracking-[0.3em] mt-1 sm:mt-0 italic sm:not-italic">Modo Convidado</p>}
                {user && <p className="text-[10px] font-black uppercase text-white/40 sm:text-emerald-900/40 tracking-[0.3em] mt-1 sm:mt-0 italic sm:not-italic">{user.role} | {user.school || 'Externo'}</p>}
              </div>
              <button 
                onClick={handleCreateRoom} 
                className="w-full bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] font-black py-5 sm:py-4 rounded-[2.5rem] sm:rounded-3xl shadow-[0_8px_0_#d1a900] sm:shadow-[0_6px_0_#d1a900] transition-all transform hover:scale-[1.02] sm:hover:scale-105 active:translate-y-1 active:shadow-[0_4px_0_#d1a900] mb-6 sm:mb-4 text-xl sm:text-lg uppercase tracking-tighter"
              >
                Criar Sala 🏫
              </button>
              
              <div className="flex flex-col gap-4 pt-6 sm:pt-3 border-t-2 sm:border-t-2 border-white/10 sm:border-dashed sm:border-gray-100">
                <input 
                  type="text" 
                  placeholder="CÓDIGO DA SALA" 
                  value={roomIdInput} 
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())} 
                  className="w-full bg-emerald-900/20 sm:bg-emerald-50 border-2 sm:border-[3px] border-white/20 sm:border-emerald-100 p-4 sm:p-4 rounded-[2.5rem] sm:rounded-[1.5rem] focus:outline-none focus:border-[#FFCE00] sm:focus:border-[#009660] focus:ring-4 sm:focus:ring-0 focus:ring-[#FFCE00]/20 placeholder-white/20 sm:placeholder-emerald-900/30 text-center text-xl sm:text-lg font-black uppercase text-white sm:text-[#009660] transition-all shadow-inner sm:shadow-none" 
                />
                <button 
                  onClick={handleJoinRoom} 
                  className="w-full bg-white sm:bg-[#009660] hover:bg-white/90 sm:hover:bg-[#00a86b] text-[#009660] sm:text-white font-black py-5 sm:py-4 rounded-[2.5rem] sm:rounded-3xl shadow-[0_8px_0_#e5e7eb] sm:shadow-[0_6px_0_#006d46] transition-all transform hover:scale-[1.02] sm:hover:scale-105 active:translate-y-1 active:shadow-[0_4px_0_#e5e7eb] text-xl sm:text-lg uppercase tracking-tighter border-2 sm:border-b-2 border-transparent sm:border-emerald-400/20"
                >
                  Entrar no Jogo 🧩
                </button>
                <button 
                  onClick={onBack} 
                  className="mt-4 text-emerald-900/40 hover:text-emerald-900 font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 hover:translate-y-[-2px] active:translate-y-0"
                >
                  VOLTAR PARA SELEÇÃO DE TEMAS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. ROOM WAIT SCREEN
  if (room && gameState === "lobby") {
    return (
      <div className="flex flex-col h-screen bg-[#009660] text-white font-sans p-4 sm:p-8 overflow-hidden relative">
        <header className="flex flex-col items-center flex-shrink-0 z-10 pt-1 sm:pt-2">
          <div className="flex items-center gap-3 mb-1 bg-white px-4 py-1.5 rounded-[3rem] shadow-xl border-2 border-emerald-900/10 transition-all hover:scale-105">
            <img src={logoCampina} alt="Seduc" className="h-6 sm:h-9 w-auto object-contain pointer-events-none" />
            <div className="w-px h-4 sm:h-5 bg-gray-200 self-center"></div>
            <img src={logoPrefeitura} alt="Prefeitura" className="h-6 sm:h-9 w-auto object-contain pointer-events-none" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black drop-shadow-md text-[#FFCE00] uppercase italic tracking-tighter text-center leading-none">
            {isRoomOwner ? "Configure sua Sala!" : "Aguardando participantes..."}
          </h1>

          {room && !showCreator && (
            <div id="room-code-display" className="mt-1 bg-emerald-950/60 px-4 py-1.5 rounded-2xl border-2 border-[#FFCE00]/30 flex flex-col items-center gap-0 shadow-[0_10px_40px_rgba(0,0,0,0.3)] transform hover:scale-105 transition-all">
              <span className="text-[9px] font-black uppercase opacity-60 tracking-[0.2em] text-[#FFCE00]">CÓDIGO DA SALA</span>
              <span className="text-xl sm:text-3xl font-mono font-black text-white tracking-[0.2em] select-all leading-tight">{room}</span>
            </div>
          )}
        </header>
        <div className="flex-1 flex-col items-center justify-start z-10 w-full overflow-y-auto scrollbar-hide py-1 pb-4 h-full flex px-4">
          <div className="w-full max-w-[550px] flex flex-col items-center gap-2">
            {isRoomOwner ? (
              <div className="w-full flex flex-col gap-6">
                <div className="bg-white/10 p-2 sm:p-3 rounded-[1.5rem] border border-white/20 backdrop-blur-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 opacity-60 text-center">Capacidade da Sala</p>
                  <div className="flex justify-center gap-2">
                    {[2, 3, 4].map(num => (
                      <button key={num} onClick={() => updateMaxPlayers(num)} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full font-black text-base sm:text-lg transition-all shadow-lg border-2 ${maxPlayers === num ? 'bg-[#FFCE00] text-[#009660] border-white scale-110' : 'bg-white/20 text-white border-transparent opacity-60 hover:opacity-100'}`}>{num}</button>
                    ))}
                  </div>
                </div>
                {/* Owner Theme Visibility */}
                {(initialTheme || selectedTheme) && !showCreator && (
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2.5rem] border-2 border-white/20 flex flex-col items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-full animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-5xl shadow-2xl shrink-0">
                      {(currentLobbyTheme || initialTheme)?.emoji || '🎨'}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-[#FFCE00] uppercase tracking-[0.4em] mb-1 leading-none opacity-80 text-center w-full">Configuração Ativa</p>
                      <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none drop-shadow-md">
                        {(currentLobbyTheme || initialTheme)?.name || 'Carregando...'}
                      </h4>
                      <p className="text-[10px] font-medium text-white/50 mt-2 italic px-4">
                        "{(currentLobbyTheme || initialTheme)?.description || 'Carregando detalhes...'}"
                      </p>
                    </div>
                  </div>
                )}
                
                {!initialTheme && !selectedTheme && (
                  <ThemeSelector
                    selectedTheme={selectedTheme}
                    onSelect={(id) => {
                      handleThemeSelect(id);
                    }}
                    canCreate={canCreateThemes}
                    onOpenCreator={() => {
                      setShowCreator(true);
                      document.body.classList.add('modal-open');
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col gap-6">
                {isSelectingTheme ? (
                  <div className="flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in duration-500 bg-white/10 backdrop-blur-md rounded-[3rem] border-4 border-white/20 shadow-2xl">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 border-4 border-emerald-400/30 animate-bounce-slow shadow-xl">
                      <span className="text-6xl">🎨</span>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter text-center mb-2 drop-shadow-lg">Shhh! Preparando o desafio...</h3>
                    <p className="text-white/70 font-medium text-center max-w-[250px] leading-tight">O mestre está escolhendo o próximo tema para jogarmos!</p>
                    <div className="mt-8 flex gap-2">
                      <div className="w-3 h-3 bg-[#FFCE00] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-3 h-3 bg-[#FFCE00] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-3 h-3 bg-[#FFCE00] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Room Info para Convidados */}
                    <div className="bg-white/10 p-2 sm:p-3 rounded-[1.5rem] border border-white/20 backdrop-blur-sm">
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 opacity-60 text-center">Capacidade da Sala</p>
                      <div className="flex justify-center gap-2">
                        {[2, 3, 4].map(num => (
                          <div key={num} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-base sm:text-lg transition-all shadow-lg border-2 ${maxPlayers === num ? 'bg-[#FFCE00] text-[#009660] border-white scale-110 opacity-100' : 'bg-white/10 text-white/20 border-transparent opacity-30'}`}>{num}</div>
                        ))}
                      </div>
                    </div>

                    {/* Theme Badge para Participantes */}
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2.5rem] border-2 border-white/20 flex flex-col items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-full animate-in zoom-in duration-300">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-5xl shadow-2xl shrink-0">
                        {currentLobbyTheme?.emoji || '🎨'}
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-[#FFCE00] uppercase tracking-[0.4em] mb-1 leading-none opacity-80 text-center w-full">Tema da Partida</p>
                        <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none drop-shadow-md">
                          {currentLobbyTheme?.name || 'Carregando...'}
                        </h4>
                        <p className="text-[10px] font-medium text-white/50 mt-2 italic px-4">
                          "{currentLobbyTheme?.description || 'Aguardando sincronização de tema...'}"
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!showThemeSelector && (
              <>
                <div className="w-full max-w-[550px] flex flex-col gap-3 mt-2">
                  {players.length < maxPlayers && (
                    <div className="bg-black/20 p-3 rounded-2xl border border-white/10 w-full text-center">
                      <p className="text-white font-black text-xs sm:text-sm uppercase tracking-widest animate-pulse italic">
                        Aguardando participantes ({players.length}/{maxPlayers})
                      </p>
                    </div>
                  )}

                  <div className="bg-white/5 backdrop-blur-sm p-4 rounded-[2rem] border-2 border-white/10 w-full shadow-2xl">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] text-center mb-3 border-b border-white/10 pb-1.5 leading-none">Participantes na Mesa</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {players.map((p, i) => (
                        <div key={i} className={`px-4 py-1.5 rounded-xl shadow-lg transition-all flex items-center gap-2 border-b-4 ${p.id === myId ? 'bg-[#FFCE00] text-[#009660] border-yellow-600' : 'bg-white/90 text-emerald-900 border-gray-300'}`}>
                          <span className="text-lg">{p.id === myId ? '🎓' : '🎒'}</span>
                          <span className="font-black text-xs uppercase tracking-tight">{p.name || `Jogador ${i + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-row gap-3 w-full">
                    <button onClick={onBack} className={`${isRoomOwner ? 'flex-1' : 'w-full'} bg-white group hover:bg-[#FFCE00] px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 border-b-4 border-gray-200 active:translate-y-0.5`}>
                      <span className="text-xl">🏠</span>
                      <span className="text-[#009660] font-black text-[10px] uppercase tracking-tight">Sair da Sala</span>
                    </button>
                    
                    {isRoomOwner && (
                      <button 
                        onClick={() => {
                          setShowThemeSelector(true);
                          setSelectingTheme(true);
                        }} 
                        className="flex-1 bg-emerald-700/50 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all border-b-4 border-emerald-900/40 flex items-center justify-center gap-2 active:translate-y-0.5"
                      >
                        <span className="text-lg">🔄</span>
                        <span className="font-black text-[10px] uppercase tracking-widest leading-none">Trocar Tema</span>
                      </button>
                    )}
                  </div>

                  {players.length >= maxPlayers && isRoomOwner && (
                    <button onClick={handleStartGame} className="w-full bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] py-3 rounded-2xl font-black text-xl shadow-[0_6px_0_#d1a900] transition-all active:translate-y-1 active:shadow-[0_3px_0_#d1a900] border-b-2 border-white/20 uppercase animate-bounce-slow">JOGAR! 🚀</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {showThemeSelector && isRoomOwner && (
          <HomeScreen 
            user={user} 
            onSelectTheme={(theme) => {
              handleThemeSelect(theme.id);
              setShowThemeSelector(false);
              setGlobalSelectingTheme(false);
            }} 
            onJoinRoom={() => {
              // Já estamos em uma sala, mas caso precise trocar de sala
              setShowThemeSelector(false);
              setGlobalSelectingTheme(false);
            }}
            onBack={() => {
              setShowThemeSelector(false);
              setGlobalSelectingTheme(false);
            }}
          />
        )}
      </div>
    );
  }

  // 3. PLAYING / FINISHED SCREEN
  if (gameState === "playing" || gameState === "finished") {
    return (
      <div className="h-screen bg-[#F0FDF4] flex flex-col font-sans overflow-hidden select-none relative">
        <main className={`flex-1 flex flex-col items-center justify-center bg-[#009660] relative px-4 shadow-inner border-b-[10px] sm:border-b-[20px] border-emerald-950/20 overflow-hidden ${gameState === 'finished' ? 'blur-xl scale-110 pointer-events-none' : ''} transition-all duration-1000`}>
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none"></div>
          <div className="absolute top-4 sm:top-6 left-4 sm:left-6 flex flex-col items-start gap-2 sm:gap-3 z-[100]">
            {players.map((p, idx) => (
              <div key={p.id} className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 rounded-[1.2rem] sm:rounded-[1.5rem] border-b-[3px] sm:border-b-[5px] transition-all duration-500 transform w-[110px] sm:w-[170px] ${currentTurn === p.id ? 'bg-[#FFCE00] border-yellow-700 text-[#009660] scale-105 shadow-[0_8px_25px_rgba(0,0,0,0.2)]' : 'bg-white/90 border-gray-300 text-emerald-900 opacity-80 shadow-md'} ${players.length > 2 ? 'scale-90 sm:scale-100' : ''}`}>
                <span className="text-base sm:text-2xl">{p.id === myId ? '🔥' : ['👤', '🎒', '🎓', '🎒'][idx % 4]}</span>
                <div className="flex flex-col leading-none overflow-hidden">
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-60 truncate max-w-[60px] sm:max-w-[100px]">{p.name || `Competidor ${idx + 1}`}</span>
                  <span className="text-sm sm:text-xl font-black">{scores[p.id] || 0} pts</span>
                </div>
              </div>
            ))}
            <div id="avatar-guide-container" className={`sm:hidden transition-all duration-700 transform ${showAvatar ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
              <AvatarGuide gameState={gameState} myTurn={isMyTurn} isWinner={iWon} className="!items-start !max-w-[140px]" />
            </div>
          </div>
          <div className="z-10 w-full flex-1 overflow-visible relative">
            <SnakeBoard board={board} isMyTurn={isMyTurn} draggingPiece={draggingPiece} onDrop={handleDrop} />
          </div>
        </main>

        <div className="fixed top-4 right-4 z-[60]">
          {gameState === 'playing' && (
            <button onClick={() => setShowEndConfirm(true)} className="bg-red-500 hover:bg-red-600 text-white font-black px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-[0_4px_0_#991b1b] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider transform -translate-y-0.5">
              <span>X</span><span className="hidden sm:inline">Finalizar Partida</span>
            </button>
          )}
        </div>

        <footer className={`${isMyTurn ? 'bg-[#FFCE00] text-[#009660]' : 'bg-white text-emerald-900 opacity-90'} py-2 sm:py-3 px-2 sm:px-12 flex justify-between items-center shadow-[0_-10px_50px_rgba(0,0,0,0.1)] z-40 relative border-t-2 sm:border-t-4 border-black/10 ${gameState === 'finished' ? 'blur-md pointer-events-none' : ''} transition-all duration-1000`}>
          {/* Logo + Som: compacto em mobile */}
          <div className="flex items-center gap-1.5 sm:gap-6 flex-shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-5 bg-white px-2 py-1.5 sm:py-2.5 rounded-2xl shadow-sm border-2 border-emerald-900/5">
              <img src={logoCampina} alt="Seduc" className="h-4 sm:h-7 w-auto object-contain pointer-events-none" style={{minWidth: '22px'}} />
              <div className="w-px h-3 sm:h-6 bg-gray-200 self-center"></div>
              <img src={logoPrefeitura} alt="Prefeitura" className="h-4 sm:h-7 w-auto object-contain pointer-events-none" style={{minWidth: '22px'}} />
            </div>
            <button onClick={() => setIsMuted(SoundService.toggleMute())} className="bg-white hover:bg-emerald-50 text-emerald-900 px-2 py-2 sm:py-2.5 rounded-2xl shadow-sm border-2 border-emerald-900/5 text-base sm:text-2xl transition-all active:scale-90 flex items-center justify-center">{isMuted ? '🔇' : '🔊'}</button>
          </div>
          {/* Status central */}
          <div className="flex flex-col items-center flex-1 mx-1 sm:mx-4 min-w-0">
            <div className="text-[10px] xs:text-xs sm:text-3xl font-black uppercase tracking-tighter italic leading-none mb-0.5 mt-0.5 truncate px-1">{isMyTurn ? "SUA VEZ!" : "ESPERANDO..."}</div>
            {currentTheme && <div className="hidden sm:block text-[9px] sm:text-xs font-black uppercase tracking-widest opacity-50 leading-none truncate max-w-[90px] sm:max-w-none">{currentTheme?.name || 'Dominó'}</div>}
          </div>
          {/* Timer + Passar: sempre visível */}
          <div className={isMyTurn ? 'opacity-100 flex items-center gap-1.5 sm:gap-6 flex-shrink-0' : 'invisible pointer-events-none flex items-center gap-1.5 sm:gap-6 flex-shrink-0'}>
            {isMyTurn && (
              <div className="flex items-baseline gap-1 sm:gap-2 leading-none">
                <span className="hidden sm:inline text-[10px] sm:text-xs font-black uppercase italic opacity-40">TEMPO</span>
                <span className={`text-lg sm:text-4xl font-black ${timer <= 10 ? 'text-red-600 animate-pulse' : 'text-[#009660]'}`}>{timer}s</span>
              </div>
            )}
            <button onClick={() => { SoundService.playPass(); passTurn(); }} className={`${timer <= 10 ? 'animate-blink-hard' : 'bg-red-500 shadow-[0_4px_0_#991b1b]'} hover:bg-red-600 text-white font-black px-4 sm:px-10 py-2.5 sm:py-4 rounded-2xl sm:rounded-3xl transition-all active:translate-y-[4px] active:shadow-none flex items-center gap-1 sm:gap-2 h-fit transform -translate-y-[2px] flex-shrink-0`}>
              <span className="text-sm sm:text-2xl uppercase tracking-tighter">PASSAR</span><span className="text-base sm:text-3xl">⏭️</span>
            </button>
          </div>
        </footer>

        <div className={`bg-white/95 p-1.5 sm:p-3 shadow-[0_-10px_60px_rgba(0,0,0,0.05)] relative z-30 border-t border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-2 overflow-visible ${gameState === 'finished' ? 'blur-md translate-y-full' : ''} transition-all duration-1000`}>
          {/* Hint de scroll: visível apenas em mobile */}
          <div className="flex sm:hidden items-center justify-center gap-1.5 pt-1 pb-0 w-full">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-900/30 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
              Role para ver todas as peças da sua mão
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </span>
          </div>
          {/* Injeção local de Scrollbar moderno para dar affordance aos usuários mobile */}
          <style>{`
            .hand-scrollbar::-webkit-scrollbar { height: 10px; }
            .hand-scrollbar::-webkit-scrollbar-track { background: rgba(0, 150, 96, 0.1); border-radius: 8px; margin: 0 40px;}
            .hand-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 150, 96, 0.4); border-radius: 8px; }
            .hand-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 150, 96, 0.6); }
          `}</style>
          
          {/* Container de peças: Adicionado touch-pan-x para forçar rolagem nativa, removido scrollbar-hide para dar affordance e pb-6 para n sobrepor */}
          <div 
            style={{ WebkitOverflowScrolling: 'touch' }}
            className="hand-scrollbar flex-1 flex justify-start sm:justify-center gap-3 sm:gap-8 overflow-x-auto overflow-y-hidden py-6 sm:py-12 w-full max-w-full mx-auto min-h-[200px] sm:min-h-[240px] items-center px-4 sm:px-10 pb-6 touch-pan-x"
          >
            {myHand.map((piece) => {
              const isFirstPlayLocked = board.length === 0 && startingPieceId && piece.id !== startingPieceId;
              return (
                <Piece key={piece.id} piece={piece} horizontal={false} draggable={isMyTurn && !isFirstPlayLocked} selected={selectedPiece?.id === piece.id} onDragStart={(e) => { if (!isFirstPlayLocked) handleDragStart(piece.id); }} onClick={() => handlePieceClick(piece)} className={`${(!isMyTurn || isFirstPlayLocked) ? 'opacity-30 grayscale scale-100 pointer-events-none' : 'scale-110 sm:scale-120'} ${board.length === 0 && piece.id === startingPieceId && isMyTurn ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`} />
              );
            })}
          </div>
        </div>

        {sideModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl lg:max-w-4xl max-h-[92vh] rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-black uppercase text-[#009660] text-center p-6">Onde colocar?</h2>
              
              {(() => {
                const API_BASE = import.meta.env.VITE_API_URL 
                  ? import.meta.env.VITE_API_URL.replace('/api', '') 
                  : (typeof window !== 'undefined' ? window.location.origin : '');
                const renderSideLabel = (symbol) => {
                  if (!symbol) return null;
                  
                  const isImagePath = typeof symbol === 'string' && (symbol.startsWith('/') || symbol.startsWith('http'));

                  if (isImagePath) {
                    const src = symbol.startsWith('http') ? symbol : `${API_BASE}${symbol}`;
                    return <img src={src} alt="Symbol" className="max-w-full max-h-full object-contain drop-shadow-md rounded-xl" />;
                  }
                  return <span className="text-4xl drop-shadow-sm">{symbol}</span>;
                };

                return (
                  <div className="flex gap-4 w-full p-6">
                    <button onClick={() => handleSideChoice('left')} className="flex-1 bg-[#009660] hover:bg-[#00a86b] text-white font-black py-5 rounded-2xl shadow-[0_6px_0_#006d46] text-xl transition-all active:translate-y-1 active:shadow-none flex flex-col items-center gap-1 group">
                      <span className="text-3xl group-hover:scale-125 transition-transform duration-300">⬅️</span>
                      <span>AQUI</span>
                      {(() => {
                        const isImage = typeof sideModal.leftEnd === 'string' && (sideModal.leftEnd.startsWith('/') || sideModal.leftEnd.startsWith('http'));
                        return (
                          <div className={isImage ? "w-24 h-24 sm:w-40 sm:h-40 flex items-center justify-center mt-1" : "w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mt-1"}>
                            {renderSideLabel(sideModal.leftEnd)}
                          </div>
                        );
                      })()}
                    </button>
                    <button onClick={() => handleSideChoice('right')} className="flex-1 bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] font-black py-5 rounded-2xl shadow-[0_6px_0_#d1a900] text-xl transition-all active:translate-y-1 active:shadow-none flex flex-col items-center gap-1 group">
                      <span className="text-3xl group-hover:scale-125 transition-transform duration-300">➡️</span>
                      <span>ALÍ</span>
                      {(() => {
                        const isImage = typeof sideModal.rightEnd === 'string' && (sideModal.rightEnd.startsWith('/') || sideModal.rightEnd.startsWith('http'));
                        return (
                          <div className={isImage ? "w-24 h-24 sm:w-40 sm:h-40 flex items-center justify-center mt-1" : "w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mt-1"}>
                            {renderSideLabel(sideModal.rightEnd)}
                          </div>
                        );
                      })()}
                    </button>
                  </div>
                );
              })()}
              
              <button onClick={() => { setSideModal(null); setSelectedPiece(null); }} className="text-gray-400 text-xs uppercase font-bold tracking-widest hover:text-red-400 transition-colors pb-6">Cancelar</button>
            </div>
          </div>
        )}

        <div className={`hidden sm:block fixed top-28 sm:right-8 z-[100] transition-all duration-700 transform ${showAvatar && gameState === 'playing' ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
          <AvatarGuide gameState={gameState} myTurn={isMyTurn} isWinner={iWon} className="!max-w-[120px] sm:!max-w-[180px] drop-shadow-2xl" />
        </div>

        {gameState === "finished" && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 z-[120] pointer-events-none overflow-hidden">
              {iWon ? (
                [...Array(60)].map((_, i) => (
                  <div key={i} className="confetti" style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ['#FFCE00', '#FFFFFF', '#009660', '#3b82f6', '#ef4444'][i % 5],
                    animationDelay: `${Math.random() * 4}s`,
                    animationDuration: `${2.5 + Math.random() * 2}s`,
                    width: `${8 + Math.random() * 10}px`,
                    height: `${Math.random() * 12 + 4}px`
                  }} />
                ))
              ) : (
                [...Array(50)].map((_, i) => (
                  <div key={i} className="rain" style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1.5}s`,
                    animationDuration: `${1 + Math.random() * 1}s`,
                    opacity: Math.random() * 0.5
                  }} />
                ))
              )}
            </div>
            <section className={`p-6 sm:p-10 rounded-[3rem] flex flex-col items-center text-center max-w-lg w-full shadow-[0_40px_100px_rgba(0,0,0,0.5)] transform transition-all animate-in zoom-in duration-700 border-[10px] sm:border-[12px] bg-white ${iWon ? 'border-[#FFCE00]' : 'border-[#009660]'} z-[130]`}>
              <h1 className="text-base sm:text-xl font-black mb-1 sm:mb-2 uppercase tracking-widest text-[#009660] opacity-50">Fim de Jogo</h1>
              <h2 className={`font-black mb-2 sm:mb-3 uppercase italic tracking-tighter leading-none ${iWon ? 'text-5xl sm:text-7xl text-[#009660]' : 'text-4xl sm:text-6xl text-red-500'}`}>{iWon ? 'VITÓRIA!' : 'FOI QUASE!'}</h2>
              <div className="flex flex-col gap-1 mb-6 sm:mb-8">
                <p className="text-xs sm:text-sm font-black text-gray-400 uppercase tracking-widest leading-none">Vencedor:</p>
                <p className={`text-2xl sm:text-4xl font-black uppercase italic ${iWon ? 'text-orange-500' : 'text-emerald-700'}`}>🏆 {winner?.name || 'VENCEDOR'}</p>
              </div>
              <div className={`text-base sm:text-lg font-black mb-6 sm:mb-8 p-4 rounded-[1.5rem] shadow-inner ${iWon ? 'bg-emerald-50 text-[#009660]' : 'bg-red-50 text-red-900'}`}>{gameOverMsg}</div>
              <div className="flex flex-col gap-4 w-full">
                {players.length > 0 && (
                  <div className="bg-emerald-50 p-2 sm:p-3 rounded-2xl border-2 border-emerald-100 flex flex-col items-center">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-800 opacity-60 mb-2 tracking-widest">Jogadores Prontos ({players.filter(p => p.ready).length}/{players.length})</p>
                    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                      {players.map(p => (
                        <span key={p.id} className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase transition-all shadow-sm ${p.ready ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400 opacity-60'}`}>
                          {p.ready ? '✅' : '⏳'} {p.name || 'Jogador'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:gap-4 w-full">
                  {players.find(p => (p.id === myId || p.playerId === playerId))?.ready ? (
                    <div className="bg-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl sm:rounded-3xl text-xl font-black flex items-center justify-center gap-3 border-2 border-emerald-200 shadow-inner">
                      <span>✅</span> VOCÊ ESTÁ PRONTO!
                    </div>
                  ) : (
                    <button onClick={playAgain} className="group bg-[#009660] hover:bg-[#00a86b] text-white font-black px-6 py-4 rounded-2xl sm:rounded-3xl text-xl sm:text-2xl transition-all shadow-[0_6px_0_#004d32] active:translate-y-1 active:shadow-none flex items-center justify-center gap-3">
                      <span className="group-hover:animate-bounce">🎮</span> JOGAR DE NOVO
                    </button>
                  )}

                  <button onClick={leaveRoom} className="bg-white hover:bg-red-50 text-red-500 font-black px-6 py-4 rounded-2xl sm:rounded-3xl text-xl sm:text-2xl transition-all shadow-[0_6px_0_#e5e7eb] active:translate-y-1 active:shadow-none border-2 border-gray-100 flex items-center justify-center gap-3">
                    <span>🏠</span> SAIR DO JOGO
                  </button>
                </div>

                {isRoomOwner && players.filter(p => p.ready).length >= 2 && (
                  <button onClick={() => startGame(currentTheme?.id || 'animais')} className="w-full mt-1 bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] font-black py-4 rounded-2xl shadow-[0_6px_0_#d1a900] transition-all transform hover:scale-105 active:translate-y-1 active:shadow-none text-xl uppercase animate-pulse border-2 border-white/20">
                    🚀 REINICIAR PARTIDA ({players.filter(p => p.ready).length} JOGADORES)
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center gap-6 mt-8 pt-6 w-full border-t-4 border-dashed border-gray-100">
                <img src={logoCampina} alt="Seduc" className="h-6 sm:h-10 object-contain pointer-events-none" /><img src={logoPrefeitura} alt="Prefeitura" className="h-6 sm:h-10 object-contain pointer-events-none" />
              </div>
            </section>
          </div>
        )}

        {showEndConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEndConfirm(false)}></div>
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl border-4 border-red-500 animate-in zoom-in-95 duration-200">
              <div className="text-4xl mb-4 text-center">🛑</div>
              <h2 className="text-2xl font-black text-center text-gray-800 mb-2 italic">ENCERRAR JOGO?</h2>
              <div className="flex flex-col gap-3">
                <button onClick={() => { forceEndGame(); setShowEndConfirm(false); }} className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl shadow-[0_6px_0_#991b1b] active:scale-95 active:shadow-none transition-all uppercase tracking-wider">Sim, encerrar tudo</button>
                <button onClick={() => setShowEndConfirm(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-wider">Voltar ao jogo</button>
              </div>
            </div>
          </div>
        )}

        {showCreator && (
          <ThemeCreator 
            onClose={() => {
              setShowCreator(false);
              document.body.classList.remove('modal-open');
            }}
            onThemeCreated={(newTheme) => {
              setShowCreator(false);
              document.body.classList.remove('modal-open');
              if (newTheme) {
                handleThemeSelect(newTheme.id);
              }
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#009660] flex items-center justify-center text-white p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black uppercase tracking-widest opacity-80">Sincronizando partida...</p>
        <button onClick={leaveRoom} className="mt-4 underline opacity-50 text-xs text-white">Voltar para o início</button>
      </div>
    </div>
  );
}
