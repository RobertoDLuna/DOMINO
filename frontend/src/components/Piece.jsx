import React from "react";

/**
 * Piece component for the Dominoes game.
 * 
 * @param {Object} props
 * @param {Object} props.piece - Piece data (ladoA, ladoB, id)
 * @param {boolean} props.draggable - Whether the piece can be dragged
 * @param {function} props.onDragStart - Drag start handler
 * @param {boolean} props.horizontal - Orientation
 * @param {boolean} props.reverse - Whether to swap ladoA and ladoB visuals
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 */
export default function Piece({ 
  piece, 
  draggable, 
  onDragStart, 
  horizontal = false, 
  reverse = false, 
  className = "", 
  style = {} 
}) {
  const iconA = reverse ? piece.ladoB : piece.ladoA;
  const iconB = reverse ? piece.ladoA : piece.ladoB;

  const baseStyles = `bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-b-8 border-gray-200 flex transition-all items-center justify-center overflow-hidden flex-shrink-0`;
  const orientationStyles = horizontal ? 'flex-row w-[120px] h-[60px]' : 'flex-col w-[60px] h-[120px]';
  const interactivityStyles = draggable ? 'cursor-grab active:cursor-grabbing hover:scale-105 hover:-translate-y-1' : 'cursor-default';
  
  return (
    <div 
      draggable={draggable}
      onDragStart={onDragStart}
      style={style}
      className={`${baseStyles} ${orientationStyles} ${interactivityStyles} ${className}`}
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
