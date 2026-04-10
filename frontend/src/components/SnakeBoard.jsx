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
  MARGIN: 20 
};

/**
 * Calculates the optimal number of pieces per row based on container width.
 * This is the core of Option A - adaptive layout.
 */
function calcMaxPerRow(containerWidth, H_W, GAP, MARGIN) {
  const pieceSlot = H_W + GAP;
  // Fit as many horizontal pieces as possible with comfortable margins
  const maxFit = Math.floor((containerWidth - MARGIN * 2) / pieceSlot);
  // Clamp between 3 (mobile min) and 8 (desktop max)
  return Math.max(3, Math.min(8, maxFit));
}

/**
 * SnakeBoard component handles the adaptive "snake" layout for the dominoes.
 */
export default function SnakeBoard({ board, isMyTurn, onDrop, draggingPiece }) {
  const containerRef = React.useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Métrica padronizada para todas as peças para garantir consistência visual no board vs a mão
  const metrics = {
    H_W: 140,
    H_H: 66,
    V_W: 66,
    V_H: 140, 
    GAP: 6,   
    MARGIN: 32 
  };
  
  const { H_W, H_H, V_W, V_H, GAP, MARGIN } = metrics;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Dynamically calculate maxPerRow based on actual container width
  const maxPerRow = calcMaxPerRow(containerSize.width, H_W, GAP, MARGIN);

  // ----------------------------------------------------------------
  // 1. DETERMINISTIC ITEM LIST
  // ----------------------------------------------------------------
  const layoutItems = board.length === 0 
    ? [{ type: 'drop', side: 'left', label: 'COMEÇAR ✨' }]
    : [
        { type: 'drop', side: 'left', label: 'Cá' },
        ...board.map(p => ({ type: 'piece', ...p })),
        { type: 'drop', side: 'right', label: 'Lá' }
      ];

  const positions = [];
  
  let mode = 'RIGHT'; // 'RIGHT', 'LEFT', 'DOWN'
  let nextMode = 'LEFT';
  let col = 0;
  
  // Axes for perfect alignment
  let rowAxisY = MARGIN + V_H / 2;
  let colAxisX = 0; 
  
  // Cursors for placing the next piece in the current axis
  let cursorX = MARGIN;
  let cursorY = 0;
  
  let downCount = 0;

  // Center start for empty board
  if (board.length === 0) {
    cursorX = (containerSize.width / 2) - (H_W / 2);
  }

  layoutItems.forEach((item, index) => {
    const isPiece = item.type === 'piece';
    const isDouble = isPiece && String(item.ladoA) === String(item.ladoB);
    
    // Determine dimensions based on mode and piece type
    let horizontal = false;
    if (mode === 'RIGHT' || mode === 'LEFT') {
      horizontal = !isDouble; // In rows, double is vertical
    } else {
      horizontal = isDouble;  // In columns, double is horizontal
    }
    
    const w = horizontal ? H_W : V_W;
    const h = horizontal ? H_H : V_H;

    let posX = 0;
    let posY = 0;

    if (mode === 'RIGHT') {
      posX = cursorX;
      posY = rowAxisY - h / 2;
      
      positions.push({ ...item, posX, posY, w, h, horizontal, reverse: false, isActive: isMyTurn });
      
      col++;
      cursorX += w + GAP;
      
      const nextItem = layoutItems[index + 1];
      const nextIsDouble = nextItem && nextItem.type === 'piece' && String(nextItem.ladoA) === String(nextItem.ladoB);
      
      if (col >= maxPerRow - 1 && (!nextIsDouble || col >= maxPerRow + 1) && index < layoutItems.length - 1) {
        mode = 'DOWN';
        nextMode = 'LEFT';
        if (isDouble) {
          colAxisX = posX + V_W / 2; 
        } else {
          colAxisX = posX + H_W - V_W / 2; 
        }
        cursorY = posY + h + GAP;
        downCount = 0;
      }
    } 
    else if (mode === 'LEFT') {
      posX = cursorX - w;
      posY = rowAxisY - h / 2;
      
      positions.push({ ...item, posX, posY, w, h, horizontal, reverse: true, isActive: isMyTurn });
      
      col++;
      cursorX -= (w + GAP);
      
      const nextItem = layoutItems[index + 1];
      const nextIsDouble = nextItem && nextItem.type === 'piece' && String(nextItem.ladoA) === String(nextItem.ladoB);
      
      if (col >= maxPerRow - 1 && (!nextIsDouble || col >= maxPerRow + 1) && index < layoutItems.length - 1) {
        mode = 'DOWN';
        nextMode = 'RIGHT';
        if (isDouble) {
          colAxisX = posX + V_W / 2; 
        } else {
          colAxisX = posX + V_W / 2; 
        }
        cursorY = posY + h + GAP;
        downCount = 0;
      }
    }
    else if (mode === 'DOWN') {
      posX = colAxisX - w / 2;
      posY = cursorY;
      
      positions.push({ ...item, posX, posY, w, h, horizontal, reverse: false, isActive: isMyTurn });
      
      downCount++;
      cursorY += h + GAP;
      
      if (downCount >= 1 && index < layoutItems.length - 1) {
        mode = nextMode;
        col = 0;
        
        const firstRowItem = layoutItems[index + 1];
        const isFirstRowItemDouble = firstRowItem && firstRowItem.type === 'piece' && String(firstRowItem.ladoA) === String(firstRowItem.ladoB);
        
        rowAxisY = cursorY + (isFirstRowItemDouble ? V_H / 2 : H_H / 2);
        
        if (nextMode === 'LEFT') {
          if (isDouble) {
             cursorX = colAxisX;
          } else {
             cursorX = colAxisX + V_W / 2;
          }
        } else {
          if (isDouble) {
             cursorX = colAxisX;
          } else {
             cursorX = colAxisX - V_W / 2;
          }
        }
      }
    }
  });

  // Calculate final bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  positions.forEach(pos => {
    const pw = pos.horizontal ? H_W : V_W;
    const ph = pos.horizontal ? H_H : V_H;
    minX = Math.min(minX, pos.posX);
    maxX = Math.max(maxX, pos.posX + pw);
    minY = Math.min(minY, pos.posY);
    maxY = Math.max(maxY, pos.posY + ph);
  });

  const contentW = (maxX - minX) + MARGIN * 2;
  const contentH = (maxY - minY) + MARGIN * 2;

  const logicalWidth = Math.max(contentW, containerSize.width);
  const logicalHeight = Math.max(contentH, containerSize.height);

  // Center the bounding box within the logical container
  const offsetX = (logicalWidth / 2) - ((minX + maxX) / 2);
  const offsetY = (logicalHeight / 2) - ((minY + maxY) / 2);
  
  positions.forEach(pos => {
    pos.posX += offsetX;
    pos.posY += offsetY;
  });

  // "Smart-fit scale": ajusta o conteúdo dentro do viewport visível com um respiro generoso de 64px
  const scaleX = (containerSize.width - 64) / logicalWidth;
  const scaleY = (containerSize.height - 64) / logicalHeight;
  const boardScale = Math.min(scaleX, scaleY, 1.0); 

  return (
    <div ref={containerRef} className="w-full h-full relative flex justify-center items-center">
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
          {positions.filter(p => p.type === 'piece').map((pos, i, arr) => {
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
                w={pos.w}
                h={pos.h}
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
              width={pos.w}
              height={pos.h}
              className="hover:z-50 shadow-2xl"
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}
