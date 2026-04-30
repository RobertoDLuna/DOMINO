/**
 * ChessScreen.jsx
 * Main game container. Manages Socket.IO events, Stockfish AI (PVC mode),
 * board state, game flow and UI composition.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessBoard, { BOARD_THEMES } from '../components/ChessBoard';
import ChessSidebar from '../components/ChessSidebar';
import { useChessSocket } from '../../../hooks/useChessSocket';

// ── Stockfish worker ──────────────────────────────────────────────────────
// stockfish.js is pre-copied to /public for direct URL access (no bundling)
function createStockfishWorker() {
  try {
    return new Worker('/stockfish.js');
  } catch {
    console.warn('[Chess] Stockfish não disponível. Modo PVC desabilitado.');
    return null;
  }
}


// ── Constants ─────────────────────────────────────────────────────────────
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function ChessScreen({
  user,
  roomCode,
  myColor,       // 'white' | 'black'
  mode,          // 'PVP' | 'PVC'
  aiLevel,       // 1-10
  whiteName,
  blackName,
  initialFen,
  boardTheme,
  onBack,
}) {
  const { emit, on, off, connected } = useChessSocket();

  const [fen, setFen] = useState(initialFen || INITIAL_FEN);
  const [moves, setMoves] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(boardTheme || 'wood');
  const [isStarted, setIsStarted] = useState(mode === 'PVC'); // PVC começa direto

  const chessRef = useRef(new Chess(initialFen || INITIAL_FEN));
  const stockfishRef = useRef(null);
  const isMyTurn = chessRef.current.turn() === (myColor === 'white' ? 'w' : 'b');

  // Compute status
  const isWaiting = mode === 'PVP' && (!whiteName || !blackName);
  const status = gameOver ? 'finished' : (isWaiting ? 'waiting' : (!isStarted ? 'ready' : 'playing'));

  // ── Stockfish setup (PVC) ───────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'PVC') return;
    const sf = createStockfishWorker();
    if (!sf) return;
    stockfishRef.current = sf;

    sf.onmessage = (e) => {
      const line = e.data;
      // Detect best move line: "bestmove e2e4 ..."
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const bestMove = parts[1];
        if (!bestMove || bestMove === '(none)') return;
        _applyAiMove(bestMove);
      }
    };

    sf.postMessage('uci');
    sf.postMessage('isready');

    return () => sf.terminate();
  }, [mode]);

  // ── When it's AI's turn in PVC mode ────────────────────────────────────
  useEffect(() => {
    if (mode !== 'PVC' || !stockfishRef.current || gameOver) return;
    const aiColor = myColor === 'white' ? 'b' : 'w';
    if (chessRef.current.turn() !== aiColor) return;

    // Depth maps to aiLevel (1-10 → depth 1-15)
    const depth = Math.min(15, Math.max(1, Math.floor(aiLevel * 1.5)));
    stockfishRef.current.postMessage(`position fen ${chessRef.current.fen()}`);
    stockfishRef.current.postMessage(`go depth ${depth}`);
  }, [fen, mode, myColor, aiLevel, gameOver]);

  function _applyAiMove(uciMove) {
    const from = uciMove.slice(0, 2);
    const to   = uciMove.slice(2, 4);
    const promo = uciMove.length === 5 ? uciMove[4] : 'q';

    let result;
    try {
      result = chessRef.current.move({ from, to, promotion: promo });
    } catch { return; }
    if (!result) return;

    setFen(chessRef.current.fen());
    setMoves(chessRef.current.history({ verbose: true }));
    _checkGameOver();
  }

  // ── Socket event listeners ─────────────────────────────────────────────
  useEffect(() => {
    const unsubMove = on('chess-move-made', ({ fen: newFen, moves: newMoves }) => {
      chessRef.current.load(newFen);
      setFen(newFen);
      setMoves(newMoves);
      _checkGameOver();
    });

    const unsubStarted = on('chess-game-started', () => {
      setIsStarted(true);
    });

    const unsubOver = on('chess-game-over', ({ result, reason }) => {
      setGameOver({ result, reason });
    });

    const unsubDrawOffer = on('chess-draw-offered', () => setDrawOffered(true));
    const unsubDrawDecline = on('chess-draw-declined', () => setDrawOffered(false));

    return () => {
      unsubMove();
      unsubStarted();
      unsubOver();
      unsubDrawOffer();
      unsubDrawDecline();
    };
  }, [on]);

  function _checkGameOver() {
    const chess = chessRef.current;
    if (!chess.isGameOver()) return;

    let result = 'DRAW';
    let reason = 'draw';
    const turn = chess.turn();

    if (chess.isCheckmate()) {
      result = turn === 'w' ? 'BLACK_WIN' : 'WHITE_WIN';
      reason = 'checkmate';
    } else if (chess.isStalemate()) reason = 'stalemate';
    else if (chess.isInsufficientMaterial()) reason = 'insufficient_material';
    else if (chess.isThreefoldRepetition()) reason = 'threefold_repetition';
    else if (chess.isDraw()) reason = 'fifty_move_rule';

    setGameOver({ result, reason });
  }

  // ── Player move handler ────────────────────────────────────────────────
  const handleMove = useCallback(({ from, to, promotion }) => {
    if (mode === 'PVP') {
      emit('chess-move', { roomCode, move: { from, to, promotion } });
    } else {
      // For PVC, we MUST apply the move locally
      try {
        chessRef.current.move({ from, to, promotion });
      } catch (err) {
        return; // Invalid move
      }
    }
    
    // For PVC, updating FEN will trigger Stockfish useEffect
    setFen(chessRef.current.fen());
    setMoves(chessRef.current.history({ verbose: true }));
    _checkGameOver();
  }, [emit, mode, roomCode]);

  // ── Action handlers ────────────────────────────────────────────────────
  const handleStartGame = () => emit('chess-start-game', { roomCode });
  
  const handleResign = () => {
    if (mode === 'PVP') {
      emit('chess-resign', { roomCode });
    } else {
      setGameOver({ result: myColor === 'white' ? 'BLACK_WIN' : 'WHITE_WIN', reason: 'resignation' });
    }
  };

  const handleOfferDraw = () => {
    if (mode === 'PVP') {
      emit('chess-offer-draw', { roomCode });
    } else {
      // In PVC mode, the AI "accepts" the draw offer automatically.
      setGameOver({ result: 'DRAW', reason: 'agreement' });
    }
  };

  const handleAcceptDraw  = () => { setDrawOffered(false); emit('chess-accept-draw', { roomCode }); };
  const handleDeclineDraw = () => { setDrawOffered(false); emit('chess-decline-draw', { roomCode }); };

  return (
    <div className="chess-screen">
      {/* Theme switcher — top right */}
      <div className="chess-theme-switcher">
        {Object.entries(BOARD_THEMES).map(([key, t]) => (
          <button
            key={key}
            className={`chess-theme-btn ${currentTheme === key ? 'chess-theme-btn--active' : ''}`}
            onClick={() => setCurrentTheme(key)}
            title={t.label}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="chess-layout">
        {/* Board area */}
        <div className="chess-board-area">
          <ChessBoard
            fen={fen}
            myColor={myColor}
            isMyTurn={isMyTurn}
            boardTheme={currentTheme}
            onMove={handleMove}
            gameOver={!!gameOver}
            disabled={status !== 'playing'}
          />
        </div>

        {/* Sidebar container para sincronização de altura */}
        <div className="chess-sidebar-container">
          <ChessSidebar
            myColor={myColor}
            whiteName={whiteName}
            blackName={blackName || (mode === 'PVC' ? `IA Nível ${aiLevel}` : null)}
            moves={moves}
            status={status}
            gameOver={gameOver}
            drawOffered={drawOffered}
            isMyTurn={isMyTurn}
            mode={mode}
            aiLevel={aiLevel}
            onStartGame={handleStartGame}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onAcceptDraw={handleAcceptDraw}
            onDeclineDraw={handleDeclineDraw}
            onBack={onBack}
            roomCode={roomCode}
          />
        </div>
      </div>
    </div>
  );
}
