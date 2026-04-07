import React, { useState, useEffect } from "react";
import useGame from "../hooks/useGame";
import { socket } from "../services/socket";
import Piece from "./Piece";
import SnakeBoard from "./SnakeBoard";
import AvatarGuide from "./AvatarGuide";
import ThemeSelector from "./ThemeSelector";
import ThemeCreator from "./ThemeCreator";
import AdminDashboard from "./AdminDashboard";
import SoundService from "../services/SoundService";
import AuthService from "../services/AuthService";

import logoCampina from '../assets/logo-campina.png';
import logoPrefeitura from '../assets/logo-prefeitura.png';

export default function GameContainer({ user, isGuest, initialTheme, onBack }) {
  const {
    room, players, gameState, myHand, board, currentTurn,
    createRoom, joinRoom, leaveRoom, startGame, makeMove, passTurn, forceEndGame, updateMaxPlayers, playAgain,
    iWon, gameOverMsg, scores, currentTheme, maxPlayers, myId, playerId, isConnected
  } = useGame();

  const [showAdmin, setShowAdmin] = useState(false);
  const [playerInfo, setPlayerInfo] = useState({
    name: user?.fullName || localStorage.getItem("dominoPlayerName") || "",
    avatar: localStorage.getItem("dominoPlayerAvatar") || "0",
    id: user?.id || localStorage.getItem("dominoPlayerId") || `guest-${Date.now()}`
  });

  const canCreateThemes = user && (user.role === 'PROFESSOR' || user.role === 'ADMIN');


  const winnerId = scores && Object.keys(scores).length > 0
    ? Object.keys(scores).reduce((a, b) => (scores[a] || 0) >= (scores[b] || 0) ? a : b)
    : null;
  const winnerName = players.find(p => p.id === winnerId)?.name || 'Vencedor';

  const [roomIdInput, setRoomIdInput] = useState("");
  const [playerNameInput, setPlayerNameInput] = useState(() => localStorage.getItem('dominoPlayerName') || "");
  const [draggingPiece, setDraggingPiece] = useState(null);

  const handleNameChange = (e) => {
    const val = e.target.value.substring(0, 20);
    setPlayerNameInput(val.toUpperCase());
    localStorage.setItem('dominoPlayerName', val.toUpperCase());
  };

  const getFinalName = () => {
    if (playerNameInput.trim()) return playerNameInput.trim();
    const names = ["MESTRE", "LENDA", "NINJA", "HERÓI", "FOCA", "LEÃO"];
    const rnd = names[Math.floor(Math.random() * names.length)];
    setPlayerNameInput(rnd);
    localStorage.setItem('dominoPlayerName', rnd);
    return rnd;
  };

  const handleCreateRoom = () => {
    createRoom(playerInfo.name || "JOGADOR");
  };

  const handleJoinRoom = () => {
    joinRoom(roomIdInput, playerInfo.name || "JOGADOR");
  };

  const [selectedTheme, setSelectedTheme] = useState(initialTheme?.id || 'animais');
  const [showCreator, setShowCreator] = useState(false);
  const [timer, setTimer] = useState(30);
  const [showAvatar, setShowAvatar] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [sideModal, setSideModal] = useState(null);
  const [isMuted, setIsMuted] = useState(() => SoundService.muted);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const isMyTurn = currentTurn === myId;
  const isRoomOwner = players.length > 0 && players[0].id === myId;

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

  const handleStartGame = () => {
    startGame(selectedTheme);
  };

  // 1. LOBBY - MAIN SCREEN
  if (gameState === "lobby" && !room) {
    return (
      <div className="flex flex-col h-screen bg-[#009660] text-white font-sans p-4 sm:p-8 overflow-hidden relative">
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-[#FFCE00]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <header className="flex flex-col items-center flex-shrink-0 z-10 pt-4 sm:pt-0">
          <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-8 bg-white px-6 py-2 sm:py-3 rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.15)] border-4 border-emerald-900/10 transition-all hover:scale-105">
            <img src={logoCampina} alt="Seduc" className="h-6 sm:h-10 w-auto object-contain pointer-events-none" />
            <div className="w-px h-6 sm:h-8 bg-gray-200 self-center"></div>
            <img src={logoPrefeitura} alt="Prefeitura" className="h-6 sm:h-10 w-auto object-contain pointer-events-none" />
          </div>
          <h1 className="text-5xl sm:text-8xl font-black drop-shadow-[0_5px_0_rgba(0,0,0,0.2)] text-center tracking-tighter italic uppercase text-[#FFCE00] mb-2 leading-none">
            EDU <span className="text-white block sm:inline">GAMES</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/50 font-bold uppercase tracking-[0.3em] bg-black/10 px-4 py-1 rounded-full flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
            {isConnected ? 'Servidor Conectado' : 'Conectando ao Servidor...'}
          </p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center z-10 w-full overflow-y-auto scrollbar-hide py-8">
          <div className="w-full max-w-sm lg:max-w-4xl flex flex-col items-center gap-8">
            <div className="w-full bg-white/0 sm:bg-white sm:p-12 rounded-[3.5rem] sm:shadow-[0_25px_80px_rgba(0,0,0,0.3)] text-center sm:border-b-[12px] sm:border-emerald-900/10 overflow-hidden">
              <div className="mb-6 sm:mb-8 flex flex-col gap-2">
                <div className="flex items-center gap-2 w-full">
                  <input type="text" placeholder="SEU NOME" value={playerInfo.name} disabled={!!user} onChange={(e) => setPlayerInfo({...playerInfo, name: e.target.value.toUpperCase()})} className="flex-1 bg-emerald-50 border-4 border-emerald-100 p-4 sm:p-5 rounded-[2rem] focus:outline-none focus:border-[#009660] placeholder-emerald-900/30 text-center text-xl sm:text-2xl font-black uppercase text-[#009660] transition-all min-w-0" />
                </div>

                {isGuest && <p className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest">Modo Convidado</p>}
                {user && <p className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest">{user.role} | {user.school || 'Externo'}</p>}
              </div>
              <button onClick={handleCreateRoom} className="w-full bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] font-black py-5 sm:py-6 rounded-3xl shadow-[0_8px_0_#d1a900] transition-all transform hover:scale-105 active:translate-y-1 active:shadow-[0_4px_0_#d1a900] mb-6 sm:mb-8 text-xl sm:text-2xl uppercase tracking-tight">Criar Sala 🏫</button>
              <div className="flex flex-col gap-4 sm:gap-5 pt-4 sm:pt-6 border-t-2 border-dashed border-gray-200">
                <input type="text" placeholder="CÓDIGO DA SALA" value={roomIdInput} onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())} className="w-full bg-emerald-50 border-4 border-emerald-100 p-4 sm:p-5 rounded-[2rem] focus:outline-none focus:border-[#009660] placeholder-emerald-900/30 text-center text-xl sm:text-2xl font-black uppercase text-[#009660] transition-all" />
                <button onClick={handleJoinRoom} className="w-full bg-[#009660] hover:bg-[#00a86b] text-white font-black py-5 sm:py-6 rounded-3xl shadow-[0_8px_0_#006d46] transition-all transform hover:scale-105 active:translate-y-1 active:shadow-[0_4px_0_#006d46] text-xl sm:text-2xl uppercase tracking-tight border-b-2 border-emerald-400/20">Entrar no Jogo 🧩</button>
                <button 
                  onClick={onBack} 
                  className="mt-6 text-emerald-900/40 hover:text-emerald-900 font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 hover:translate-y-[-2px] active:translate-y-0"
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
        <header className="flex flex-col items-center flex-shrink-0 z-10 pt-4 sm:pt-0">
          <div className="flex items-center gap-4 sm:gap-6 mb-4 bg-white px-5 py-2 sm:py-3 rounded-[2rem] shadow-lg border-4 border-emerald-900/10">
            <img src={logoCampina} alt="Seduc" className="h-4 sm:h-8 w-auto object-contain pointer-events-none" />
            <div className="w-px h-4 sm:h-6 bg-gray-200 self-center"></div>
            <img src={logoPrefeitura} alt="Prefeitura" className="h-4 sm:h-8 w-auto object-contain pointer-events-none" />
          </div>
          <div className="absolute top-6 right-6 flex items-center gap-4">
          </div>
          <h1 className="text-3xl sm:text-4xl font-black drop-shadow-lg text-[#FFCE00] uppercase italic tracking-tighter text-center leading-none">
            {isRoomOwner ? "Configure sua Sala!" : "Aguardando amiguinhos..."}
          </h1>
          <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
            <div className="bg-white/10 px-4 py-1 rounded-full border border-white/20">
              <span className="text-xs font-black uppercase tracking-widest">{players.length} / {maxPlayers} JOGADORES</span>
            </div>
          </div>
          {room && !showCreator && (
            <div id="room-code-display" className="mt-4 bg-emerald-950/60 px-6 py-3 rounded-2xl border-4 border-[#FFCE00]/30 flex flex-col items-center gap-1 shadow-[0_10px_40px_rgba(0,0,0,0.3)] transform hover:scale-105 transition-all">
              <span className="text-[10px] sm:text-xs font-black uppercase opacity-60 tracking-[0.2em] text-[#FFCE00]">CÓDIGO DA SALA</span>
              <span className="text-3xl sm:text-5xl font-mono font-black text-white tracking-[0.2em] select-all drop-shadow-lg">{room}</span>
            </div>
          )}
        </header>
        <div className="flex-1 flex flex-col items-center justify-start z-10 w-full overflow-y-auto scrollbar-hide py-6 pb-20 h-full">
          <div className="w-full max-w-lg lg:max-w-4xl flex flex-col items-center gap-6 sm:gap-4">
            {isRoomOwner ? (
              <div className="w-full flex flex-col gap-6">
                <div className="bg-white/10 p-4 rounded-[2rem] border border-white/20 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60 text-center">Capacidade da Sala</p>
                  <div className="flex justify-center gap-4">
                    {[2, 3, 4].map(num => (
                      <button key={num} onClick={() => updateMaxPlayers(num)} className={`w-12 h-12 rounded-full font-black text-xl transition-all shadow-lg border-2 ${maxPlayers === num ? 'bg-[#FFCE00] text-[#009660] border-white scale-110' : 'bg-white/20 text-white border-transparent opacity-60 hover:opacity-100'}`}>{num}</button>
                    ))}
                  </div>
                </div>
                {!initialTheme && (
                  <ThemeSelector
                    selectedTheme={selectedTheme}
                    onSelect={setSelectedTheme}
                    canCreate={canCreateThemes}
                    onOpenCreator={() => {
                      setShowCreator(true);
                      document.body.classList.add('modal-open');
                    }}
                  />
                )}
              </div>
            ) : null}

            {!showCreator && (
              <>
                <div className="w-full max-w-sm flex flex-col gap-5 mt-4">
                  {/* Selected Theme Badge */}
                  {initialTheme && (
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border-2 border-white/10 flex items-center gap-4 animate-in fade-in zoom-in duration-500 shadow-xl">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl shadow-lg shrink-0">
                        {initialTheme.emoji || '🎨'}
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5 leading-none">Tema Ativo</p>
                        <h4 className="text-xl font-black text-[#FFCE00] uppercase italic tracking-tighter truncate">{initialTheme.name}</h4>
                        <p className="text-[10px] font-black text-white/60 truncate">{initialTheme.category?.name || 'GERAL'}</p>
                      </div>
                    </div>
                  )}

                  {players.length >= maxPlayers ? (
                    isRoomOwner && (
                      <button onClick={handleStartGame} className="bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] px-10 py-5 sm:px-12 sm:py-6 rounded-[2rem] sm:rounded-[3rem] font-black text-2xl sm:text-3xl shadow-[0_8px_0_#d1a900] animate-bounce-slow transition-all active:translate-y-1 active:shadow-[0_4px_0_#d1a900] border-b-2 border-white/20 uppercase">JOGAR! 🚀</button>
                    )
                  ) : (
                    <div className="bg-black/20 p-4 sm:p-5 rounded-3xl border border-white/10">
                      <p className="text-white font-black text-sm sm:text-base uppercase tracking-widest animate-pulse italic text-center">Aguardando amiguinhos ({players.length}/{maxPlayers})</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button onClick={leaveRoom} className="w-full bg-white group hover:bg-[#FFCE00] px-6 py-4 rounded-3xl shadow-lg transition-all flex items-center justify-center gap-3 border-b-4 border-gray-200 hover:border-yellow-600 active:translate-y-0.5 active:border-b-0">
                      <span className="text-xl group-hover:scale-125 transition-transform">🏠</span>
                      <span className="text-[#009660] font-black text-base uppercase tracking-tight">Sair da Sala</span>
                    </button>
                    
                    <button onClick={onBack} className="w-full bg-emerald-700/50 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl transition-all border-b-4 border-emerald-900/40 flex items-center justify-center gap-3 active:translate-y-0.5 active:border-b-0">
                      <span className="text-lg">🔄</span>
                      <span className="font-black text-xs uppercase tracking-widest leading-none">Trocar Tema ou Jogo</span>
                    </button>
                  </div>
                </div>

                <div id="avatar-guide-container" className="flex flex-wrap justify-center gap-2 sm:gap-3 w-full mt-4">
                  {players.map((p, i) => (
                    <div key={i} className={`px-4 sm:px-6 py-2 sm:py-3 rounded-[1.5rem] shadow-xl transition-all transform flex items-center gap-3 ${p.id === myId ? 'bg-[#FFCE00] text-[#009660] border-b-4 border-yellow-600' : 'bg-white text-emerald-900 border-b-4 border-gray-200'}`}>
                      <span className="text-lg sm:text-xl">{p.id === myId ? '🎓' : '🎒'}</span>
                      <span className="font-black text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{p.name || `JOGADOR ${i + 1}`}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {showCreator && (
          <ThemeCreator
            onThemeCreated={(newTheme) => {
              setSelectedTheme(newTheme.id);
              setShowCreator(false);
              document.body.classList.remove('modal-open');
              window.dispatchEvent(new CustomEvent('refreshThemes'));
            }}
            onClose={() => {
              setShowCreator(false);
              document.body.classList.remove('modal-open');
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
          <div className="z-10 w-full flex-1 overflow-hidden relative">
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

        <footer className={`${isMyTurn ? 'bg-[#FFCE00] text-[#009660]' : 'bg-white text-emerald-900 opacity-90'} py-3 px-6 sm:px-12 flex justify-between items-center shadow-[0_-10px_50px_rgba(0,0,0,0.1)] z-40 relative border-t-2 sm:border-t-4 border-black/10 ${gameState === 'finished' ? 'blur-md pointer-events-none' : ''} transition-all duration-1000`}>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-5 bg-white px-4 py-2 sm:py-2.5 rounded-2xl shadow-sm border-2 border-emerald-900/5">
              <img src={logoCampina} alt="Seduc" className="h-5 sm:h-7 object-contain pointer-events-none" />
              <div className="w-px h-5 sm:h-6 bg-gray-200 self-center"></div>
              <img src={logoPrefeitura} alt="Prefeitura" className="h-5 sm:h-7 object-contain pointer-events-none" />
            </div>
            <button onClick={() => setIsMuted(SoundService.toggleMute())} className="bg-white hover:bg-emerald-50 text-emerald-900 px-4 py-2 sm:py-2.5 rounded-2xl shadow-sm border-2 border-emerald-900/5 text-xl sm:text-2xl transition-all active:scale-90 flex items-center justify-center">{isMuted ? '🔇' : '🔊'}</button>
          </div>
          <div className="flex flex-col items-center flex-1 mx-2">
            <div className="text-xl sm:text-3xl font-black uppercase tracking-tighter italic leading-none mb-1">{isMyTurn ? "SUA VEZ!" : "ESPERANDO..."}</div>
            {currentTheme && <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-40 leading-none">{currentTheme?.name || 'Dominó'}</div>}
          </div>
          <div className={isMyTurn ? 'opacity-100 flex items-center gap-4 sm:gap-6' : 'invisible pointer-events-none'}>
            {isMyTurn && (
              <div className="flex items-baseline gap-1.5 sm:gap-2 mr-1 sm:mr-2 leading-none">
                <span className="text-[10px] sm:text-xs font-black uppercase italic opacity-40">TEMPO</span>
                <span className={`text-xl sm:text-4xl font-black ${timer <= 10 ? 'text-red-600 animate-pulse' : 'text-[#009660]'}`}>{timer}s</span>
              </div>
            )}
            <button onClick={() => { SoundService.playPass(); passTurn(); }} className={`${timer <= 10 ? 'animate-blink-hard' : 'bg-red-500 shadow-[0_6px_0_#991b1b]'} hover:bg-red-600 text-white font-black px-6 sm:px-10 py-3 sm:py-4 rounded-2xl sm:rounded-3xl transition-all active:translate-y-[4px] active:shadow-none flex items-center gap-2 h-fit transform -translate-y-[3px]`}>
              <span className="text-base sm:text-2xl uppercase tracking-tighter">PASSAR</span><span className="text-xl sm:text-3xl">⏭️</span>
            </button>
          </div>
        </footer>

        <div className={`bg-white/95 p-1.5 sm:p-3 shadow-[0_-10px_60px_rgba(0,0,0,0.05)] relative z-30 border-t border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-2 overflow-visible ${gameState === 'finished' ? 'blur-md translate-y-full' : ''} transition-all duration-1000`}>
          <div className="flex-1 flex justify-start sm:justify-center gap-12 sm:gap-16 overflow-x-auto py-8 sm:py-12 scrollbar-hide w-full max-w-[100vw] sm:max-w-none mx-auto min-h-[160px] sm:min-h-[220px] items-center px-10">
            {myHand.map((piece) => (
              <Piece key={piece.id} piece={piece} draggable={isMyTurn} selected={selectedPiece?.id === piece.id} onDragStart={() => handleDragStart(piece.id)} onClick={() => handlePieceClick(piece)} className={`${!isMyTurn ? 'opacity-30 grayscale scale-100 pointer-events-none' : 'scale-110 sm:scale-140'}`} />
            ))}
          </div>
        </div>

        {sideModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl lg:max-w-4xl max-h-[92vh] rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-black uppercase text-[#009660] text-center p-6">Onde colocar?</h2>
              
              {(() => {
                const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
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
                <p className={`text-2xl sm:text-4xl font-black uppercase italic ${iWon ? 'text-orange-500' : 'text-emerald-700'}`}>🏆 {winnerName}</p>
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
