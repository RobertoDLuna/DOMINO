import React, { useState, useEffect } from "react";
import Piece from "./Piece";
import DropZone from "./DropZone";

// Design constants
const METRICS = {
  H_W: 120,
  H_H: 68,
  V_W: 60,
  V_H: 128, 
  GAP: 4,   
  MARGIN: 40 
};

/**
 * SnakeBoard component handles the adaptive "snake" layout for the dominoes.
 */
export default function SnakeBoard({ board, isMyTurn, onDrop, draggingPiece }) {
  const containerRef = React.useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        // Debounce or directly set state to track exact pixel space
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { H_W, H_H, V_W, V_H, GAP, MARGIN } = METRICS;

  // ----------------------------------------------------------------
  // 1. DETERMINISTIC ITEM LIST
  // We ALWAYS include placeholders for DropZones to maintain grid indices.
  // ----------------------------------------------------------------
  const layoutItems = board.length === 0 
    ? [{ type: 'drop', side: 'left', label: 'COMEÇAR ✨' }]
    : [
        { type: 'drop', side: 'left', label: 'Cá' },
        ...board.map(p => ({ type: 'piece', ...p })),
        { type: 'drop', side: 'right', label: 'Lá' }
      ];

  const positions = [];
  let x = 0;
  let y = 0;
  let direction = 1; // 1 = Left to Right, -1 = Right to Left
  let col = 0;
  
  const maxPerRow = 6; 

  // Center start position on empty table
  if (board.length === 0) {
      x = (maxPerRow * (H_W + GAP)) / 2 - H_W / 2;
      y = 60;
  }

  // ----------------------------------------------------------------
  // 2. LAYOUT CALCULATION (Grid-based Snake)
  // ----------------------------------------------------------------
  layoutItems.forEach((item, index) => {
    const isPiece = item.type === 'piece';
    const isDouble = isPiece && item.ladoA === item.ladoB;
    const isAtEnd = (direction === 1 && col >= maxPerRow - 1) || (direction === -1 && col <= 0);
    
    // Transition pieces (Turns) are horizontal OR vertical based on position
    const isVerticalPiece = (isAtEnd && index < layoutItems.length - 1 && board.length > 0) || (isDouble && board.length > 0);
    
    const pieceWidth = isVerticalPiece ? V_W : H_W;
    const pieceHeight = isVerticalPiece ? V_H : H_H;
    
    let posX = x;
    if (direction === -1 && board.length > 0) {
        posX = x - pieceWidth;
    }

    const yOffset = (isDouble && !isAtEnd && board.length > 0) ? (H_H - V_H) / 2 : 0;
    
    // Always add to positions to maintain deterministic grid
    positions.push({
      ...item,
      posX: posX,
      posY: y + yOffset,
      horizontal: !isVerticalPiece,
      reverse: direction === -1,
      isActive: isMyTurn // Global turn state
    });

    // Logic for the NEXT item in the grid
    if (isAtEnd && index < layoutItems.length - 1 && board.length > 0) {
      // Transition to next row! Attach to the BOTTOM of the U-turn piece.
      // U-turn top is y + yOffset. Its bottom is y + yOffset + pieceHeight.
      // So next row y is exactly the bottom plus GAP.
      y = y + yOffset + pieceHeight + GAP;
      direction *= -1;
      
      if (direction === -1) {
         // Next piece is horizontal, moves Left.
         // Its right edge should align with the right edge of the U-turn.
         // U-turn right edge is posX + pieceWidth.
         // So x (the cursor for right edge) becomes posX + pieceWidth.
         x = posX + pieceWidth;
      } else {
         // Next piece moves Right. Its left edge aligns with left edge of U-turn.
         x = posX;
      }
    } else if (board.length > 0 || (board.length === 0 && index < layoutItems.length - 1)) {
      if (direction === 1) {
         x += pieceWidth + GAP;
      } else {
         x -= (pieceWidth + GAP);
      }
      col += direction;
    }
  });

  // ----------------------------------------------------------------
  // Bounding Box Calculation
  // ----------------------------------------------------------------
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  if (positions.length > 0) {
    positions.forEach(pos => {
      const pieceWidth = pos.horizontal ? H_W : V_W;
      const pieceHeight = pos.horizontal ? H_H : V_H;
      
      minX = Math.min(minX, pos.posX);
      maxX = Math.max(maxX, pos.posX + pieceWidth);
      minY = Math.min(minY, pos.posY);
      maxY = Math.max(maxY, pos.posY + pieceHeight);
    });
  } else {
    minX = 0; maxX = boardFullWidth;
    minY = 0; maxY = 400;
  }

  const bbWidth = maxX - minX;
  const bbHeight = maxY - minY;

  // The new logical container dimensions (with strict safety margins)
  const logicalWidth = bbWidth + (MARGIN * 2);
  const logicalHeight = Math.max(bbHeight + (MARGIN * 2), 400);

  // Shift all pieces so the top-left extreme is EXACTLY at MARGIN
  const offsetX = MARGIN - minX;
  const offsetY = MARGIN - minY;

  positions.forEach(pos => {
    pos.posX += offsetX;
    pos.posY += offsetY;
  });

  // Viewport Zoom Calculation (Camera effect)
  // Fit logical bounding box into available screen space perfectly
  const scaleX = containerSize.width / logicalWidth;
  const scaleY = containerSize.height / logicalHeight;
  const boardScale = Math.min(scaleX, scaleY, 1); // Never blow up piece size > 1x

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden flex justify-center items-center">
      <div 
        className="relative transition-all duration-700 ease-in-out" 
        style={{ 
          width: logicalWidth,
          height: logicalHeight,
          transform: `scale(${boardScale})`,
          transformOrigin: 'center center'
        }}
      >
      {/* Empty board background */}
      {board.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none">
           <div className="text-[8rem] mb-4">🧩</div>
           <p className="text-white text-3xl font-black uppercase italic tracking-widest text-center leading-tight">
             Mesa Vazia<br/><span className="text-lg opacity-50 lowercase font-sans">Arraste a primeira peça para o meio!</span>
           </p>
        </div>
      )}

      {/* Visual Path (Dashed Line) */}
      {board.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none opacity-10 w-full h-full">
          {positions.filter(p => !p.type).map((pos, i, arr) => {
            if (i === 0) return null;
            const prev = arr[i-1];
            return (
              <line 
                key={`path-${i}`}
                x1={prev.posX + (prev.horizontal ? H_W/2 : V_W/2)}
                y1={prev.posY + (prev.horizontal ? H_H/2 : V_H/2)}
                x2={pos.posX + (pos.horizontal ? H_W/2 : V_W/2)}
                y2={pos.posY + (pos.horizontal ? H_H/2 : V_H/2)}
                stroke="white"
                strokeWidth="4"
                strokeDasharray="8, 12"
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
                active={pos.isActive}
              />
            </div>
          );
        }

        return (
          <div key={`${pos.id}-${idx}`} style={itemStyle}>
            <Piece 
              piece={pos} 
              horizontal={pos.horizontal} 
              reverse={pos.reverse}
              className={`${draggingPiece === pos.id ? 'opacity-30 scale-90' : 'hover:z-50 shadow-2xl'}`}
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}
