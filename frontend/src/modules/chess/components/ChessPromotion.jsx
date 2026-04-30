/**
 * ChessPromotion.jsx
 * Modal displayed when a pawn reaches the last rank, allowing the player
 * to choose the promotion piece.
 */
import React from 'react';

const PIECES = [
  { value: 'q', label: 'Dama', symbol: '♛' },
  { value: 'r', label: 'Torre', symbol: '♜' },
  { value: 'b', label: 'Bispo', symbol: '♝' },
  { value: 'n', label: 'Cavalo', symbol: '♞' },
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
