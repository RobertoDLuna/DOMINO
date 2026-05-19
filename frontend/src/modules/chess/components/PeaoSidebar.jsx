/**
 * PeaoSidebar.jsx
 * Lateral panel showing: move history, game info, and action buttons for "Batalha dos Peões".
 * Herdado do layout e comportamento do Xadrez Tradicional (ChessSidebar.jsx).
 */
import React from 'react';

const RESULT_LABELS = {
  WHITE_WIN: '⬜ Brancas venceram',
  BLACK_WIN: '⬛ Negras venceram',
  DRAW: '🤝 Empate',
};

const REASON_LABELS = {
  breakthrough: 'por Conquista de Linha',
  stalemate: 'por Stalemate (Sem Movimentos)',
  resignation: 'por Desistência',
  agreement: 'por Acordo',
  disconnection: 'por Desconexão',
  timeout: 'por Tempo Esgotado',
};

// Converte índices 0-63 para notação algébrica clássica
function getCoords(idx) {
  if (idx === undefined || idx === null) return '';
  const row = Math.floor(idx / 8);
  const col = idx % 8;
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  return `${files[col]}${ranks[row]}`;
}

function describeMove(move) {
  if (typeof move === 'string') {
    if (move.includes('->')) {
      const [from, to] = move.split('->').map(Number);
      // Detecção de captura baseada em colunas diferentes
      const fromCol = from % 8;
      const toCol = to % 8;
      const separator = fromCol !== toCol ? '×' : '→';
      return `${getCoords(from)} ${separator} ${getCoords(to)}`;
    }
    return move;
  }
  
  if (move.from !== undefined && move.to !== undefined) {
    const fromCol = move.from % 8;
    const toCol = move.to % 8;
    const separator = fromCol !== toCol ? '×' : '→';
    return `${getCoords(move.from)} ${separator} ${getCoords(move.to)}`;
  }
  
  return '';
}

function SidebarVictoryAnimation({ type }) {
  const particles = Array.from({ length: 20 });
  const symbols = type === 'win' ? ['🏆', '⭐', '✨', '👑', '♟️'] : 
                 type === 'loss' ? ['💀', '❌', '📉', '♟️'] : 
                 ['🤝', '⚖️', '🏳️', '✨'];

  return (
    <div className={`peao-sidebar-win-animation peao-sidebar-animation-${type}`}>
      {particles.map((_, i) => (
        <div 
          key={i} 
          className="peao-sidebar-particle" 
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
            fontSize: `${12 + Math.random() * 20}px`
          }}
        >
          {symbols[Math.floor(Math.random() * symbols.length)]}
        </div>
      ))}
    </div>
  );
}

function PeaoTimer({ seconds, active }) {
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
      timeStr = `0:0${seconds.toFixed(1)}`;
    }
  } catch (e) {
    return null;
  }

  return (
    <div className={`peao-sidebar-timer ${active ? 'active' : ''} ${isLow ? 'low' : ''}`}>
      {timeStr}
    </div>
  );
}

export default function PeaoSidebar({
  myColor,
  whiteName,
  blackName,
  moves = [],
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
  onRematch,
  rematchRequested,
  opponentWantsRematch,
  onBack,
  roomCode,
  whiteTime,
  blackTime,
}) {
  return (
    <aside className="peao-sidebar overflow-hidden relative">
      {gameOver && (
        <SidebarVictoryAnimation type={
          gameOver.result === 'DRAW' ? 'draw' : 
          ((gameOver.result === 'WHITE_WIN' && myColor === 'white') || (gameOver.result === 'BLACK_WIN' && myColor === 'black')) ? 'win' : 'loss'
        } />
      )}

      {/* Nomes dos jogadores */}
      <div className="peao-sidebar-players">
        <div className="peao-sidebar-timer-container">
          <PlayerBadge
            name={blackName || (mode === 'PVC' ? `IA (Nível ${aiLevel})` : 'Aguardando...')}
            color="black"
            active={!isMyTurn && status === 'playing'}
          />
          {status === 'playing' && <PeaoTimer seconds={blackTime} active={!isMyTurn} />}
        </div>

        <div className="peao-sidebar-vs">VS</div>

        <div className="peao-sidebar-timer-container">
          <PlayerBadge
            name={whiteName || 'Você'}
            color="white"
            active={isMyTurn && status === 'playing'}
          />
          {status === 'playing' && <PeaoTimer seconds={whiteTime} active={isMyTurn} />}
        </div>
      </div>

      {/* Banner de Status */}
      {status === 'waiting' && (
        <>
          <div className="peao-sidebar-status-banner peao-sidebar-status-waiting">
            ⏳ Aguardando adversário…
          </div>
          {mode === 'PVP' && roomCode && (
            <div className="peao-sidebar-room-code">
              <span>Código da Sala</span>
              <strong>{roomCode}</strong>
            </div>
          )}
        </>
      )}
      
      {/* Banner de Fim de Jogo */}
      {gameOver && (
        <div className={`peao-sidebar-gameover-banner peao-sidebar-gameover-${
          gameOver.result === 'DRAW' ? 'draw' : 
          ((gameOver.result === 'WHITE_WIN' && myColor === 'white') || (gameOver.result === 'BLACK_WIN' && myColor === 'black')) ? 'win' : 'loss'
        }`}>
          <div className="peao-sidebar-gameover-result">
            {gameOver.result === 'DRAW' ? '🤝 Empate!' : 
              ((gameOver.result === 'WHITE_WIN' && myColor === 'white') || (gameOver.result === 'BLACK_WIN' && myColor === 'black')) 
              ? '🏆 Você Venceu!' 
              : '💀 Você Perdeu'}
          </div>
          <div className="peao-sidebar-gameover-reason">{REASON_LABELS[gameOver.reason] || ''}</div>
          
          <div className="mt-4 flex flex-col gap-2 w-full relative z-10">
            <button 
              className={`peao-sidebar-btn ${rematchRequested ? 'peao-sidebar-btn-disabled' : 'peao-sidebar-btn-rematch'}`}
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
        <div className={`peao-sidebar-status-banner ${isMyTurn ? 'peao-sidebar-status-myturn' : 'peao-sidebar-status-wait'}`}>
          {isMyTurn ? '🎯 Sua vez de jogar' : '⏳ Vez do adversário'}
        </div>
      )}

      {/* Proposta de Empate */}
      {drawOffered && !gameOver && (
        <div className="peao-sidebar-draw-offer">
          <p>🤝 Adversário propõe empate</p>
          <div className="peao-sidebar-draw-actions">
            <button className="peao-sidebar-btn peao-sidebar-btn-accept" onClick={onAcceptDraw}>Aceitar</button>
            <button className="peao-sidebar-btn peao-sidebar-btn-decline" onClick={onDeclineDraw}>Recusar</button>
          </div>
        </div>
      )}

      {/* Histórico de Jogadas */}
      <div className="peao-sidebar-history">
        <div className="peao-sidebar-history-header">
          <span>Jogadas</span>
          <span className="peao-sidebar-history-count">{moves.length}</span>
        </div>
        <div className="peao-sidebar-history-list" id="peao-history-list">
          {[...moves].reverse().map((move, j) => {
            const i = moves.length - 1 - j;
            const isWhite = i % 2 === 0;
            const turnNum = Math.floor(i / 2) + 1;
            return (
              <div key={i} className={`peao-sidebar-log-item ${isWhite ? 'peao-sidebar-log-item--white' : 'peao-sidebar-log-item--black'}`}>
                <div className="peao-sidebar-log-header">
                  <span>{turnNum}. {isWhite ? 'Brancas' : 'Negras'}</span>
                  <span className="peao-sidebar-log-san">{describeMove(move)}</span>
                </div>
                <div className="peao-sidebar-log-text">
                  {describeMove(move)}
                </div>
              </div>
            );
          })}
          {moves.length === 0 && (
            <p className="peao-sidebar-history-empty">Nenhuma jogada ainda</p>
          )}
        </div>
      </div>

      {/* Botões de Ação */}
      {status === 'playing' && !gameOver && (
        <div className="peao-sidebar-actions">
          {mode === 'PVP' && (
            <button className="peao-sidebar-btn peao-sidebar-btn-draw" onClick={onOfferDraw}>
              🤝 Propor Empate
            </button>
          )}
          <button className="peao-sidebar-btn peao-sidebar-btn-resign" onClick={onResign}>
            🏳️ Desistir
          </button>
        </div>
      )}

      <button className="peao-sidebar-btn peao-sidebar-btn-back" onClick={onBack}>
        ← Voltar
      </button>
    </aside>
  );
}

function PlayerBadge({ name, color, active }) {
  return (
    <div className={`peao-sidebar-player-badge ${active ? 'peao-sidebar-player-active' : ''}`}>
      <div className={`peao-sidebar-player-piece peao-sidebar-player-piece--${color}`}>
        {color === 'white' ? '♔' : '♚'}
      </div>
      <div className="peao-sidebar-player-info">
        <span className="peao-sidebar-player-color">{color === 'white' ? 'Brancas' : 'Negras'}</span>
        <span className="peao-sidebar-player-name">{name}</span>
      </div>
      {active && <div className="peao-sidebar-player-pulse" />}
    </div>
  );
}
