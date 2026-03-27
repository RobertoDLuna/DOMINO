import React from "react";

export default function Piece({ 
  piece, 
  draggable, 
  onDragStart, 
  onClick,
  selected = false,
  horizontal = false, 
  reverse = false, 
  className = "", 
  style = {} 
}) {
  const iconA = reverse ? piece.ladoB : piece.ladoA;
  const iconB = reverse ? piece.ladoA : piece.ladoB;

  // Design tokens para maior clareza e manutenção
  const baseStyles = `relative flex transition-all items-center justify-center overflow-hidden flex-shrink-0 rounded-xl border-b-8 bg-gradient-to-br from-white to-gray-50 shadow-[0_8px_20px_rgba(0,0,0,0.15)]`;
  
  const orientationStyles = horizontal 
    ? 'flex-row w-[120px] h-[60px]' 
    : 'flex-col w-[60px] h-[120px]';

  const selectedStyles = selected
    ? 'border-[#FFCE00] scale-110 -translate-y-2 ring-4 ring-[#FFCE00] ring-offset-2 shadow-[0_20px_40px_rgba(255,206,0,0.4)] z-50'
    : 'border-gray-300';

  const interactivityStyles = (draggable || onClick) 
    ? 'cursor-pointer active:scale-95' 
    : 'cursor-default';
  
  return (
    <div 
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      style={style}
      className={`${baseStyles} ${orientationStyles} ${selectedStyles} ${interactivityStyles} ${className}`}
    >
      {/* Lado A */}
      <div className={`flex-1 flex items-center justify-center ${horizontal ? 'text-5xl' : 'text-4xl'} select-none w-full h-full text-center text-slate-800`}>
        {iconA}
      </div>

      {/* Divisória Central 'Groove' */}
      <div className={`relative flex items-center justify-center ${horizontal ? 'h-[80%] w-0.5' : 'w-[80%] h-0.5'} bg-gray-300 shadow-inner`}>
        {/* Ponto central detalhado (estético) */}
        <div className="absolute w-1.5 h-1.5 bg-gray-400 rounded-full shadow-sm"></div>
      </div>

      {/* Lado B */}
      <div className={`flex-1 flex items-center justify-center ${horizontal ? 'text-5xl' : 'text-4xl'} select-none w-full h-full text-center text-slate-800`}>
        {iconB}
      </div>

      {/* Brilho sutil no topo para efeito 3D */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-white/50 pointer-events-none"></div>
    </div>
  );
}
