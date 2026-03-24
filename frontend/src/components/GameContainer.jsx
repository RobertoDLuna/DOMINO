import React, { useState, useEffect } from "react";
import useGame from "../hooks/useGame";
import { socket } from "../services/socket";
import Piece from "./Piece";
import SnakeBoard from "./SnakeBoard";
import AvatarGuide from "./AvatarGuide";

import logoCampina from '../assets/logo-campina.png';
import logoPrefeitura from '../assets/logo-prefeitura.png';

export default function GameContainer() {
  const { 
    room, players, gameState, myHand, board, currentTurn, 
    createRoom, joinRoom, leaveRoom, startGame, makeMove, passTurn, 
    iWon, gameOverMsg, scores 
  } = useGame();
  
  const [roomIdInput, setRoomIdInput] = useState("");
  const [draggingPiece, setDraggingPiece] = useState(null);
  const [myId, setMyId] = useState(socket.id);

  useEffect(() => {
    const checkId = setInterval(() => {
      if (socket.id && socket.id !== myId) setMyId(socket.id);
    }, 500);
    return () => clearInterval(checkId);
  }, [myId]);

  const isMyTurn = currentTurn === myId;

  const handleDragStart = (pieceId) => {
    setDraggingPiece(pieceId);
  };

  const handleDrop = (side) => {
    if (draggingPiece) {
      makeMove(draggingPiece, side);
      setDraggingPiece(null);
    }
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
          <p className="text-xs sm:text-sm text-white/80 font-bold uppercase tracking-[0.3em] bg-black/20 px-4 py-1 rounded-full">Campina Grande • Educação</p>
        </header>
        
        {/* Main Action Area */}
        <div className="flex-1 flex flex-col items-center justify-center z-10 w-full overflow-y-auto scrollbar-hide py-8">
          <div className="w-full max-w-sm flex flex-col items-center gap-8">
            <div className="w-full bg-white/0 sm:bg-white sm:p-12 rounded-[3.5rem] sm:shadow-[0_25px_80px_rgba(0,0,0,0.3)] text-center sm:border-b-[12px] sm:border-emerald-900/10">
              <button 
                onClick={createRoom} 
                className="w-full bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] font-black py-5 sm:py-6 rounded-3xl shadow-[0_8px_0_#d1a900] transition-all transform hover:scale-105 active:scale-95 mb-6 sm:mb-8 text-xl sm:text-2xl uppercase tracking-tight"
              >
                Criar Sala 🏫
              </button>
              
              <div className="flex flex-col gap-4 sm:gap-5">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="CÓDIGO" 
                    value={roomIdInput} 
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())} 
                    className="w-full bg-emerald-50 border-4 border-emerald-100 p-5 sm:p-6 rounded-3xl focus:outline-none focus:border-[#009660] placeholder-emerald-900/30 text-center text-2xl sm:text-3xl font-black uppercase text-[#009660] transition-all" 
                  />
                </div>
                <button 
                  onClick={() => joinRoom(roomIdInput)} 
                  className="w-full bg-[#009660] hover:bg-[#00a86b] text-white font-black py-5 sm:py-6 rounded-3xl shadow-[0_8px_0_#006d46] transition-all transform hover:scale-105 active:scale-95 text-xl sm:text-2xl uppercase tracking-tight border-b-2 border-emerald-400/20"
                >
                  Entrar no Jogo 🧩
                </button>
              </div>
            </div>

            {/* Fluid Avatar - Integrated in flow for mobile */}
            <AvatarGuide gameState="lobby" className="sm:scale-90" />
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
          <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-6 bg-white px-5 py-2 sm:py-3 rounded-[2rem] shadow-lg border-4 border-emerald-900/10">
            <img src={logoCampina} alt="Seduc" className="h-4 sm:h-8 w-auto object-contain pointer-events-none" />
            <div className="w-px h-4 sm:h-6 bg-gray-200 self-center"></div>
            <img src={logoPrefeitura} alt="Prefeitura" className="h-4 sm:h-8 w-auto object-contain pointer-events-none" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black drop-shadow-lg text-[#FFCE00] uppercase italic tracking-tighter text-center">
            Aguardando amiguinhos...
          </h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center z-10 w-full overflow-y-auto scrollbar-hide py-6 h-full">
           <div className="w-full max-w-lg flex flex-col items-center gap-6 sm:gap-8">
              {/* Room Code Card - Adaptive */}
              <div className="w-full max-w-sm bg-white/0 sm:bg-white sm:p-10 rounded-[3rem] sm:shadow-2xl text-center sm:border-b-[10px] sm:border-emerald-900/10">
                <p className="text-xs text-white sm:text-emerald-900/40 mb-3 uppercase tracking-widest font-black leading-none opacity-80">Código da Sala:</p>
                <div className="bg-white/10 sm:bg-emerald-50 p-5 sm:p-6 rounded-3xl border-2 sm:border-4 border-white/20 sm:border-emerald-100 backdrop-blur-sm sm:backdrop-blur-none transition-all">
                   <p className="text-4xl sm:text-5xl font-mono font-black tracking-[0.2em] text-[#FFCE00] sm:text-[#009660] leading-none">{room}</p>
                </div>
              </div>

              {/* Players List */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-5 w-full">
                {players.map((p, i) => (
                  <div key={i} className={`px-5 sm:px-8 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl transition-all transform flex items-center gap-3 ${p.id === myId ? 'bg-[#FFCE00] text-[#009660] border-b-4 sm:border-b-8 border-yellow-600' : 'bg-white text-emerald-900 border-b-4 sm:border-b-8 border-gray-200'}`}>
                    <span className="text-xl sm:text-2xl">{p.id === myId ? '🎓' : '🎒'}</span>
                    <span className="font-black text-sm sm:text-lg truncate max-w-[100px] sm:max-w-[150px]">
                      {p.id === myId ? 'VOCÊ' : `JOGADOR ${i+1}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="w-full max-w-sm flex flex-col gap-4">
                {players.length >= 2 ? (
                    <button 
                      onClick={startGame} 
                      className="bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] px-10 py-5 sm:px-12 sm:py-6 rounded-[2rem] sm:rounded-[3rem] font-black text-2xl sm:text-3xl shadow-[0_8px_0_#d1a900] animate-bounce transition-all active:scale-95 border-b-2 border-white/20 uppercase"
                    >
                      JOGAR! 🚀
                    </button>
                ) : (
                    <div className="bg-black/20 p-4 sm:p-5 rounded-3xl border border-white/10">
                      <p className="text-white font-black text-sm sm:text-base uppercase tracking-widest animate-pulse italic text-center">Aguardando amiguinho...</p>
                    </div>
                )}

                <button 
                  onClick={leaveRoom}
                  className="bg-white group hover:bg-[#FFCE00] px-6 py-3 sm:px-8 sm:py-4 rounded-full shadow-lg transition-all flex items-center justify-center gap-3 border-b-4 border-gray-200 hover:border-yellow-600 active:scale-95"
                >
                  <span className="text-lg sm:text-2xl group-hover:scale-125 transition-transform">🏠</span>
                  <span className="text-[#009660] font-black text-sm sm:text-base uppercase tracking-tight font-sans">Voltar para o início</span>
                </button>
              </div>

              {/* Fluid Avatar - Integrated in flow */}
              <AvatarGuide gameState="waiting" className="mt-4 sm:mt-0" />
           </div>
        </div>
      </div>
    );
  }

  // 3. GAMEPLAY
  if (gameState === "playing") {
    return (
      <div className="h-screen bg-[#F0FDF4] flex flex-col font-sans overflow-hidden select-none relative">
        {/* Play Table */}
        <main className="flex-1 flex flex-col items-center justify-center bg-[#009660] relative px-4 shadow-inner border-b-[10px] sm:border-b-[20px] border-emerald-950/20 overflow-hidden">
           <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none"></div>
           
           {/* Scoreboard */}
           <div className="absolute top-4 sm:top-6 left-0 right-0 flex justify-center gap-3 sm:gap-6 z-40 px-6">
             {players.map((p, idx) => (
                <div key={p.id} className={`flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-1.5 sm:py-3 rounded-[1.5rem] sm:rounded-[2rem] border-b-[4px] sm:border-b-[6px] transition-all duration-500 transform
                  ${currentTurn === p.id 
                    ? 'bg-[#FFCE00] border-yellow-700 text-[#009660] scale-105 sm:scale-110 shadow-[0_10px_30px_rgba(0,0,0,0.3)]' 
                    : 'bg-white/90 border-gray-300 text-emerald-900 opacity-80'}`}>
                  <span className="text-xl sm:text-3xl">{p.id === myId ? '🔥' : '👤'}</span>
                  <div className="flex flex-col leading-none">
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{p.id === myId ? 'Você' : `Competidor`}</span>
                    <span className="text-lg sm:text-2xl font-black">{scores[p.id] || 0} pts</span>
                  </div>
                </div>
             ))}
           </div>

            <div className="z-10 w-full flex-1 overflow-hidden relative">
              <SnakeBoard 
                board={board} 
                isMyTurn={isMyTurn} 
                onDrop={handleDrop} 
                draggingPiece={draggingPiece}
              />
            </div>
        </main>

        {/* Action Bar */}
        <footer className={`${isMyTurn ? 'bg-[#FFCE00] text-[#009660]' : 'bg-white text-emerald-900 opacity-90'} py-3 sm:py-4 px-6 sm:px-12 flex justify-between items-center shadow-[0_-10px_50px_rgba(0,0,0,0.1)] z-40 relative border-t-2 sm:border-t-4 border-black/5`}>
           <div className="hidden sm:flex items-center gap-3 sm:gap-5 bg-white/40 backdrop-blur-sm px-4 py-2 rounded-2xl border border-black/5">
             <img src={logoCampina} alt="Seduc" className="h-5 sm:h-7 object-contain pointer-events-none drop-shadow-sm" />
             <div className="w-px h-5 sm:h-6 bg-black/10 self-center"></div>
             <img src={logoPrefeitura} alt="Prefeitura" className="h-5 sm:h-7 object-contain pointer-events-none drop-shadow-sm" />
           </div>
           <div className="flex flex-col items-center flex-1">
              <div className="text-lg sm:text-2xl font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] brightness-90">
                {isMyTurn ? "🚨 Sua Vez!" : "Esperando..."}
              </div>
           </div>
           
           {isMyTurn && (
             <button onClick={passTurn} className="bg-red-500 hover:bg-red-400 text-white font-black px-6 sm:px-10 py-2 sm:py-4 rounded-[1rem] sm:rounded-[1.5rem] shadow-[0_4px_0_#991b1b] sm:shadow-[0_8px_0_#991b1b] flex items-center gap-2 sm:gap-4 transition-all active:scale-95 active:shadow-none">
               PASSAR ⏭️
             </button>
           )}
        </footer>

        {/* Hand Area & Avatar */}
        <div className="bg-white/95 p-3 sm:p-6 shadow-[0_-10px_60px_rgba(0,0,0,0.05)] relative z-30 border-t border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 flex justify-center gap-3 sm:gap-6 overflow-x-auto py-2 sm:py-4 scrollbar-hide max-w-[95vw] sm:max-w-none mx-auto min-h-[80px]">
              {myHand.map((piece) => (
                <Piece 
                   key={piece.id} 
                   piece={piece} 
                   draggable={isMyTurn}
                   onDragStart={() => handleDragStart(piece.id)}
                   className={`${!isMyTurn ? 'opacity-30 grayscale scale-90 pointer-events-none' : 'hover:-translate-y-6 sm:hover:-translate-y-12 hover:scale-110 shadow-[0_20px_40px_rgba(0,150,96,0.15)] scale-90 sm:scale-100'}`}
                />
              ))}
            </div>

            {/* Avatar - Fluidly integrated next to or below hand */}
            <div className="flex-shrink-0 origin-bottom sm:origin-bottom-right">
              <AvatarGuide gameState="playing" myTurn={isMyTurn} className="!max-w-[180px] sm:!max-w-[300px]" />
            </div>
        </div>
      </div>
    );
  }

  // 4. GAME OVER
  if (gameState === "finished") {
    return (
      <div className={`h-screen flex flex-col items-center justify-center p-4 sm:p-8 transition-all duration-1000 overflow-hidden ${iWon ? 'bg-[#FFCE00]' : 'bg-[#009660]'}`}>
         {iWon && (
           <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="absolute text-5xl animate-bounce" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*3}s` }}>💎</div>
              ))}
              {[...Array(20)].map((_, i) => (
                <div key={i} className="absolute text-5xl animate-pulse" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*2}s` }}>⭐</div>
              ))}
           </div>
         )}

         <div className="scale-75 sm:scale-100 flex flex-col items-center gap-6 sm:gap-8 z-30">
           <section className={`p-8 sm:p-20 rounded-[3.5rem] sm:rounded-[4.5rem] flex flex-col items-center text-center max-w-xl w-full shadow-[0_40px_100px_rgba(0,0,0,0.3)] transform transition-all animate-in zoom-in duration-700 border-[10px] sm:border-[16px] backdrop-blur-md ${iWon ? 'bg-white border-[#FFCE00]' : 'bg-white border-white/20'}`}>
              <h1 className="text-xl sm:text-3xl font-black mb-4 sm:mb-6 uppercase tracking-widest text-[#009660] opacity-50">Fim de Jogo</h1>
              
              <h2 className={`text-6xl sm:text-8xl font-black mb-6 sm:mb-8 uppercase italic tracking-tighter leading-none ${iWon ? 'text-[#009660]' : 'text-red-500'}`}>
                 {iWon ? 'VITÓRIA!' : 'FOI QUASE!'}
              </h2>
              
              <div className={`text-xl sm:text-2xl font-black mb-8 sm:mb-12 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-inner ${iWon ? 'bg-emerald-50 text-[#009660]' : 'bg-red-50 text-red-900'}`}>
                 {gameOverMsg}
              </div>
   
              <button 
                 onClick={leaveRoom}
                 className={`w-full group font-black px-12 py-6 sm:px-16 sm:py-8 rounded-[2.5rem] sm:rounded-[3rem] text-3xl sm:text-4xl transition-all transform hover:scale-105 active:scale-95 shadow-2xl flex items-center justify-center gap-4 sm:gap-6 ${iWon ? 'bg-[#009660] text-white shadow-[#009660]/30' : 'bg-[#FFCE00] text-[#009660] shadow-[#FFCE00]/30'}`}
              >
                 <span className="group-hover:rotate-12 transition-transform">🏠</span> NOVO JOGO
              </button>

              <div className="flex items-center justify-center gap-6 sm:gap-8 mt-8 sm:mt-12 pt-6 sm:pt-8 w-full border-t-4 border-dashed border-gray-200/50">
                 <img src={logoCampina} alt="Seduc" className="h-8 sm:h-12 w-auto object-contain pointer-events-none drop-shadow-sm" />
                 <img src={logoPrefeitura} alt="Prefeitura" className="h-8 sm:h-12 w-auto object-contain pointer-events-none drop-shadow-sm" />
              </div>
           </section>


           <AvatarGuide gameState="finished" isWinner={iWon} />
         </div>
      </div>
    );
  }

  return null;
}
