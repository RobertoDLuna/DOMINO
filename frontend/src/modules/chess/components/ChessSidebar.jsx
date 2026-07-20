/**
 * ChessSidebar.jsx
 * Lateral panel showing: move history (SAN), game info, and action buttons
 * (resign, offer draw, accept/decline draw).
 */
import React from 'react';

const PIECE_INITIALS = {
  p: 'P',
  n: 'C',
  b: 'B',
  r: 'T',
  q: 'D',
  k: 'R'
};

function describeMove(move) {
  if (typeof move === 'string') return move;
  
  if (move.san === 'O-O') return 'O-O';
  if (move.san === 'O-O-O') return 'O-O-O';
  
  const piece = PIECE_INITIALS[move.piece] || '';
  const to = move.to.toLowerCase();
  const capture = move.captured ? 'x' : '';
  const check = move.san.includes('#') ? '++' : (move.san.includes('+') ? '+' : '');
  const promotion = move.promotion ? `=${PIECE_INITIALS[move.promotion] || move.promotion.toUpperCase()}` : '';

  return `${piece}${capture}${to}${promotion}${check}`;
}

const RESULT_LABELS = {
  WHITE_WIN: '⬜ Brancas venceram',
  BLACK_WIN: '⬛ Pretas venceram',
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
  timeout: 'por Tempo Esgotado',
};



export function ChessTimer({ seconds, active }) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return null;
  
  const isLow = seconds < 30;
  
  let timeStr = "";
  try {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    } else if (seconds >= 10) {
      timeStr = `0:${Math.floor(seconds).toString().padStart(2, '0')}`;
    } else {
      // Mostra décimos de segundo abaixo de 10s
      timeStr = `0:0${seconds.toFixed(1)}`;
    }
  } catch (e) {
    return null;
  }

  return (
    <div 
      className={`chess-timer ${active ? 'active' : ''} ${isLow ? 'low' : ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
    >
      {active && (
        <span 
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" 
          style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }}
        />
      )}
      <span>{timeStr}</span>
    </div>
  );
}

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
  onRematch,
  rematchRequested,
  opponentWantsRematch,
  onBack,
  roomCode,
  whiteTime,
  blackTime,
  onShowReport,
}) {
  const isWhiteActive = status === 'playing' && ((myColor === 'white' && isMyTurn) || (myColor === 'black' && !isMyTurn));
  const isBlackActive = status === 'playing' && ((myColor === 'black' && isMyTurn) || (myColor === 'white' && !isMyTurn));

  return (
    <aside className="chess-sidebar overflow-hidden relative">

      {/* Player names */}
      <div className="chess-players">
        <div className="chess-timer-container">
          <PlayerBadge
            name={blackName || (mode === 'PVC' ? `IA (Nível ${aiLevel})` : 'Aguardando...')}
            color="black"
            active={isBlackActive}
          />
          {status === 'playing' && <ChessTimer seconds={blackTime} active={isBlackActive} />}
        </div>

        <div className="chess-vs">VS</div>

        <div className="chess-timer-container">
          <PlayerBadge
            name={whiteName || 'Você'}
            color="white"
            active={isWhiteActive}
          />
          {status === 'playing' && <ChessTimer seconds={whiteTime} active={isWhiteActive} />}
        </div>
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

      {status === 'playing' && (
        <div className={`chess-status-banner ${isMyTurn ? 'chess-status-myturn' : 'chess-status-wait'}`}>
          {isMyTurn ? '🎯 Sua vez de jogar' : '⏳ Vez do adversário'}
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
          {[...moves].reverse().map((move, j) => {
            const i = moves.length - 1 - j;
            const isWhite = i % 2 === 0;
            const turnNum = Math.floor(i / 2) + 1;
            return (
              <div key={i} className={`chess-log-item ${isWhite ? 'chess-log-item--white' : 'chess-log-item--black'}`}>
                <div className="chess-log-header">
                  <span>{turnNum}. {isWhite ? 'Brancas' : 'Pretas'}</span>
                  <span className="chess-log-san">{typeof move === 'string' ? move : describeMove(move)}</span>
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

      <button className="chess-btn chess-btn-back" onClick={onBack}>
        ← {roomCode && roomCode.startsWith('T-') ? 'Voltar ao Campeonato' : 'Voltar'}
      </button>
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
        <span className="chess-player-color">{color === 'white' ? 'Brancas' : 'Pretas'}</span>
        <span className="chess-player-name">{name}</span>
      </div>
      {active && <div className="chess-player-pulse" />}
    </div>
  );
}
