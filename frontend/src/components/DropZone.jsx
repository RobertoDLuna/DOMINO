import React, { useState } from "react";

/**
 * DropZone for pieces on the board.
 */
export default function DropZone({
  onDrop,
  side,
  label,
  matchIcon,
  horizontal = false,
  active = true,
  w,
  h
}) {
  const [isOver, setIsOver] = useState(false);
  
  const actualW = w || (horizontal ? 120 : 68);
  const actualH = h || (horizontal ? 68 : 120);

  // Consistency with Piece.jsx
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

  const renderMatchIcon = (symbol) => {
    if (!symbol) return null;
    
    const isImagePath = typeof symbol === 'string' && (symbol.startsWith('/') || symbol.startsWith('http'));

    if (isImagePath) {
      const src = symbol.startsWith('http') ? symbol : `${API_BASE}${symbol}`;
      return (
        <img
          src={src}
          alt="Match"
          className="w-full h-full object-contain drop-shadow-md rounded-lg"
        />
      );
    }
    return <span className="text-2xl sm:text-4xl drop-shadow-md">{symbol}</span>;
  };

  const handleDragOver = (e) => {
    if (!active) return;
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDropEvent = (e) => {
    if (!active) return;
    e.preventDefault();
    setIsOver(false);
    onDrop(side);
  };

  const baseStyles = `relative group rounded-2xl flex items-center justify-center transition-all duration-300 flex-shrink-0 text-white font-black text-center`;
  
  const overStyles = isOver
    ? 'bg-yellow-400 scale-110 shadow-[0_0_40px_rgba(250,204,21,0.6)]'
    : active
      ? 'bg-white/5 border-4 border-dashed border-white/20'
      : 'bg-white/5 border-2 border-dashed border-white/5 opacity-40 grayscale pointer-events-none';

  return (
    <div
      onDragOver={active ? handleDragOver : undefined}
      onDragLeave={active ? handleDragLeave : undefined}
      onDrop={active ? handleDropEvent : undefined}
      style={{ width: actualW, height: actualH }}
      className={`${baseStyles} ${overStyles}`}
    >
      {/* Visual background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
      <div className="absolute inset-0 animate-pulse bg-white/5 pointer-events-none rounded-2xl"></div>

      <div className="flex flex-col items-center justify-center z-10 gap-1 w-full h-full p-2">
        {matchIcon && (
          <div className={`${actualW > 150 || actualH > 150 ? 'w-20 h-20 sm:w-28 sm:h-28' : 'w-10 h-10 sm:w-16 sm:h-16'} flex items-center justify-center animate-bounce`}>
            {renderMatchIcon(matchIcon)}
          </div>
        )}
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tighter drop-shadow-md brightness-150 bg-black/20 px-2 py-0.5 rounded-full">
          {label === 'Cá' ? 'AQUI' : label === 'Lá' ? 'ALÍ' : label}
        </span>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-white/20"></div>
      <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-white/20"></div>
    </div>
  );
}
