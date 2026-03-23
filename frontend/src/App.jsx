import React, { useState, useEffect } from "react";
import useGame from "./hooks/useGame";
import { GameProvider } from "./context/GameContext";
import { socket } from "./services/socket";

function Piece({ piece, draggable, onDragStart, horizontal = false, reverse = false, className = "", style = {} }) {
  const iconA = reverse ? piece.ladoB : piece.ladoA;
  const iconB = reverse ? piece.ladoA : piece.ladoB;

  return (
    <div 
      draggable={draggable}
      onDragStart={onDragStart}
      style={style}
      className={`bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-b-8 border-gray-200 flex 
                 ${horizontal ? 'flex-row w-[120px] h-[60px]' : 'flex-col w-[60px] h-[120px]'} 
                 ${draggable ? 'cursor-grab active:cursor-grabbing hover:scale-105 hover:-translate-y-1' : 'cursor-default'} 
                 transition-all items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
    >
      <div className={`flex-1 flex items-center justify-center ${horizontal ? 'text-5xl' : 'text-4xl'} select-none w-full h-full text-center`}>
        {iconA}
      </div>
      <div className={`${horizontal ? 'h-[80%] w-0.5' : 'w-[80%] h-0.5'} bg-gray-100/50 rounded-full`}></div>
      <div className={`flex-1 flex items-center justify-center ${horizontal ? 'text-5xl' : 'text-4xl'} select-none w-full h-full text-center`}>
        {iconB}
      </div>
    </div>
  );
}

function DropZone({ onDrop, side, label, matchIcon, horizontal = false }) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(side); }}
      className={`relative group rounded-2xl flex items-center justify-center transition-all duration-300
                 ${horizontal ? 'w-[120px] h-[60px]' : 'w-[60px] h-[120px]'}
                 ${isOver ? 'bg-yellow-400 scale-110 shadow-[0_0_40px_rgba(250,204,21,0.6)]' : 'bg-white/5 border-4 border-dashed border-white/20'} 
                 text-white font-black text-center overflow-hidden flex-shrink-0 mx-2`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
      <div className="absolute inset-0 animate-pulse bg-white/5 pointer-events-none"></div>
      
      <div className="flex flex-col items-center justify-center z-10 gap-1">
        {matchIcon && <span className="text-2xl drop-shadow-md animate-bounce">{matchIcon}</span>}
        <span className={`text-[11px] font-black uppercase tracking-tighter drop-shadow-md brightness-150 ${horizontal ? '' : 'rotate-90'}`}>
          {label === 'Cá' ? 'AQUI' : label === 'Lá' ? 'ALÍ' : label}
        </span>
      </div>

      <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-white/20"></div>
      <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-white/20"></div>
    </div>
  );
}

function SnakeBoard({ board, isMyTurn, onDrop, draggingPiece }) {
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const H_W = 120;
  const H_H = 68; // +8 for the border-b
  const V_W = 60;
  const V_H = 128;
  const GAP = 32; // Maior espaçamento para clareza

  const items = board.length === 0 
    ? (isMyTurn ? [{ type: 'drop', side: 'left', label: 'COMEÇAR ✨' }] : [])
    : [
        ...(isMyTurn ? [{ type: 'drop', side: 'left', label: 'Cá' }] : []),
        ...board.map(p => ({ type: 'piece', ...p })),
        ...(isMyTurn ? [{ type: 'drop', side: 'right', label: 'Lá' }] : [])
      ];

  const positions = [];
  let x = 0;
  let y = 0;
  let direction = 1; 
  let col = 0;
  
  const margin = 60;
  const availableWidth = Math.max(containerWidth - margin * 2, 400);
  const maxPerRow = Math.floor(availableWidth / (H_W + GAP));

  if (board.length === 0 && items.length > 0) {
     x = (maxPerRow * (H_W + GAP)) / 2 - H_W / 2;
     y = 60;
  }

  items.forEach((item, index) => {
    const isAtEnd = (direction === 1 && col >= maxPerRow - 1) || (direction === -1 && col <= 0);
    // Só vira vertical se houver mais itens e não estiver na mesa vazia
    const isVertical = isAtEnd && index < items.length - 1 && board.length > 0;

    positions.push({
      ...item,
      posX: x,
      posY: y,
      horizontal: !isVertical,
      reverse: direction === -1
    });

    if (isVertical) {
      y += V_H + GAP;
      direction *= -1;
    } else if (board.length > 0) {
      x += direction * (H_W + GAP);
      col += direction;
    }
  });

  const totalHeight = Math.max(y + V_H + margin, 500);

  return (
    <div className="relative transition-all duration-700 mx-auto" style={{ height: totalHeight, width: (maxPerRow * (H_W + GAP)) }}>
      
      {/* Mensagem de Fundo Premium */}
      {board.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none -translate-y-12">
           <div className="text-[12rem] mb-4">🧩</div>
           <p className="text-white text-5xl font-black uppercase italic tracking-widest text-center leading-tight">
             Mesa Vazia<br/><span className="text-2xl opacity-50">Arraste a primeira peça para o meio!</span>
           </p>
        </div>
      )}

      {/* Linha do Caminho (Path) para ajudar as crianças */}
      {board.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
          {positions.map((pos, i) => {
            if (i === 0) return null;
            const prev = positions[i-1];
            return (
              <line 
                key={`path-${i}`}
                x1={prev.posX + (prev.horizontal ? H_W/2 : V_W/2)}
                y1={prev.posY + (prev.horizontal ? H_H/2 : V_H/2)}
                x2={pos.posX + (pos.horizontal ? H_W/2 : V_W/2)}
                y2={pos.posY + (pos.horizontal ? H_H/2 : V_H/2)}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="1, 20"
                className="animate-[dash_10s_linear_infinite]"
              />
            );
          })}
        </svg>
      )}

      {positions.map((pos, idx) => {
        const style = {
          position: 'absolute',
          left: pos.posX,
          top: pos.posY,
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: pos.type === 'drop' ? 5 : 10
        };

        if (pos.type === 'drop') {
          const matchIcon = board.length === 0 ? null : (pos.side === 'left' ? board[0]?.ladoA : board[board.length - 1]?.ladoB);
          
          return (
            <div key={`drop-${pos.side}`} style={style}>
              <DropZone 
                side={pos.side} 
                label={pos.label} 
                onDrop={onDrop} 
                matchIcon={matchIcon}
                horizontal={pos.horizontal || board.length === 0}
              />
            </div>
          );
        }

        return (
          <div key={pos.id || idx} style={style}>
            <Piece 
              piece={pos} 
              horizontal={pos.horizontal} 
              reverse={pos.reverse}
              className={`${draggingPiece === pos.id ? 'opacity-30 scale-90' : 'hover:z-50'}`}
            />
          </div>
        );
      })}

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -200; }
        }
      `}</style>
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
        
        <div className="flex-1 flex flex-col items-center bg-green-900 overflow-y-auto relative py-12 px-4 scrollbar-hide">
           <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] fixed pointer-events-none"></div>
           
           <div className="z-10 w-full max-w-5xl flex justify-center">
             <SnakeBoard 
               board={board} 
               isMyTurn={isMyTurn} 
               onDrop={handleDrop} 
               draggingPiece={draggingPiece}
             />
           </div>
        </div>

        <div className={`${isMyTurn ? 'bg-yellow-400 text-blue-900' : 'bg-black text-white/40'} py-5 px-10 flex justify-between items-center shadow-[0_-15px_50px_rgba(0,0,0,0.5)] z-30 relative`}>
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

        <div className="bg-indigo-950/95 p-8 pb-16 border-t-2 border-white/5 shadow-2xl relative z-30">
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
