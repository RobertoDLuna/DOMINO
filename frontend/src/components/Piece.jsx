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

  const baseStyles = `bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-b-8 flex transition-all items-center justify-center overflow-hidden flex-shrink-0`;
  const orientationStyles = horizontal ? 'flex-row w-[120px] h-[60px]' : 'flex-col w-[60px] h-[120px]';
  const selectedStyles = selected
    ? 'border-[#FFCE00] border-b-8 scale-110 -translate-y-4 ring-4 ring-[#FFCE00] ring-offset-2 shadow-[0_20px_40px_rgba(255,206,0,0.5)] z-50'
    : 'border-gray-200';
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
