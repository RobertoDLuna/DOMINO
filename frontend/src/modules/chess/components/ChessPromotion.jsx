/**
 * ChessPromotion.jsx
 * Modal exibido quando um peão atinge a última fileira, permitindo ao jogador
 * escolher a peça de promoção.
 */
import React from 'react';

const PIECES = [
  { value: 'q', label: 'Dama' },
  { value: 'r', label: 'Torre' },
  { value: 'b', label: 'Bispo' },
  { value: 'n', label: 'Cavalo' },
];

export default function ChessPromotion({ color, onSelect }) {
  const isWhite = color === 'w';
  const symbols = {
    q: isWhite ? '♕' : '♛',
    r: isWhite ? '♖' : '♜',
    b: isWhite ? '♗' : '♝',
    n: isWhite ? '♘' : '♞',
  };

  return (
    <div className="chess-promotion-overlay">
      <div className="chess-promotion-modal">
        <h3 className="chess-promotion-title">Promover Peão</h3>
        <p className="chess-promotion-sub">Escolha a peça</p>
        <div className="chess-promotion-grid">
          {PIECES.map((p) => (
            <button
              key={p.value}
              className="chess-promotion-btn"
              onClick={() => onSelect(p.value)}
              title={p.label}
            >
              <span className="chess-promotion-symbol">{symbols[p.value]}</span>
              <span className="chess-promotion-label">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
