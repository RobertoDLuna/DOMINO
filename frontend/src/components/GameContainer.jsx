import React, { useState, useEffect } from "react";
import useGame from "../hooks/useGame";
import { socket } from "../services/socket";
import Piece from "./Piece";
import SnakeBoard from "./SnakeBoard";

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-indigo-700 text-white font-sans p-4">
        <header className="flex flex-col items-center mb-12">
          <span className="text-8xl mb-4">🐯</span>
          <h1 className="text-5xl font-black drop-shadow-2xl text-center tracking-tighter italic uppercase">DOMINÓ KIDS</h1>
        </header>
        
        <div className="backdrop-blur-xl bg-white/10 p-10 rounded-[2.5rem] border border-white/20 shadow-2xl w-full max-w-sm text-center">
          <button 
            onClick={createRoom} 
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black py-5 rounded-2xl shadow-xl transition-all transform hover:scale-105 mb-6 text-2xl border-b-4 border-yellow-600"
          >
            CRIAR SALA ✨
          </button>
          
          <div className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Código..." 
              value={roomIdInput} 
              onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())} 
              className="w-full bg-white/10 border-2 border-white/20 p-5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-yellow-400 placeholder-white/50 text-center text-2xl font-mono uppercase text-white font-black" 
            />
            <button 
              onClick={() => joinRoom(roomIdInput)} 
              className="w-full bg-green-500 hover:bg-green-400 text-white font-black py-5 rounded-2xl shadow-xl transition-all transform hover:scale-105 text-2xl border-b-4 border-green-700"
            >
              ENTRAR 🧩
            </button>
          </div>
          <p className="mt-4 text-[10px] text-white/20 truncate italic">Seu ID: {myId || 'Conectando...'}</p>
        </div>
      </div>
    );
  }

  // 2. ROOM WAIT SCREEN
  if (room && gameState === "lobby") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-900 text-white p-6 text-center">
        <h1 className="text-3xl font-bold mb-4 animate-pulse">Aguardando adversário...</h1>
        
        <div className="bg-white/10 p-10 rounded-[2rem] border-2 border-white/10 mb-10 w-full max-w-xs shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-yellow-400/5 group-hover:bg-yellow-400/10 transition-colors"></div>
          <p className="text-xs text-blue-300 mb-2 uppercase tracking-widest font-bold z-10 relative">Código da Sala:</p>
          <p className="text-5xl font-mono font-black tracking-[0.2em] text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] z-10 relative">{room}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {players.map((p, i) => (
            <div key={i} className={`px-8 py-4 rounded-3xl border-2 flex items-center gap-3 shadow-lg transition-transform hover:scale-105 ${p.id === myId ? 'bg-yellow-400 border-yellow-500 text-blue-900' : 'bg-white/5 border-white/10 text-white'}`}>
              <span className="text-2xl">{p.id === myId ? '🔥' : '👤'}</span>
              <span className="font-black truncate max-w-[120px]">
                {p.id === myId ? 'Você' : `J${i+1}`}
              </span>
            </div>
          ))}
        </div>

        {players.length >= 2 ? (
            <button 
              onClick={startGame} 
              className="bg-orange-500 hover:bg-orange-400 px-16 py-6 rounded-[2.5rem] font-black text-3xl shadow-[0_15px_60px_rgba(249,115,22,0.4)] animate-bounce border-b-8 border-orange-800 transition-all active:scale-95"
            >
              JOGAR! 🚀
            </button>
        ) : (
            <div className="text-white/40 italic font-bold mb-8 text-xl">Aguardando adversário... ⏳</div>
        )}

        {/* Botão de Voltar Redesenhado para Crianças */}
        <button 
          onClick={leaveRoom}
          className="mt-12 bg-white/10 hover:bg-white/20 px-8 py-4 rounded-3xl border-2 border-white/10 flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group shadow-xl"
        >
          <span className="text-3xl bg-white/10 p-2 rounded-2xl group-hover:bg-white/20 transition-colors">🏠</span>
          <span className="text-xl font-black text-white leading-none uppercase tracking-tight">Voltar para o início</span>
        </button>
      </div>
    );
  }

  // 3. GAMEPLAY
  if (gameState === "playing") {
    return (
      <div className="min-h-screen bg-green-800 flex flex-col font-sans overflow-hidden select-none">
        {/* Play Table */}
        <main className="flex-1 flex flex-col items-center bg-green-900 overflow-y-auto relative py-12 px-4 scrollbar-hide">
           <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] fixed pointer-events-none"></div>
           
           {/* Scoreboard */}
           <div className="fixed top-4 left-0 right-0 flex justify-center gap-4 z-40 px-4">
             {players.map((p, idx) => (
                <div key={p.id} className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all 
                  ${currentTurn === p.id ? 'bg-yellow-400 border-yellow-500 text-blue-900 scale-110 shadow-lg' : 'bg-black/40 border-white/10 text-white/70'}`}>
                  <span className="text-xl">{p.id === myId ? '🔥' : '👤'}</span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">{p.id === myId ? 'Você' : `J${idx+1}`}</span>
                    <span className="text-lg font-black leading-none">{scores[p.id] || 0} pts</span>
                  </div>
                </div>
             ))}
           </div>

           <div className="z-10 w-full max-w-5xl flex justify-center mt-12 mb-32">
             <SnakeBoard 
               board={board} 
               isMyTurn={isMyTurn} 
               onDrop={handleDrop} 
               draggingPiece={draggingPiece}
             />
           </div>
        </main>

        {/* Action Bar */}
        <footer className={`${isMyTurn ? 'bg-yellow-400 text-blue-900' : 'bg-black text-white/40'} py-5 px-10 flex justify-between items-center shadow-[0_-15px_50px_rgba(0,0,0,0.5)] z-30 relative`}>
           <div className="font-black italic text-2xl tracking-tighter">🐯 OK!</div>
           <div className="flex flex-col items-center flex-1">
              <div className="text-xl font-black uppercase tracking-[0.2em] mb-1">
                {isMyTurn ? "🚨 SUA VEZ!" : "ESPERANDO..."}
              </div>
           </div>
           
           {isMyTurn && (
             <button onClick={passTurn} className="bg-red-600 hover:bg-red-500 text-white font-black px-8 py-3 rounded-2xl shadow-xl flex items-center gap-3 border-b-4 border-red-900 transition-transform active:scale-95">
               PASSAR ⏭️
             </button>
           )}
        </footer>

        {/* Hand Area */}
        <div className="bg-indigo-950/95 p-8 pb-16 border-t-2 border-white/5 shadow-2xl relative z-30">
            <div className="flex justify-center gap-4 overflow-x-auto py-4 scrollbar-hide max-w-[95vw] mx-auto">
              {myHand.map((piece) => (
                <Piece 
                   key={piece.id} 
                   piece={piece} 
                   draggable={isMyTurn}
                   onDragStart={() => handleDragStart(piece.id)}
                   className={`${!isMyTurn ? 'opacity-20 grayscale scale-90' : 'hover:-translate-y-8 hover:scale-110 hover:rotate-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'}`}
                />
              ))}
            </div>
        </div>
      </div>
    );
  }

  // 4. GAME OVER
  if (gameState === "finished") {
    return (
      <div className={`min-h-screen flex items-center justify-center p-8 transition-all duration-1000 ${iWon ? 'bg-yellow-400' : 'bg-indigo-950'}`}>
         {iWon && (
           <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="absolute text-4xl animate-bounce" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*2}s` }}>💎</div>
              ))}
              {[...Array(20)].map((_, i) => (
                <div key={i} className="absolute text-4xl animate-pulse" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*2}s` }}>✨</div>
              ))}
           </div>
         )}

         <section className={`backdrop-blur-2xl p-16 rounded-[4rem] border-8 flex flex-col items-center text-center max-w-lg w-full shadow-2xl transform transition-all animate-in zoom-in duration-500 ${iWon ? 'bg-white border-yellow-300 shadow-yellow-600/30' : 'bg-black/40 border-white/10 shadow-black'}`}>
            <div className={`text-[12rem] mb-12 drop-shadow-2xl ${iWon ? 'animate-bounce' : 'grayscale opacity-70'}`}>
               {iWon ? '🏆' : '😿'}
            </div>
            
            <h2 className={`text-7xl font-black mb-4 uppercase italic tracking-tighter leading-none ${iWon ? 'text-blue-900' : 'text-white'}`}>
               {iWon ? 'VOCÊ VENCEU!' : 'NÃO FOI DESTA VEZ...'}
            </h2>
            
            <div className={`text-xl font-bold mb-8 p-6 rounded-3xl ${iWon ? 'bg-yellow-50 text-yellow-800' : 'bg-white/5 text-white/50'}`}>
               {gameOverMsg}
            </div>

            <div className="mb-12 w-full flex justify-center gap-4">
               {players.map((p, i) => (
                  <div key={p.id} className={`p-4 rounded-2xl border-2 ${p.id === myId ? 'bg-blue-500 border-blue-400 text-white' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                     <p className="text-[10px] uppercase font-bold tracking-tighter opacity-70">J{i+1}</p>
                     <p className="text-2xl font-black truncate max-w-[80px]">{scores[p.id] || 0} pts</p>
                  </div>
               ))}
            </div>

            <button 
               onClick={leaveRoom}
               className={`font-black px-16 py-8 rounded-[2rem] text-3xl transition-all transform hover:scale-110 active:scale-95 shadow-2xl ${iWon ? 'bg-blue-600 text-white' : 'bg-white text-black'}`}
            >
               NOVO JOGO 🏠
            </button>
         </section>
      </div>
    );
  }

  return null;
}
