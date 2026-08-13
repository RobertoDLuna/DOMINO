import React from 'react';
import './MemoryCard.css';

const MemoryCard = ({ card, onClick }) => {
  return (
    <div 
      className={`memory-card-container ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
      onClick={() => {
        if (!card.isFlipped && !card.isMatched) {
          onClick(card);
        }
      }}
    >
      <div className="memory-card-inner">
        <div className="memory-card-front bg-emerald-100 border-4 border-emerald-300 flex items-center justify-center rounded-2xl shadow-md">
          <span className="text-4xl">🧠</span>
        </div>
        <div className="memory-card-back bg-white border-4 border-emerald-400 flex items-center justify-center rounded-2xl shadow-lg overflow-hidden p-2">
          {card.symbolUrl ? (
             <img src={card.symbolUrl} alt="carta" className="w-full h-full object-contain" />
          ) : (
            <span className="text-4xl font-black text-emerald-900">?</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryCard;
