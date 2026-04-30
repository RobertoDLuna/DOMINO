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
  width,
  height,
  style = {} 
}) {
  const iconA = reverse ? piece.ladoB : piece.ladoA;
  const iconB = reverse ? piece.ladoA : piece.ladoB;
  
  // Ajustando aspecto para equilibrar tamanho: Horizontal 140x66, Vertical 66x140
  const actualW = width || (horizontal ? 140 : 66);
  const actualH = height || (horizontal ? 66 : 140);

  // Empty string = same origin (works in dev via Vite proxy AND in production)
  const API_BASE = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : (typeof window !== 'undefined' ? window.location.origin : '');

  const renderSide = (symbol, value) => {
    const isImage = typeof symbol === 'string' && (symbol.startsWith('/uploads') || symbol.startsWith('http'));
    
    const renderIndicator = () => (
      <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] font-black w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full pointer-events-none shadow-md z-10 border border-white/10">
        {value}
      </div>
    );

    return (
      // Imagens usam p-1 (padding mínimo) para maximizar área útil.
      // Símbolos/pontos usam p-2 para respiração visual adequada.
      <div className={`relative w-full h-full flex items-center justify-center min-h-0 min-w-0 ${isImage ? 'p-1' : 'p-2 sm:p-3'}`}>
        {isImage ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden min-h-0 min-w-0">
            <img 
              src={symbol.startsWith('http') ? symbol : `${API_BASE}${symbol}`} 
              alt={`Lado ${value}`}
              draggable={false}
              className="max-w-[98%] max-h-[98%] object-contain drop-shadow-md pointer-events-none"
              onError={(e) => {
                console.warn("Failed to load image for piece, falling back to dots", symbol);
                e.target.style.display = 'none';
                e.target.parentElement.classList.add('fallback-dots');
              }}
            />
          </div>
        ) : (
          <div className={`flex items-center justify-center ${horizontal ? 'rotate-0' : 'rotate-90'}`}>
            {symbol ? (
              <span className="text-3xl sm:text-4xl select-none">{symbol}</span>
            ) : (
              <div className="grid grid-cols-2 gap-0.5 sm:gap-1 p-1">
                {[...Array(value)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-700 shadow-sm" />
                ))}
              </div>
            )}
          </div>
        )}
        {renderIndicator()}
      </div>
    );
  };


  const orientationStyles = horizontal ? 'flex-row' : 'flex-col';

  const selectedStyles = selected
    ? 'scale-110 -translate-y-2 ring-4 ring-[#FFCE00] ring-offset-2 shadow-[0_20px_40px_rgba(255,206,0,0.4)] z-50'
    : '';

  const interactivityStyles = (draggable || onClick) 
    ? 'cursor-pointer active:scale-95' 
    : 'cursor-default';
  
  return (
    <div 
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      style={{ ...style, width: actualW, height: actualH }}
      className={`${orientationStyles} ${selectedStyles} ${interactivityStyles} ${className} relative flex-shrink-0 transition-all`}
    >
      {/* Inner wrapper: overflow-hidden para o conteúdo respeitar o border-radius */}
      <div
        className={`relative flex ${orientationStyles} items-center justify-center rounded-xl border-b-8 bg-gradient-to-br from-white to-gray-50 shadow-[0_8px_20px_rgba(0,0,0,0.15)] overflow-hidden w-full h-full`}
        style={selected ? { borderColor: '#FFCE00' } : { borderColor: '#d1d5db' }}
      >
        {/* Lado A */}
        <div className={`flex-1 flex items-center justify-center ${horizontal ? 'text-5xl' : 'text-4xl'} select-none w-full h-full min-h-0 min-w-0 text-center text-slate-800`}>
          {renderSide(iconA, reverse ? piece.vB : piece.vA)}
        </div>

        {/* Divisória Central 'Groove' - min-size garante visibilidade em qualquer contexto */}
        <div
          style={horizontal
            ? { minWidth: '2px', minHeight: '60%', width: '2px' }
            : { minHeight: '2px', minWidth: '60%', height: '2px' }
          }
          className={`relative flex-shrink-0 flex items-center justify-center ${horizontal ? 'self-stretch' : 'w-[80%]'} bg-gray-300 rounded-full shadow-inner`}
        >
          {/* Ponto central decorativo */}
          <div className="absolute w-2 h-2 bg-gray-400 rounded-full shadow-sm"></div>
        </div>

        {/* Lado B */}
        <div className={`flex-1 flex items-center justify-center ${horizontal ? 'text-5xl' : 'text-4xl'} select-none w-full h-full min-h-0 min-w-0 text-center text-slate-800`}>
          {renderSide(iconB, reverse ? piece.vA : piece.vB)}
        </div>

        {/* Brilho sutil no topo para efeito 3D */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/50 pointer-events-none"></div>
      </div>
    </div>
  );
}
