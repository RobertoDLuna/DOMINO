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
  
  const maxPerRow = 6; // FIXED Logical Grid to guarantee predictability
  const boardFullWidth = (maxPerRow * (H_W + GAP)) + (MARGIN * 2);

  // Center start position on empty table
  if (board.length === 0 && items.length > 0) {
     x = (maxPerRow * (H_W + GAP)) / 2 - H_W / 2;
     y = 60;
  }

  // Layout calculation
  items.forEach((item, index) => {
    // Only actual pieces can be doubles! DropZones have undefined ladoA/ladoB.
    const isDouble = item.type === 'piece' && item.ladoA === item.ladoB;
    const isAtEnd = (direction === 1 && col >= maxPerRow - 1) || (direction === -1 && col <= 0);
    
    // Determine orientation: 
    // - Vertical turn pieces (isVertical) are ALWAYS vertical.
    // - Doubles in horizontal rows are vertical (T-shape).
    const isVerticalPiece = (isAtEnd && index < items.length - 1 && board.length > 0) || (isDouble && board.length > 0);
    
    // Calculate precise width/height based on orientation
    const pieceWidth = isVerticalPiece ? V_W : H_W;
    const pieceHeight = isVerticalPiece ? V_H : H_H;
    
    // When moving left, x marks the right-most bounding edge for the next piece.
    let posX = x;
    if (direction === -1 && board.length > 0) {
       posX = x - pieceWidth;
    }

    // Docking adjustment for Doubles (centers them on the row)
    const yOffset = (isDouble && !isAtEnd && board.length > 0) ? (H_H - V_H) / 2 : 0;
    
    positions.push({
      ...item,
      posX: posX,
      posY: y + yOffset,
      horizontal: !isVerticalPiece,
      reverse: direction === -1
    });

    if (isAtEnd && index < items.length - 1 && board.length > 0) {
      // Transition Vertical
      y += V_H + GAP;
      direction *= -1;
      
      // Update x for the new row's anchor
      // The anchor must be on the 'inner' side of the U-turn block
      if (direction === -1) {
         x = posX - GAP;
      } else {
         x = posX + pieceWidth + GAP;
      }
    } else if (board.length > 0) {
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
