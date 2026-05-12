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

function ChessTimer({ seconds, active }) {
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
    <div className={`chess-timer ${active ? 'active' : ''} ${isLow ? 'low' : ''}`}>
      {timeStr}
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
}) {
  // Removemos o pairedMoves, pois faremos uma lista vertical descritiva

  return (
    <aside className="chess-sidebar">
      {/* Player names */}
      <div className="chess-players">
        <div className="chess-timer-container">
          <PlayerBadge
            name={blackName || (mode === 'PVC' ? `IA (Nível ${aiLevel})` : 'Aguardando...')}
            color="black"
            active={!isMyTurn && status === 'playing'}
          />
          {status === 'playing' && <ChessTimer seconds={blackTime} active={!isMyTurn} />}
        </div>

        <div className="chess-vs">VS</div>

        <div className="chess-timer-container">
          <PlayerBadge
            name={whiteName || 'Você'}
            color="white"
            active={isMyTurn && status === 'playing'}
          />
          {status === 'playing' && <ChessTimer seconds={whiteTime} active={isMyTurn} />}
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
      
      {/* Game over banner */}
      {gameOver && (
        <div className="chess-gameover-banner">
          <div className="chess-gameover-result">{RESULT_LABELS[gameOver.result] || 'Fim de jogo'}</div>
          <div className="chess-gameover-reason">{REASON_LABELS[gameOver.reason] || ''}</div>
          
          <div className="mt-4 flex flex-col gap-2 w-full">
            <button 
              className={`chess-btn ${rematchRequested ? 'chess-btn-disabled' : 'chess-btn-rematch'}`}
              onClick={onRematch}
              disabled={rematchRequested}
            >
              {rematchRequested ? '⏳ Aguardando...' : (opponentWantsRematch ? '🤝 Aceitar Revanche' : '🔄 Jogar Novamente')}
            </button>
            {opponentWantsRematch && !rematchRequested && (
              <div className="text-[10px] text-green-600 font-bold uppercase text-center animate-pulse">
                Oponente quer revanche!
              </div>
            )}
          </div>
        </div>
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
                  <span>{turnNum}. {isWhite ? 'Brancas' : 'Negras'}</span>
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
        ← Voltar
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
        <span className="chess-player-color">{color === 'white' ? 'Brancas' : 'Negras'}</span>
        <span className="chess-player-name">{name}</span>
      </div>
      {active && <div className="chess-player-pulse" />}
    </div>
  );
}
