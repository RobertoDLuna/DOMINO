import React, { useState, useEffect } from "react";
import useGame from "../hooks/useGame";
import { socket } from "../services/socket";
import Piece from "./Piece";
import SnakeBoard from "./SnakeBoard";
import AvatarGuide from "./AvatarGuide";
import ThemeSelector from "./ThemeSelector";
import SoundService from "../services/SoundService";

import logoCampina from '../assets/logo-campina.png';
import logoPrefeitura from '../assets/logo-prefeitura.png';

export default function GameContainer() {
  const { 
    room, players, gameState, myHand, board, currentTurn, 
    createRoom, joinRoom, leaveRoom, startGame, makeMove, passTurn, forceEndGame, updateMaxPlayers,
    iWon, gameOverMsg, scores, currentTheme, maxPlayers, myId, isConnected
  } = useGame();
  
  const [roomIdInput, setRoomIdInput] = useState("");
  const [playerNameInput, setPlayerNameInput] = useState(() => localStorage.getItem('dominoPlayerName') || "");
  const [draggingPiece, setDraggingPiece] = useState(null);

  const handleNameChange = (e) => {
    const val = e.target.value.substring(0, 10);
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
    createRoom(getFinalName());
  };

  const handleJoinRoom = () => {
    joinRoom(roomIdInput, getFinalName());
  };
  const [selectedTheme, setSelectedTheme] = useState('animais');
  const [timer, setTimer] = useState(30);
  const [showAvatar, setShowAvatar] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [sideModal, setSideModal] = useState(null);
  const [isMuted, setIsMuted] = useState(() => SoundService.muted);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const isMyTurn = currentTurn === myId;
  const isRoomOwner = players.length > 0 && players[0].id === myId;

  // Auto-pass timer
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

  // Avatar inactivity delay (3s)
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

  // Sound triggers
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

  // Click-to-place logic
  const handlePieceClick = (piece) => {
    if (!isMyTurn) return;

    // Deselect on second click
    if (selectedPiece?.id === piece.id) {
      setSelectedPiece(null);
      return;
    }

    // First click on empty board: place directly
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
      // Fits both sides - show modal
      setSelectedPiece(piece);
      setSideModal({ pieceId: piece.id, leftEnd, rightEnd });
    } else if (fitsLeft) {
      makeMove(piece.id, 'left');
      setSelectedPiece(null);
    } else if (fitsRight) {
      makeMove(piece.id, 'right');
      setSelectedPiece(null);
    } else {
      // Piece doesn't fit: just highlight it briefly
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
        {/* Background Decorative Circles */}
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-[#FFCE00]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>

        {/* Content Header */}
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
        
        {/* Main Action Area */}
        <div className="flex-1 flex flex-col items-center justify-center z-10 w-full overflow-y-auto scrollbar-hide py-8">
          <div className="w-full max-w-sm flex flex-col items-center gap-8">
            <div className="w-full bg-white/0 sm:bg-white sm:p-12 rounded-[3.5rem] sm:shadow-[0_25px_80px_rgba(0,0,0,0.3)] text-center sm:border-b-[12px] sm:border-emerald-900/10">
              
              <div className="mb-6 sm:mb-8">
                <input 
                  type="text" 
                  placeholder="SEU NOME" 
                  value={playerNameInput} 
                  onChange={handleNameChange} 
                  className="w-full bg-emerald-50 border-4 border-emerald-100 p-4 sm:p-5 rounded-[2rem] focus:outline-none focus:border-[#009660] placeholder-emerald-900/30 text-center text-xl sm:text-2xl font-black uppercase text-[#009660] transition-all" 
                />
              </div>

              <button 
                onClick={handleCreateRoom} 
                className="w-full bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] font-black py-5 sm:py-6 rounded-3xl shadow-[0_8px_0_#d1a900] transition-all transform hover:scale-105 active:scale-95 mb-6 sm:mb-8 text-xl sm:text-2xl uppercase tracking-tight"
              >
                Criar Sala 🏫
              </button>
              
              <div className="flex flex-col gap-4 sm:gap-5 pt-4 sm:pt-6 border-t-2 border-dashed border-gray-200">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="CÓDIGO DA SALA" 
                    value={roomIdInput} 
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())} 
                    className="w-full bg-emerald-50 border-4 border-emerald-100 p-4 sm:p-5 rounded-[2rem] focus:outline-none focus:border-[#009660] placeholder-emerald-900/30 text-center text-xl sm:text-2xl font-black uppercase text-[#009660] transition-all" 
                  />
                </div>
                <button 
                  onClick={handleJoinRoom} 
                  className="w-full bg-[#009660] hover:bg-[#00a86b] text-white font-black py-5 sm:py-6 rounded-3xl shadow-[0_8px_0_#006d46] transition-all transform hover:scale-105 active:scale-95 text-xl sm:text-2xl uppercase tracking-tight border-b-2 border-emerald-400/20"
                >
                  Entrar no Jogo 🧩
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
          <h1 className="text-3xl sm:text-4xl font-black drop-shadow-lg text-[#FFCE00] uppercase italic tracking-tighter text-center leading-none">
            {isRoomOwner ? "Configure sua Sala!" : "Aguardando amiguinhos..."}
          </h1>
          <div className="mt-2 bg-white/10 px-4 py-1 rounded-full border border-white/20">
            <span className="text-xs font-black uppercase tracking-widest">{players.length} / {maxPlayers} JOGADORES</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-start z-10 w-full overflow-y-auto scrollbar-hide py-6 h-full">
           <div className="w-full max-w-lg flex flex-col items-center gap-6 sm:gap-4">
              
              {/* Theme Selector for Owner */}
              {isRoomOwner ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Players Count Selector */}
                  <div className="bg-white/10 p-4 rounded-[2rem] border border-white/20 backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60 text-center">Capacidade da Sala</p>
                    <div className="flex justify-center gap-4">
                      {[2, 3, 4].map(num => (
                        <button
                          key={num}
                          onClick={() => updateMaxPlayers(num)}
                          className={`w-12 h-12 rounded-full font-black text-xl transition-all shadow-lg border-2 ${maxPlayers === num ? 'bg-[#FFCE00] text-[#009660] border-white scale-110' : 'bg-white/20 text-white border-transparent opacity-60 hover:opacity-100'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <ThemeSelector selectedTheme={selectedTheme} onSelect={setSelectedTheme} />
                </div>
              ) : (
                /* Room Code Card - Adaptive */
                <div className="w-full max-w-sm bg-white/20 p-8 rounded-[3rem] shadow-2xl text-center border-2 border-white/30 backdrop-blur-sm">
                  <p className="text-xs text-white/60 mb-3 uppercase tracking-widest font-black leading-none opacity-80">Código da Sala:</p>
                  <div className="bg-emerald-50/10 p-5 rounded-3xl border-2 border-white/20">
                    <p className="text-4xl sm:text-5xl font-mono font-black tracking-[0.2em] text-[#FFCE00] leading-none">{room}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full max-w-sm flex flex-col gap-4 mt-6">
                {players.length >= maxPlayers ? (
                  isRoomOwner && (
                    <button 
                      onClick={handleStartGame} 
                      className="bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] px-10 py-5 sm:px-12 sm:py-6 rounded-[2rem] sm:rounded-[3rem] font-black text-2xl sm:text-3xl shadow-[0_8px_0_#d1a900] animate-bounce-slow transition-all active:scale-95 border-b-2 border-white/20 uppercase"
                    >
                      JOGAR! 🚀
                    </button>
                  )
                ) : (
                    <div className="bg-black/20 p-4 sm:p-5 rounded-3xl border border-white/10">
                      <p className="text-white font-black text-sm sm:text-base uppercase tracking-widest animate-pulse italic text-center">Aguardando amiguinhos ({players.length}/{maxPlayers})</p>
                    </div>
                )}

                {/* Info about Room Code if owner */}
                {isRoomOwner && (
                  <div className="bg-emerald-950/20 p-3 rounded-2xl border border-white/10 flex items-center justify-center gap-4">
                    <span className="text-xs font-black uppercase opacity-60">Sala:</span>
                    <span className="text-xl font-mono font-black text-[#FFCE00] tracking-widest">{room}</span>
                  </div>
                )}

                <button 
                  onClick={leaveRoom}
                  className="bg-white/90 group hover:bg-[#FFCE00] px-6 py-3 sm:py-4 rounded-full shadow-lg transition-all flex items-center justify-center gap-3 border-b-4 border-gray-200 hover:border-yellow-600 active:scale-95"
                >
                  <span className="text-lg sm:text-2xl group-hover:scale-125 transition-transform">🏠</span>
                  <span className="text-[#009660] font-black text-sm sm:text-base uppercase tracking-tight font-sans">Sair da Sala</span>
                </button>
              </div>

              {/* Players List */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 w-full mt-4">
                {players.map((p, i) => (
                  <div key={i} className={`px-4 sm:px-6 py-2 sm:py-3 rounded-[1.5rem] shadow-xl transition-all transform flex items-center gap-3 ${p.id === myId ? 'bg-[#FFCE00] text-[#009660] border-b-4 border-yellow-600' : 'bg-white text-emerald-900 border-b-4 border-gray-200'}`}>
                    <span className="text-lg sm:text-xl">{p.id === myId ? '🎓' : '🎒'}</span>
                    <span className="font-black text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">
                      {p.name || `JOGADOR ${i+1}`}
                    </span>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (gameState === "playing" || gameState === "finished") {
    return (
      <div className="h-screen bg-[#F0FDF4] flex flex-col font-sans overflow-hidden select-none relative">
        {/* Play Table */}
        <main className="flex-1 flex flex-col items-center justify-center bg-[#009660] relative px-4 shadow-inner border-b-[10px] sm:border-b-[20px] border-emerald-950/20 overflow-hidden">
           <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none"></div>
           
           {/* Scoreboard - Responsive for up to 4 players (Vertically Stacked) */}
           <div className="absolute top-4 sm:top-6 left-4 sm:left-6 flex flex-col items-start gap-2 sm:gap-3 z-40">
             {players.map((p, idx) => (
                <div key={p.id} className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 rounded-[1.2rem] sm:rounded-[1.5rem] border-b-[3px] sm:border-b-[5px] transition-all duration-500 transform
                  ${currentTurn === p.id 
                    ? 'bg-[#FFCE00] border-yellow-700 text-[#009660] scale-105 shadow-[0_8px_25px_rgba(0,0,0,0.2)]' 
                    : 'bg-white/90 border-gray-300 text-emerald-900 opacity-80 shadow-md'}
                  ${players.length > 2 ? 'scale-90 sm:scale-100' : ''}`}>
                  <span className="text-base sm:text-2xl">{p.id === myId ? '🔥' : ['👤', '🎒', '🎓', '🎒'][idx % 4]}</span>
                  <div className="flex flex-col leading-none">
                    <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-60">{p.name || `Competidor ${idx + 1}`}</span>
                    <span className="text-sm sm:text-xl font-black">{scores[p.id] || 0} pts</span>
                  </div>
                </div>
              ))}
           </div>

            <div className="z-10 w-full flex-1 overflow-hidden relative">
              <SnakeBoard 
                board={board} 
                isMyTurn={isMyTurn} 
                draggingPiece={draggingPiece}
                onDrop={handleDrop}
               />
             </div>
        </main>

        {/* Top Floating Exit Button */}
        {gameState === 'playing' && (
          <div className="fixed top-4 right-4 z-[60]">
            <button 
              onClick={() => setShowEndConfirm(true)}
              className="bg-red-500 hover:bg-red-600 text-white font-black px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-[0_4px_0_#991b1b] active:scale-95 active:shadow-none transition-all flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider"
            >
              <span>X</span>
              <span className="hidden sm:inline">Finalizar Partida</span>
            </button>
          </div>
        )}

        {/* Action Bar */}
        <footer className={`${isMyTurn ? 'bg-[#FFCE00] text-[#009660]' : 'bg-white text-emerald-900 opacity-90'} py-3 px-6 sm:px-12 flex justify-between items-center shadow-[0_-10px_50px_rgba(0,0,0,0.1)] z-40 relative border-t-2 sm:border-t-4 border-black/10`}>
           {/* Left Section: Logos & Sound */}
           <div className="flex items-center gap-3 sm:gap-6">
             <div className="flex items-center gap-3 sm:gap-5 bg-white px-4 py-2 sm:py-2.5 rounded-2xl shadow-sm border-2 border-emerald-900/5">
               <img src={logoCampina} alt="Seduc" className="h-5 sm:h-7 object-contain pointer-events-none" />
               <div className="w-px h-5 sm:h-6 bg-gray-200 self-center"></div>
               <img src={logoPrefeitura} alt="Prefeitura" className="h-5 sm:h-7 object-contain pointer-events-none" />
             </div>
             
             {/* Mute button - More visible */}
             <button
               onClick={() => setIsMuted(SoundService.toggleMute())}
               title={isMuted ? 'Ativar sons' : 'Silenciar sons'}
               className="bg-white hover:bg-emerald-50 text-emerald-900 px-4 py-2 sm:py-2.5 rounded-2xl shadow-sm border-2 border-emerald-900/5 text-xl sm:text-2xl transition-all active:scale-90 flex items-center justify-center"
             >
               {isMuted ? '🔇' : '🔊'}
             </button>
           </div>
           
           {/* Center Section: Status */}
           <div className="flex flex-col items-center flex-1 mx-2">
              <div className="text-xl sm:text-3xl font-black uppercase tracking-tighter sm:tracking-tighter italic leading-none mb-1">
                {isMyTurn ? "SUA VEZ!" : "ESPERANDO..."}
              </div>
              {currentTheme && (
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-40 leading-none">
                  {currentTheme?.name || 'Dominó'}
                </div>
              )}
           </div>

           {/* Right Section: Timer & Action */}
           <div className={isMyTurn ? 'opacity-100 flex items-center gap-4 sm:gap-6' : 'invisible pointer-events-none'}>
              {isMyTurn && (
                <div className="flex items-baseline gap-1.5 sm:gap-2 mr-1 sm:mr-2 leading-none">
                  <span className="text-[10px] sm:text-xs font-black uppercase italic opacity-40">TEMPO</span>
                  <span className={`text-xl sm:text-4xl font-black ${timer <= 10 ? 'text-red-600 animate-pulse' : 'text-[#009660]'}`}>
                    {timer}s
                  </span>
                </div>
              )}
              <button 
                onClick={() => { SoundService.playPass(); passTurn(); }} 
                className={`${timer <= 10 ? 'animate-blink-hard' : 'bg-red-500'} hover:bg-red-400 text-white font-black px-6 sm:px-10 py-3 sm:py-4 rounded-2xl sm:rounded-3xl transition-all active:scale-95 flex items-center gap-2 h-fit`}
              >
                <span className="text-base sm:text-2xl uppercase tracking-tighter">PASSAR</span>
                <span className="text-xl sm:text-3xl">⏭️</span>
              </button>
           </div>
        </footer>


        {/* Hand Area & Avatar */}
        <div className="bg-white/95 p-1.5 sm:p-3 shadow-[0_-10px_60px_rgba(0,0,0,0.05)] relative z-30 border-t border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-2 overflow-visible">
            <div className="flex-1 flex justify-center gap-4 sm:gap-8 overflow-x-auto py-4 sm:py-8 scrollbar-hide max-w-[95vw] sm:max-w-none mx-auto min-h-[100px] items-center">
              {myHand.map((piece) => (
                <Piece 
                   key={piece.id} 
                   piece={piece} 
                   draggable={isMyTurn}
                   selected={selectedPiece?.id === piece.id}
                   onDragStart={() => handleDragStart(piece.id)}
                   onClick={() => handlePieceClick(piece)}
                   className={`${!isMyTurn ? 'opacity-30 grayscale scale-100 pointer-events-none' : 'scale-110 sm:scale-140'}`}
                />
              ))}
            </div>
        </div>

        {/* Game Over Overlay */}
        {gameState === "finished" && (
          <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-8 backdrop-blur-sm transition-all duration-1000 ${iWon ? 'bg-[#FFCE00]/40' : 'bg-[#009660]/40'}`}>
            <section className={`p-6 sm:p-10 rounded-[3rem] flex flex-col items-center text-center max-w-lg w-full shadow-[0_40px_100px_rgba(0,0,0,0.4)] transform transition-all animate-in zoom-in duration-700 border-[10px] sm:border-[12px] bg-white ${iWon ? 'border-[#FFCE00]' : 'border-[#009660]'}`}>
                  <h1 className="text-base sm:text-xl font-black mb-1 sm:mb-2 uppercase tracking-widest text-[#009660] opacity-50">Fim de Jogo</h1>
                  
                  <h2 className={`whitespace-nowrap font-black mb-3 sm:mb-5 uppercase italic tracking-tighter leading-none ${iWon ? 'text-5xl sm:text-7xl text-[#009660]' : 'text-4xl sm:text-6xl text-red-500'}`}>
                    {iWon ? 'VITÓRIA!' : 'FOI QUASE!'}
                  </h2>
                  
                  <div className={`text-base sm:text-lg font-black mb-6 sm:mb-8 p-4 rounded-[1.5rem] shadow-inner ${iWon ? 'bg-emerald-50 text-[#009660]' : 'bg-red-50 text-red-900'}`}>
                    {gameOverMsg}
                  </div>
        
                  <button 
                    onClick={leaveRoom}
                    className={`w-full group font-black px-10 py-5 sm:px-12 sm:py-6 rounded-[2rem] text-2xl sm:text-3xl transition-all transform hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center gap-4 ${iWon ? 'bg-[#009660] text-white shadow-[#009660]/30' : 'bg-[#FFCE00] text-[#009660] shadow-[#FFCE00]/30'}`}
                  >
                    <span className="group-hover:rotate-12 transition-transform">🏠</span> NOVO JOGO
                  </button>

                  <div className="flex items-center justify-center gap-6 mt-8 pt-6 w-full border-t-4 border-dashed border-gray-100">
                    <img src={logoCampina} alt="Seduc" className="h-6 sm:h-10 object-contain pointer-events-none" />
                    <img src={logoPrefeitura} alt="Prefeitura" className="h-6 sm:h-10 object-contain pointer-events-none" />
                  </div>
            </section>
          </div>
        )}

        {/* Side Choice Modal */}
        {sideModal && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center backdrop-blur-sm bg-black/40" onClick={() => { setSideModal(null); setSelectedPiece(null); }}>
            <div className="bg-white rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.5)] p-6 sm:p-10 flex flex-col items-center gap-6 border-8 border-[#FFCE00] max-w-[320px] w-full mx-4" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-black uppercase text-[#009660] text-center">Onde colocar?</h2>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest text-center">A peça encaixa nos dois lados!</p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => handleSideChoice('left')}
                  className="flex-1 bg-[#009660] hover:bg-[#00a86b] text-white font-black py-5 rounded-2xl shadow-[0_6px_0_#006d46] text-xl transition-all active:scale-95 flex flex-col items-center gap-1"
                >
                  <span className="text-3xl">⬅️</span>
                  <span>AQUI</span>
                  <span className="text-3xl drop-shadow-sm mt-1">{sideModal.leftEnd}</span>
                </button>
                <button
                  onClick={() => handleSideChoice('right')}
                  className="flex-1 bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] font-black py-5 rounded-2xl shadow-[0_6px_0_#d1a900] text-xl transition-all active:scale-95 flex flex-col items-center gap-1"
                >
                  <span className="text-3xl">➡️</span>
                  <span>ALI</span>
                  <span className="text-3xl drop-shadow-sm mt-1">{sideModal.rightEnd}</span>
                </button>
              </div>
              <button onClick={() => { setSideModal(null); setSelectedPiece(null); }} className="text-gray-400 text-xs uppercase font-bold tracking-widest hover:text-red-400 transition-colors">Cancelar</button>
            </div>
          </div>
        )}

        {/* Global Floating Avatar */}
        <div className={`fixed top-24 right-4 sm:top-28 sm:right-8 z-[100] transition-all duration-700 transform ${showAvatar ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
          <AvatarGuide gameState={gameState} myTurn={isMyTurn} isWinner={iWon} className="!max-w-[120px] sm:!max-w-[180px] drop-shadow-2xl" />
        </div>

        {/* Global Modals */}
        {showEndConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEndConfirm(false)}></div>
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl border-4 border-red-500 animate-in zoom-in-95 duration-200">
              <div className="text-4xl mb-4 text-center">🛑</div>
              <h2 className="text-2xl font-black text-center text-gray-800 mb-2 italic">ENCERRAR JOGO?</h2>
              <p className="text-gray-600 text-center font-bold mb-8">Tem certeza que deseja fechar a sala para todos os jogadores?</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { forceEndGame(); setShowEndConfirm(false); }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl shadow-[0_6px_0_#991b1b] active:scale-95 active:shadow-none transition-all uppercase tracking-wider"
                >
                  Sim, encerrar tudo
                </button>
                <button 
                  onClick={() => setShowEndConfirm(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-wider"
                >
                  Voltar ao jogo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. FALLBACK / LOADING
  return (
    <div className="h-screen bg-[#009660] flex items-center justify-center text-white p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black uppercase tracking-widest opacity-80">Sincronizando partida...</p>
        <button onClick={leaveRoom} className="mt-4 underline opacity-50 text-xs">Voltar para o início</button>
      </div>
    </div>
  );
}
