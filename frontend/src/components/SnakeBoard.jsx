import React, { useState, useEffect } from "react";
import Piece from "./Piece";
import DropZone from "./DropZone";

// Design constants
const METRICS = {
  H_W: 120,
  H_H: 68,
  V_W: 60,
  V_H: 128,
  GAP: 32,
  MARGIN: 60
};

/**
 * SnakeBoard component handles the adaptive "snake" layout for the dominoes.
 */
export default function SnakeBoard({ board, isMyTurn, onDrop, draggingPiece }) {
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { H_W, H_H, V_W, V_H, GAP, MARGIN } = METRICS;

  // Build items list (drops + pieces + drops)
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
  let direction = 1; // 1 = Left to Right, -1 = Right to Left
  let col = 0;
  
  const availableWidth = Math.max(containerWidth - MARGIN * 2, 400);
  const maxPerRow = Math.floor(availableWidth / (H_W + GAP));

  // Center start position on empty table
  if (board.length === 0 && items.length > 0) {
     x = (maxPerRow * (H_W + GAP)) / 2 - H_W / 2;
     y = 60;
  }

  // Layout calculation
  items.forEach((item, index) => {
    const isAtEnd = (direction === 1 && col >= maxPerRow - 1) || (direction === -1 && col <= 0);
    // Vertical transition happens if we're at the end and there are more items to draw
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

  const totalHeight = Math.max(y + V_H + MARGIN, 500);

  return (
    <div 
      className="relative transition-all duration-700 mx-auto" 
      style={{ height: totalHeight, width: (maxPerRow * (H_W + GAP)) }}
    >
      {/* Empty board background */}
      {board.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none -translate-y-12">
           <div className="text-[12rem] mb-4">🧩</div>
           <p className="text-white text-5xl font-black uppercase italic tracking-widest text-center leading-tight">
             Mesa Vazia<br/><span className="text-2xl opacity-50">Arraste a primeira peça para o meio!</span>
           </p>
        </div>
      )}

      {/* Path line helper */}
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
        const itemStyle = {
          position: 'absolute',
          left: pos.posX,
          top: pos.posY,
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: pos.type === 'drop' ? 5 : 10
        };

        if (pos.type === 'drop') {
          const matchIcon = board.length === 0 ? null : (pos.side === 'left' ? board[0]?.ladoA : board[board.length - 1]?.ladoB);
          
          return (
            <div key={`drop-${pos.side}`} style={itemStyle}>
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
          <div key={pos.id || idx} style={itemStyle}>
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
