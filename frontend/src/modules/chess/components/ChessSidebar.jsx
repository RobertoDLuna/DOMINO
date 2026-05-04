/**
 * ChessSidebar.jsx
 * Lateral panel showing: move history (SAN), game info, and action buttons
 * (resign, offer draw, accept/decline draw).
 */
import React from 'react';

const PIECE_NAMES = {
  p: 'Peão',
  n: 'Cavalo',
  b: 'Bispo',
  r: 'Torre',
  q: 'Rainha',
  k: 'Rei'
};

function describeMove(move) {
  if (typeof move === 'string') return move; // Fallback
  
  if (move.san === 'O-O') return 'Roque Menor';
  if (move.san === 'O-O-O') return 'Roque Maior';
  
  const piece = PIECE_NAMES[move.piece] || move.piece;
  const to = move.to.toLowerCase();
  
  let desc = `${piece} para ${to}`;
  if (move.captured) {
    desc = `${piece} captura ${PIECE_NAMES[move.captured]} em ${to}`;
  }
  
  if (move.san.includes('+')) desc += ' (Xeque)';
  if (move.san.includes('#')) desc += ' (Xeque-Mate)';
  if (move.promotion) desc += ` e promove p/ ${PIECE_NAMES[move.promotion]}`;
  
  return desc;
}

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
  onStartGame,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onBack,
  roomCode,
}) {
  // Removemos o pairedMoves, pois faremos uma lista vertical descritiva

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
        <>
          <div className="chess-status-banner chess-status-waiting">
            ⏳ Aguardando adversário…
          </div>
          {mode === 'PVP' && roomCode && (
            <div className="chess-room-code">
              <span>Código da Sala</span>
              <strong>{roomCode}</strong>
            </div>
          )}
        </>
      )}
      
      {status === 'ready' && (
        <div className="chess-actions">
          {myColor === 'white' ? (
            <button className="chess-btn chess-btn-start" onClick={onStartGame}>
              ▶ Iniciar Partida
            </button>
          ) : (
            <div className="chess-status-banner chess-status-wait">
              ⏳ Aguardando anfitrião iniciar...
            </div>
          )}
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
          {moves.map((move, i) => {
            const isWhite = i % 2 === 0;
            const turnNum = Math.floor(i / 2) + 1;
            return (
              <div key={i} className={`chess-log-item ${isWhite ? 'chess-log-item--white' : 'chess-log-item--black'}`}>
                <div className="chess-log-header">
                  <span>{turnNum}. {isWhite ? 'Brancas' : 'Negras'}</span>
                  <span className="chess-log-san">{typeof move === 'string' ? move : move.san}</span>
                </div>
                <div className="chess-log-text">
                  {describeMove(move)}
                </div>
              </div>
            );
          })}
          {moves.length === 0 && (
            <p className="chess-history-empty">Nenhuma jogada ainda</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {status === 'playing' && !gameOver && (
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
