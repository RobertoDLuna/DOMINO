/**
 * ChessSidebar.jsx
 * Lateral panel showing: move history (SAN), game info, and action buttons
 * (resign, offer draw, accept/decline draw).
 */
import React from 'react';

const RESULT_LABELS = {
  WHITE_WIN: '⬜ Brancas venceram',
  BLACK_WIN: '⬛ Negras venceram',
  DRAW: '🤝 Empate',
};

const REASON_LABELS = {
  checkmate: 'por Xeque-Mate',
  resignation: 'por Desistência',
  stalemate: 'por Afogamento',
  agreement: 'por Acordo',
  insufficient_material: 'por Material Insuficiente',
  threefold_repetition: 'por Repetição (3x)',
  fifty_move_rule: 'pela Regra dos 50 Lances',
  disconnection: 'por Desconexão',
};

export default function ChessSidebar({
  myColor,
  whiteName,
  blackName,
  moves,
  status,         // 'waiting' | 'playing' | 'finished'
  gameOver,       // { result, reason } | null
  drawOffered,    // boolean
  isMyTurn,
  mode,
  aiLevel,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onBack,
}) {
  // Pair moves into [ [white, black], ... ]
  const pairedMoves = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairedMoves.push([moves[i], moves[i + 1]]);
  }

  return (
    <aside className="chess-sidebar">
      {/* Player names */}
      <div className="chess-players">
        <PlayerBadge
          name={blackName || (mode === 'PVC' ? `IA (Nível ${aiLevel})` : 'Aguardando...')}
          color="black"
          active={!isMyTurn && status === 'playing'}
        />
        <div className="chess-vs">VS</div>
        <PlayerBadge
          name={whiteName || 'Você'}
          color="white"
          active={isMyTurn && status === 'playing'}
        />
      </div>

      {/* Status banner */}
      {status === 'waiting' && (
        <div className="chess-status-banner chess-status-waiting">
          ⏳ Aguardando adversário…
        </div>
      )}
      {status === 'playing' && (
        <div className={`chess-status-banner ${isMyTurn ? 'chess-status-myturn' : 'chess-status-wait'}`}>
          {isMyTurn ? '🎯 Sua vez de jogar' : '⏳ Vez do adversário'}
        </div>
      )}

      {/* Game over banner */}
      {gameOver && (
        <div className="chess-gameover-banner">
          <div className="chess-gameover-result">{RESULT_LABELS[gameOver.result] || 'Fim de jogo'}</div>
          <div className="chess-gameover-reason">{REASON_LABELS[gameOver.reason] || ''}</div>
        </div>
      )}

      {/* Draw offer */}
      {drawOffered && !gameOver && (
        <div className="chess-draw-offer">
          <p>🤝 Adversário propõe empate</p>
          <div className="chess-draw-actions">
            <button className="chess-btn chess-btn-accept" onClick={onAcceptDraw}>Aceitar</button>
            <button className="chess-btn chess-btn-decline" onClick={onDeclineDraw}>Recusar</button>
          </div>
        </div>
      )}

      {/* Move history */}
      <div className="chess-history">
        <div className="chess-history-header">
          <span>Jogadas</span>
          <span className="chess-history-count">{moves.length}</span>
        </div>
        <div className="chess-history-list" id="chess-history-list">
          {pairedMoves.map(([white, black], i) => (
            <div key={i} className="chess-history-row">
              <span className="chess-history-num">{i + 1}.</span>
              <span className="chess-history-white">{white}</span>
              <span className="chess-history-black">{black ?? ''}</span>
            </div>
          ))}
          {pairedMoves.length === 0 && (
            <p className="chess-history-empty">Nenhuma jogada ainda</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {status === 'playing' && !gameOver && mode === 'PVP' && (
        <div className="chess-actions">
          <button className="chess-btn chess-btn-draw" onClick={onOfferDraw}>
            🤝 Propor Empate
          </button>
          <button className="chess-btn chess-btn-resign" onClick={onResign}>
            🏳️ Desistir
          </button>
        </div>
      )}

      {(gameOver || status !== 'playing') && (
        <button className="chess-btn chess-btn-back" onClick={onBack}>
          ← Voltar ao Lobby
        </button>
      )}
    </aside>
  );
}

function PlayerBadge({ name, color, active }) {
  return (
    <div className={`chess-player-badge ${active ? 'chess-player-active' : ''}`}>
      <div className={`chess-player-piece chess-player-piece--${color}`}>
        {color === 'white' ? '♔' : '♚'}
      </div>
      <div className="chess-player-info">
        <span className="chess-player-color">{color === 'white' ? 'Brancas' : 'Negras'}</span>
        <span className="chess-player-name">{name}</span>
      </div>
      {active && <div className="chess-player-pulse" />}
    </div>
  );
}
