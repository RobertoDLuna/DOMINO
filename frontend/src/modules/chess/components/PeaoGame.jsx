/**
 * PeaoGame.jsx
 * Componente principal do jogo "Batalha dos Peões".
 *
 * Regras:
 *  - 8x8, apenas peões (8 brancos na linha 6, 8 pretos na linha 1)
 *  - Avanço 1 casa; avanço 2 no primeiro movimento (caminho livre)
 *  - Captura diagonal (1 casa à frente-esquerda ou frente-direita)
 *  - Vitória: chegar à linha oposta, capturar todos os adversários ou forçar stalemate
 *
 * Visual:
 *  - Layout de duas colunas (tabuleiro na esquerda, PeaoSidebar na direita).
 *  - Altura sincronizada, visual idêntico ao Xadrez Tradicional.
 *  - Suporte a temas Madeira e Escuro.
 *  - Temporizadores sincronizados.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePeaoSocket } from '../../../hooks/usePeaoSocket';
import PeaoSidebar from './PeaoSidebar';
import './peao.css';

// ── Engine de regras (espelhada do backend) ───────────────────────────────────

function createInitialBoard() {
  const board = Array(64).fill(null);
  for (let i = 8;  i < 16; i++) board[i] = 'b';
  for (let i = 48; i < 56; i++) board[i] = 'w';
  return board;
}

function createHasMoved() { return Array(64).fill(false); }

function getValidMoves(board, idx, hasMoved) {
  const color = board[idx];
  if (!color) return [];
  const moves = [];
  const dir   = color === 'w' ? -8 : +8;
  const col   = idx % 8;

  const fwd1 = idx + dir;
  if (fwd1 >= 0 && fwd1 < 64 && board[fwd1] === null) {
    moves.push(fwd1);
    const fwd2 = idx + dir * 2;
    if (!hasMoved[idx] && fwd2 >= 0 && fwd2 < 64 && board[fwd2] === null) {
      moves.push(fwd2);
    }
  }
  const diagL = idx + dir - 1;
  if (col > 0 && diagL >= 0 && diagL < 64 && board[diagL] && board[diagL] !== color) moves.push(diagL);
  const diagR = idx + dir + 1;
  if (col < 7 && diagR >= 0 && diagR < 64 && board[diagR] && board[diagR] !== color) moves.push(diagR);

  return moves;
}

function hasAnyMove(board, hasMoved, color) {
  for (let i = 0; i < 64; i++) {
    if (board[i] === color && getValidMoves(board, i, hasMoved).length > 0) return true;
  }
  return false;
}

// ── Minimax para IA local (PVC) ───────────────────────────────────────────────
function evaluateBoard(board) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    if (board[i] === 'w') score += 10 + (6 - Math.floor(i / 8));
    else if (board[i] === 'b') score -= 10 + (Math.floor(i / 8) - 1);
  }
  return score;
}

function checkWinLocal(board) {
  for (let i = 0; i < 8; i++)  if (board[i] === 'w') return 'WHITE_WIN';
  for (let i = 56; i < 64; i++) if (board[i] === 'b') return 'BLACK_WIN';
  if (!board.some(c => c === 'w')) return 'BLACK_WIN';
  if (!board.some(c => c === 'b')) return 'WHITE_WIN';
  return null;
}

function minimax(board, hasMoved, depth, isMax, alpha, beta) {
  const win = checkWinLocal(board);
  if (win === 'WHITE_WIN') return 1000 + depth;
  if (win === 'BLACK_WIN') return -1000 - depth;
  const color = isMax ? 'w' : 'b';
  if (!hasAnyMove(board, hasMoved, color)) return isMax ? -500 : 500;
  if (depth === 0) return evaluateBoard(board);

  let best = isMax ? -Infinity : Infinity;
  for (let i = 0; i < 64; i++) {
    if (board[i] !== (isMax ? 'w' : 'b')) continue;
    for (const to of getValidMoves(board, i, hasMoved)) {
      const nb = [...board]; const nm = [...hasMoved];
      nb[to] = board[i]; nb[i] = null; nm[i] = true;
      const ev = minimax(nb, nm, depth - 1, !isMax, alpha, beta);
      if (isMax) { best = Math.max(best, ev); alpha = Math.max(alpha, ev); }
      else       { best = Math.min(best, ev); beta  = Math.min(beta, ev);  }
      if (beta <= alpha) break;
    }
  }
  return best;
}

function getBestAIMove(board, hasMoved, depth = 3) {
  let bestScore = Infinity, bestFrom = -1, bestTo = -1;
  for (let i = 0; i < 64; i++) {
    if (board[i] !== 'b') continue;
    for (const to of getValidMoves(board, i, hasMoved)) {
      const nb = [...board]; const nm = [...hasMoved];
      nb[to] = 'b'; nb[i] = null; nm[i] = true;
      const score = minimax(nb, nm, depth - 1, true, -Infinity, Infinity);
      if (score < bestScore) { bestScore = score; bestFrom = i; bestTo = to; }
    }
  }
  return { from: bestFrom, to: bestTo };
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function PeaoGame({ user, roomData, onExit }) {
  const { emit, on } = usePeaoSocket();
  const isPVC = roomData.mode === 'PVC';
  const myColor = roomData.color; // 'white' | 'black'
  const myPiece = myColor === 'white' ? 'w' : 'b';

  // ── State ─────────────────────────────────────────────────────────────────
  const [board,     setBoard]     = useState(createInitialBoard);
  const [hasMoved,  setHasMoved]  = useState(createHasMoved);
  const [turn,      setTurn]      = useState('w');
  const [selected,  setSelected]  = useState(null);
  const [validMov,  setValidMov]  = useState([]);
  const [lastMove,  setLastMove]  = useState(null);
  const [moves,     setMoves]     = useState([]);
  const [gameOver,  setGameOver]  = useState(null);  // { result, reason }
  const [whiteName, setWhiteName] = useState(myColor === 'white' ? (user?.fullName || 'Você') : (roomData.opponentName || '...'));
  const [blackName, setBlackName] = useState(myColor === 'black' ? (user?.fullName || 'Você') : (roomData.opponentName || '...'));
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);
  const [drawOffered, setDrawOffered] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('wood');

  // Timers
  const initialTime = roomData.timeLimit || 300;
  const [whiteTime, setWhiteTime] = useState(initialTime);
  const [blackTime, setBlackTime] = useState(initialTime);

  const boardRef   = useRef(board);
  const hasMovRef  = useRef(hasMoved);
  boardRef.current  = board;
  hasMovRef.current = hasMoved;

  // ── Socket listeners (PVP) ────────────────────────────────────────────────
  useEffect(() => {
    if (isPVC) return;

    const unsubs = [
      on('peao-game-ready', ({ board: b, turn: t, whiteName: wn, blackName: bn }) => {
        setBoard(b); setHasMoved(createHasMoved()); setTurn(t);
        setSelected(null); setValidMov([]); setLastMove(null); setGameOver(null);
        setMoves([]);
        setWhiteTime(initialTime);
        setBlackTime(initialTime);
        if (wn) setWhiteName(wn);
        if (bn) setBlackName(bn);
        setRematchRequested(false);
        setOpponentWantsRematch(false);
        setDrawOffered(false);
      }),
      on('peao-piece-moved', ({ board: b, turn: t, lastMove: lm }) => {
        setBoard(b);
        setTurn(t);
        setLastMove(lm);
        setMoves(prev => [...prev, lm]);
        setSelected(null);
        setValidMov([]);
        setHasMoved(prev => { const n = [...prev]; n[lm.from] = false; n[lm.to] = true; return n; });
      }),
      on('peao-game-over', ({ result, reason }) => {
        setGameOver({ result, reason });
        setDrawOffered(false);
      }),
      on('peao-rematch-requested', () => setOpponentWantsRematch(true)),
      on('peao-draw-offered', () => setDrawOffered(true)),
      on('peao-draw-declined', () => setDrawOffered(false)),
    ];

    return () => unsubs.forEach(fn => fn());
  }, [isPVC, on, initialTime]);

  // ── Timer ticking logic ───────────────────────────────────────────────────
  const status = gameOver ? 'finished' : 'playing';

  const handleTimeout = useCallback((lostColor) => {
    if (gameOver) return;

    if (isPVC) {
      const result = lostColor === 'white' ? 'BLACK_WIN' : 'WHITE_WIN';
      setGameOver({ result, reason: 'timeout' });
    } else {
      emit('peao-claim-timeout', { roomCode: roomData.roomCode });
    }
  }, [gameOver, isPVC, emit, roomData.roomCode]);

  useEffect(() => {
    if (status !== 'playing' || gameOver) return;

    const interval = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime(prev => {
          const next = Math.max(0, prev - 0.1);
          if (next === 0) handleTimeout('white');
          return next;
        });
      } else {
        setBlackTime(prev => {
          const next = Math.max(0, prev - 0.1);
          if (next === 0) handleTimeout('black');
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [status, gameOver, turn, handleTimeout]);

  // ── Click na casa ─────────────────────────────────────────────────────────
  const handleSquareClick = useCallback((idx) => {
    if (gameOver) return;
    if (turn !== myPiece) return;

    const b = boardRef.current;
    const hm = hasMovRef.current;

    // Se clicou em movimento válido → executa
    if (selected !== null && validMov.includes(idx)) {
      const from = selected;
      const to   = idx;
      const newBoard  = [...b];
      const newMoved  = [...hm];
      newBoard[to] = newBoard[from];
      newBoard[from] = null;
      newMoved[to]  = true;

      setBoard(newBoard);
      setHasMoved(newMoved);
      setSelected(null);
      setValidMov([]);
      setLastMove({ from, to });
      setMoves(prev => [...prev, { from, to }]);

      const newTurn = turn === 'w' ? 'b' : 'w';
      setTurn(newTurn);

      if (isPVC) {
        // Verifica vitória do humano
        const win = checkWinLocal(newBoard);
        if (win) { setGameOver({ result: win, reason: 'breakthrough' }); return; }
        if (!hasAnyMove(newBoard, newMoved, 'b')) { setGameOver({ result: 'WHITE_WIN', reason: 'stalemate' }); return; }

        // IA responde
        setTimeout(() => {
          const aiMove = getBestAIMove(newBoard, newMoved, Math.min(roomData.aiLevel || 3, 4));
          if (aiMove.from === -1) return;
          const ab = [...newBoard]; const am = [...newMoved];
          ab[aiMove.to] = 'b'; ab[aiMove.from] = null; am[aiMove.to] = true;
          setBoard(ab); setHasMoved(am);
          setLastMove(aiMove);
          setMoves(prev => [...prev, aiMove]);
          setTurn('w');

          const aiWin = checkWinLocal(ab);
          if (aiWin) { setGameOver({ result: aiWin, reason: 'breakthrough' }); return; }
          if (!hasAnyMove(ab, am, 'w')) { setGameOver({ result: 'BLACK_WIN', reason: 'stalemate' }); }
        }, 400);
      } else {
        emit('peao-move', { roomCode: roomData.roomCode, from, to });
      }
      return;
    }

    // Se clicou em peça própria → seleciona
    if (b[idx] === myPiece) {
      const moves = getValidMoves(b, idx, hm);
      setSelected(idx);
      setValidMov(moves);
    } else {
      setSelected(null);
      setValidMov([]);
    }
  }, [gameOver, turn, myPiece, selected, validMov, isPVC, emit, roomData]);

  // ── Renomear jogadores quando gameReady chega antes de state ─────────────
  useEffect(() => {
    if (roomData.whiteName) setWhiteName(roomData.whiteName);
    if (roomData.blackName) setBlackName(roomData.blackName);
  }, [roomData.whiteName, roomData.blackName]);

  // ── Resign ───────────────────────────────────────────────────────────────
  const handleResign = () => {
    if (isPVC) { setGameOver({ result: myColor === 'white' ? 'BLACK_WIN' : 'WHITE_WIN', reason: 'resignation' }); return; }
    emit('peao-resign', { roomCode: roomData.roomCode });
  };

  // ── Draw Handlers ────────────────────────────────────────────────────────
  const handleOfferDraw = () => {
    if (isPVC) return;
    emit('peao-offer-draw', { roomCode: roomData.roomCode });
  };

  const handleAcceptDraw = () => {
    if (isPVC) return;
    emit('peao-accept-draw', { roomCode: roomData.roomCode });
    setDrawOffered(false);
  };

  const handleDeclineDraw = () => {
    if (isPVC) return;
    emit('peao-decline-draw', { roomCode: roomData.roomCode });
    setDrawOffered(false);
  };

  // ── Rematch ──────────────────────────────────────────────────────────────
  const handleRematch = () => {
    if (isPVC) {
      setBoard(createInitialBoard());
      setHasMoved(createHasMoved());
      setTurn('w'); setSelected(null); setValidMov([]); setLastMove(null); setGameOver(null);
      setMoves([]);
      setWhiteTime(initialTime);
      setBlackTime(initialTime);
    } else {
      emit('peao-request-rematch', { roomCode: roomData.roomCode });
      setRematchRequested(true);
    }
  };

  // ── Renderização do tabuleiro ─────────────────────────────────────────────
  const squares = myColor === 'white'
    ? Array.from({ length: 64 }, (_, i) => i)
    : Array.from({ length: 64 }, (_, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        return (7 - row) * 8 + (7 - col);
      });

  const ranks = myColor === 'white' ? ['8','7','6','5','4','3','2','1'] : ['1','2','3','4','5','6','7','8'];
  const files = myColor === 'white' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a'];

  const isMyTurn = turn === myPiece && !gameOver;

  return (
    <div className="peao-screen">
      {/* Theme switcher — top right */}
      <div className="peao-theme-switcher">
        <button
          className={`peao-theme-btn ${currentTheme === 'wood' ? 'peao-theme-btn--active' : ''}`}
          onClick={() => setCurrentTheme('wood')}
          title="Madeira Clássica"
        >
          🪵 Madeira Clássica
        </button>
        <button
          className={`peao-theme-btn ${currentTheme === 'dark' ? 'peao-theme-btn--active' : ''}`}
          onClick={() => setCurrentTheme('dark')}
          title="Dark Moderno"
        >
          🌑 Dark Moderno
        </button>
      </div>

      <div className="peao-layout">
        {/* Board area */}
        <div className="peao-board-area">
          <div className={`peao-board-wrapper peao-theme-${currentTheme}`}>
            {/* Notação X (topo) */}
            <div className="peao-notation-x">
              {files.map(f => <span key={`tx-${f}`}>{f}</span>)}
            </div>

            {/* Tabuleiro + notações Y */}
            <div className="peao-board-middle">
              <div className="peao-notation-y">
                {ranks.map(r => <span key={`ly-${r}`}>{r}</span>)}
              </div>

              <div className="peao-board-inner">
                <div className="peao-board-grid">
                  {squares.map((idx) => {
                    const row = Math.floor(idx / 8);
                    const col = idx % 8;
                    const isLight     = (row + col) % 2 === 0;
                    const isSelected  = selected === idx;
                    const isValidMove = validMov.includes(idx) && board[idx] === null;
                    const isCapture   = validMov.includes(idx) && board[idx] !== null;
                    const isLastMove  = lastMove && (lastMove.from === idx || lastMove.to === idx);

                    let cls = `peao-board-sq ${isLight ? 'peao-board-sq--light' : 'peao-board-sq--dark'}`;
                    if (isLastMove && !isSelected) cls += ' peao-board-sq--last-move';
                    if (isSelected)    cls += ' peao-board-sq--selected';
                    if (isValidMove)   cls += ' peao-board-sq--valid-move';
                    if (isCapture)     cls += ' peao-board-sq--valid-capture';

                    const piece = board[idx];
                    const pieceFile = piece === 'w' ? '/assets/chess/3d/wP.png' : '/assets/chess/3d/bP.png';

                    return (
                      <div key={idx} className={cls} onClick={() => handleSquareClick(idx)}>
                        {piece && (
                          <img 
                            src={pieceFile} 
                            alt={piece === 'w' ? 'Peão Branco' : 'Peão Preto'} 
                            className="peao-board-piece" 
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="peao-notation-y">
                {ranks.map(r => <span key={`ry-${r}`}>{r}</span>)}
              </div>
            </div>

            {/* Notação X (base) */}
            <div className="peao-notation-x">
              {files.map(f => <span key={`bx-${f}`}>{f}</span>)}
            </div>
          </div>
        </div>

        {/* Sidebar container */}
        <div className="peao-sidebar-container">
          <PeaoSidebar
            myColor={myColor}
            whiteName={whiteName}
            blackName={blackName}
            moves={moves}
            status={status}
            gameOver={gameOver}
            drawOffered={drawOffered}
            isMyTurn={isMyTurn}
            mode={roomData.mode}
            aiLevel={roomData.aiLevel}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onAcceptDraw={handleAcceptDraw}
            onDeclineDraw={handleDeclineDraw}
            onRematch={handleRematch}
            rematchRequested={rematchRequested}
            opponentWantsRematch={opponentWantsRematch}
            onBack={onExit}
            roomCode={roomData.roomCode}
            whiteTime={whiteTime}
            blackTime={blackTime}
          />
        </div>
      </div>
    </div>
  );
}
