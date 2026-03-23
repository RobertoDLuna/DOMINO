import React, { useState, useEffect } from "react";
import useGame from "./hooks/useGame";
import { GameProvider } from "./context/GameContext";
import { socket } from "./services/socket";

function Piece({ piece, draggable, onDragStart, horizontal = false, className = "" }) {
  return (
    <div 
      draggable={draggable}
      onDragStart={onDragStart}
      className={`bg-white rounded-xl shadow-lg border-2 border-gray-300 flex 
                 ${horizontal ? 'flex-row w-32 h-16' : 'flex-col w-16 h-32'} 
                 ${draggable ? 'cursor-grab active:cursor-grabbing hover:border-yellow-400 hover:shadow-2xl' : 'cursor-default'} 
                 transition-all items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
    >
      <div className="flex-1 flex items-center justify-center text-4xl select-none w-full h-full text-center">
        {piece.ladoA}
      </div>
      <div className={`${horizontal ? 'h-full w-px' : 'w-full h-px'} bg-gray-200`}></div>
      <div className="flex-1 flex items-center justify-center text-4xl select-none w-full h-full text-center">
        {piece.ladoB}
      </div>
    </div>
  );
}

function DropZone({ onDrop, side, label }) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(side); }}
      className={`w-16 h-32 border-4 border-dashed rounded-2xl flex items-center justify-center transition-all
                 ${isOver ? 'border-yellow-400 bg-yellow-400/20 scale-105' : 'border-white/20 bg-white/5'} 
                 text-white font-black text-[10px] uppercase text-center p-1 mx-2 flex-shrink-0`}
    >
      <span className="rotate-90">{label}</span>
    </div>
  );
}

function GameContainer() {
  const { 
    room, players, gameState, myHand, board, currentTurn, 
    createRoom, joinRoom, startGame, makeMove, passTurn, 
    iWon, gameOverMsg 
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

  // 1. TELA INICIAL
  if (gameState === "lobby" && !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-indigo-700 text-white font-sans p-4">
        <h1 className="text-5xl font-black mb-12 drop-shadow-2xl text-center tracking-tighter italic">DOMINÓ KIDS 🐯</h1>
        <div className="backdrop-blur-xl bg-white/10 p-10 rounded-[2.5rem] border border-white/20 shadow-2xl w-full max-w-sm text-center">
          <button onClick={createRoom} className="w-full bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black py-5 rounded-2xl shadow-xl transition-all transform hover:scale-105 mb-6 text-2xl border-b-4 border-yellow-600">CRIAR SALA ✨</button>
          <div className="flex flex-col gap-4">
            <input type="text" placeholder="Código..." value={roomIdInput} onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())} className="w-full bg-white/10 border-2 border-white/20 p-5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-yellow-400 placeholder-white/50 text-center text-2xl font-mono uppercase text-white font-black" />
            <button onClick={() => joinRoom(roomIdInput)} className="w-full bg-green-500 hover:bg-green-400 text-white font-black py-5 rounded-2xl shadow-xl transition-all transform hover:scale-105 text-2xl border-b-4 border-green-700">ENTRAR 🧩</button>
          </div>
          <p className="mt-4 text-[10px] text-white/20 truncate">ID: {myId || '?'}</p>
        </div>
      </div>
    );
  }

  // 2. TELA ESPERA
  if (room && gameState === "lobby") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-900 text-white p-6 text-center">
        <h1 className="text-3xl font-bold mb-4 animate-pulse">Aguardando...</h1>
        <div className="bg-white/10 p-10 rounded-[2rem] border-2 border-white/10 mb-10 w-full max-w-xs shadow-2xl">
          <p className="text-xs text-blue-300 mb-2 uppercase tracking-widest font-bold">Código da Sala:</p>
          <p className="text-5xl font-mono font-black tracking-[0.2em] text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">{room}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {players.map((p, i) => (
            <div key={i} className={`px-8 py-4 rounded-3xl border-2 flex items-center gap-3 shadow-lg ${p.id === myId ? 'bg-yellow-400 border-yellow-500 text-blue-900' : 'bg-white/5 border-white/10 text-white'}`}>
              <span className="text-2xl">{p.id === myId ? '🔥' : '👤'}</span>
              <span className="font-black">J{i+1} {p.id === myId ? '(Você)' : ''}</span>
            </div>
          ))}
        </div>
        {players.length >= 2 && <button onClick={startGame} className="bg-orange-500 hover:bg-orange-400 px-16 py-6 rounded-3xl font-black text-3xl shadow-2xl animate-bounce border-b-8 border-orange-800">JOGAR! 🚀</button>}
      </div>
    );
  }

  // 3. JOGO
  if (gameState === "playing") {
    return (
      <div className="min-h-screen bg-green-800 flex flex-col font-sans overflow-hidden select-none">
        
        <div className="flex-1 flex flex-col items-center justify-center bg-green-900 overflow-hidden relative">
           <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
           <div className="w-full h-full flex items-center justify-center overflow-x-auto p-12 scrollbar-hide z-10">
              <div className="flex items-center min-w-max">
                 {isMyTurn && <DropZone side="left" label="Cá" onDrop={handleDrop} />}
                 
                 <div className="flex bg-black/20 p-6 rounded-[2rem] border-4 border-dashed border-white/5 items-center shadow-inner">
                   {board.length === 0 ? (
                     <div className="p-10 text-center animate-pulse">
                        <p className="text-white/20 text-3xl font-black uppercase italic">Tabuleiro Vazio</p>
                     </div>
                   ) : (
                     board.map((p, idx) => (
                        <Piece key={idx} piece={p} horizontal={true} className="mx-0.5 shadow-md" />
                     ))
                   )}
                 </div>

                 {isMyTurn && <DropZone side="right" label="Lá" onDrop={handleDrop} />}
              </div>
           </div>
        </div>

        <div className={`${isMyTurn ? 'bg-yellow-400 text-blue-900' : 'bg-black text-white/40'} py-5 px-10 flex justify-between items-center shadow-[0_-15px_50px_rgba(0,0,0,0.5)] z-20 relative`}>
           <div className="font-black italic text-2xl tracking-tighter">🐯 OK!</div>
           <div className="flex flex-col items-center flex-1">
              <div className="text-xl font-black uppercase tracking-[0.2em] mb-1">
                {isMyTurn ? "🚨 SUA VEZ!" : "ESPERANDO..."}
              </div>
           </div>
           
           {isMyTurn && (
             <button onClick={passTurn} className="bg-red-600 hover:bg-red-500 text-white font-black px-8 py-3 rounded-2xl shadow-xl flex items-center gap-3 border-b-4 border-red-900">
               PASSAR ⏭️
             </button>
           )}
        </div>

        <div className="bg-indigo-950/95 p-8 pb-16 border-t-2 border-white/5 shadow-2xl relative z-20">
            <div className="flex justify-center gap-4 overflow-x-auto py-4 scrollbar-hide">
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

  // 4. FIM DE JOGO
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

         <div className={`backdrop-blur-2xl p-16 rounded-[4rem] border-8 flex flex-col items-center text-center max-w-lg w-full shadow-2xl transform transition-all animate-in zoom-in duration-500 ${iWon ? 'bg-white border-yellow-300 shadow-yellow-600/30' : 'bg-black/40 border-white/10 shadow-black'}`}>
            <div className={`text-[12rem] mb-12 drop-shadow-2xl ${iWon ? 'animate-bounce' : 'grayscale opacity-70'}`}>
               {iWon ? '🏆' : '😿'}
            </div>
            
            <h2 className={`text-7xl font-black mb-4 uppercase italic tracking-tighter leading-none ${iWon ? 'text-blue-900' : 'text-white'}`}>
               {iWon ? 'VOCÊ VENCEU!' : 'NÃO FOI DESTA VEZ...'}
            </h2>
            
            <div className={`text-xl font-bold mb-12 p-6 rounded-3xl ${iWon ? 'bg-yellow-50 text-yellow-800' : 'bg-white/5 text-white/50'}`}>
               {gameOverMsg}
            </div>

            <button 
               onClick={() => window.location.reload()}
               className={`font-black px-16 py-8 rounded-[2rem] text-3xl transition-all transform hover:scale-110 active:scale-95 shadow-2xl ${iWon ? 'bg-blue-600 text-white' : 'bg-white text-black'}`}
            >
               NOVO JOGO 🏠
            </button>
         </div>
      </div>
    );
  }

  return null;
}

function App() {
  return (
    <GameProvider>
       <GameContainer />
    </GameProvider>
  );
}

export default App;
