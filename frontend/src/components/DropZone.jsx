import React, { useState } from "react";

/**
 * DropZone for pieces on the board.
 */
export default function DropZone({ 
  onDrop, 
  side, 
  label, 
  matchIcon, 
  horizontal = false 
}) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDropEvent = (e) => {
    e.preventDefault();
    setIsOver(false);
    onDrop(side);
  };

  const baseStyles = `relative group rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden flex-shrink-0 mx-2 text-white font-black text-center`;
  const sizeStyles = horizontal ? 'w-[120px] h-[60px]' : 'w-[60px] h-[120px]';
  const overStyles = isOver 
    ? 'bg-yellow-400 scale-110 shadow-[0_0_40px_rgba(250,204,21,0.6)]' 
    : 'bg-white/5 border-4 border-dashed border-white/20';

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropEvent}
      className={`${baseStyles} ${sizeStyles} ${overStyles}`}
    >
      {/* Visual background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="absolute inset-0 animate-pulse bg-white/5 pointer-events-none"></div>
      
      <div className="flex flex-col items-center justify-center z-10 gap-1">
        {matchIcon && <span className="text-2xl drop-shadow-md animate-bounce">{matchIcon}</span>}
        <span className={`text-[11px] font-black uppercase tracking-tighter drop-shadow-md brightness-150 ${horizontal ? '' : 'rotate-90'}`}>
          {label === 'Cá' ? 'AQUI' : label === 'Lá' ? 'ALÍ' : label}
        </span>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-white/20"></div>
      <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-white/20"></div>
    </div>
  );
}
