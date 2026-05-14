/**
 * ChessScreen.jsx
 * Main game container. Manages Socket.IO events, Stockfish AI (PVC mode),
 * board state, game flow and UI composition.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessBoard, { BOARD_THEMES } from '../components/ChessBoard';
import ChessSidebar from '../components/ChessSidebar';
import CapturedPieces from '../components/CapturedPieces';
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
  mode,          // 'PVP' | 'PVC'
  aiLevel,       // 1-10
  timeLimit,     // Em segundos
  myId,          // ID do jogador nesta sessão
  boardTheme,
  onBack,
}) {
  const { emit, on } = useChessSocket();

  // Fases de Setup: 'WAITING' (PVP) | 'DRAWING' | 'CHOOSING' | 'READY'
  const [setupPhase, setSetupPhase] = useState(mode === 'PVC' ? 'DRAWING' : 'WAITING');
  const [drawWinner, setDrawWinner] = useState(null); // { userId, userName }
  const [assignedColors, setAssignedColors] = useState(null); // { white: {userId}, black: {userId} }

  const [fen, setFen] = useState(INITIAL_FEN);
  const [moves, setMoves] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(boardTheme || 'wood');
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);
  
  // Timers (em segundos)
  const [whiteTime, setWhiteTime] = useState(timeLimit === undefined ? 600 : timeLimit); 
  const [blackTime, setBlackTime] = useState(timeLimit === undefined ? 600 : timeLimit);

  const chessRef = useRef(new Chess());
  const stockfishRef = useRef(null);

  const myColor = assignedColors ? (assignedColors.white.userId === user.id ? 'white' : 'black') : 'white';
  const whiteName = assignedColors?.white?.userName || 'Aguardando...';
  const blackName = assignedColors?.black?.userName || 'Aguardando...';
  
  const isMyTurn = assignedColors && chessRef.current.turn() === (myColor === 'white' ? 'w' : 'b');

  // Compute status
  const isWaiting = mode === 'PVP' && !assignedColors;
  const status = gameOver ? 'finished' : (isWaiting ? 'waiting' : 'playing');

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

  // ── Timer Logic (Visual Mock) ──────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing' || gameOver || timeLimit === null) return;

    const interval = setInterval(() => {
      const turn = chessRef.current.turn();
      
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
  }, [status, gameOver, timeLimit]);

  const handleTimeout = useCallback((lostColor) => {
    if (gameOver) return;
    
    if (mode === 'PVP') {
      // Option C: Validação Tardia (Lazy Timestamp Evaluation)
      // Delegamos ao backend a autoridade de confirmar o fim do jogo
      emit('chess-claim-timeout', { roomCode });
    } else {
      // Modo local (PVC), nós mesmos encerramos
      const result = lostColor === 'white' ? 'BLACK_WIN' : 'WHITE_WIN';
      setGameOver({ result, reason: 'timeout' });
    }
  }, [gameOver, mode, roomCode, emit]);

  // ── Socket event listeners ─────────────────────────────────────────────
  useEffect(() => {
    const unsubMove = on('chess-move-made', ({ fen: newFen, moves: newMoves }) => {
      chessRef.current.load(newFen);
      setFen(newFen);
      setMoves(newMoves);
      _checkGameOver();
    });

    const unsubDrawResult = on('chess-draw-result', (data) => {
      setDrawWinner(data);
      setSetupPhase('DRAWING');
      setTimeout(() => setSetupPhase('CHOOSING'), 2000);
    });

    const unsubGameReady = on('chess-game-ready', (data) => {
      setAssignedColors({ white: data.white, black: data.black });
      chessRef.current.load(data.fen || INITIAL_FEN);
      setFen(data.fen || INITIAL_FEN);
      setMoves(data.moves || []);
      setSetupPhase('READY');
      setGameOver(null);
      setRematchRequested(false);
      setOpponentWantsRematch(false);
    });

    const unsubOver = on('chess-game-over', ({ result, reason }) => {
      setGameOver({ result, reason });
    });

    const unsubDrawOffer = on('chess-draw-offered', () => setDrawOffered(true));
    const unsubDrawDecline = on('chess-draw-declined', () => setDrawOffered(false));
    const unsubRematchReq = on('chess-rematch-requested', () => setOpponentWantsRematch(true));

    return () => {
      unsubMove();
      unsubDrawResult();
      unsubGameReady();
      unsubOver();
      unsubDrawOffer();
      unsubDrawDecline();
      unsubRematchReq();
    };
  }, [on]);

  // Sorteio Local para PVC
  useEffect(() => {
    if (mode === 'PVC' && setupPhase === 'DRAWING') {
      const winner = Math.random() > 0.5 ? { userId: myId, userName: user?.fullName || 'Você' } : { userId: 'AI', userName: 'Computador' };
      setTimeout(() => {
        setDrawWinner(winner);
        setTimeout(() => setSetupPhase('CHOOSING'), 2000);
      }, 1000);
    }
  }, [mode, setupPhase, user]);

  const handlePickColor = (color) => {
    if (mode === 'PVC') {
      const iAmWinner = drawWinner.userId == myId;
      let white, black;
      if (iAmWinner) {
        white = color === 'white' ? { userId: user.id, userName: user.fullName || 'Você' } : { userId: 'AI', userName: 'Computador' };
        black = color === 'black' ? { userId: user.id, userName: user.fullName || 'Você' } : { userId: 'AI', userName: 'Computador' };
      } else {
        // IA escolhe (já tratado no useEffect abaixo)
        return;
      }
      setAssignedColors({ white, black });
      setSetupPhase('READY');
    } else {
      emit('chess-pick-color', { roomCode, color });
    }
  };

  const [aiChoiceFeedback, setAiChoiceFeedback] = useState(null);

  // IA escolhe cor se vencer sorteio
  useEffect(() => {
    if (mode === 'PVC' && setupPhase === 'CHOOSING' && drawWinner?.userId === 'AI') {
      const timer = setTimeout(() => {
        const aiChoice = Math.random() > 0.5 ? 'white' : 'black';
        setAiChoiceFeedback(aiChoice);
        
        // Pequeno delay para o player ver a escolha antes de iniciar
        setTimeout(() => {
          const white = aiChoice === 'white' ? { userId: 'AI', userName: 'Computador' } : { userId: myId, userName: user?.fullName || 'Você' };
          const black = aiChoice === 'black' ? { userId: 'AI', userName: 'Computador' } : { userId: myId, userName: user?.fullName || 'Você' };
          setAssignedColors({ white, black });
          setSetupPhase('READY');
          setAiChoiceFeedback(null);
        }, 1500);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [mode, setupPhase, drawWinner, user]);

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
  const handleRematch = () => {
    if (mode === 'PVC') {
      const oldWhite = assignedColors.white;
      const oldBlack = assignedColors.black;
      setAssignedColors({ white: oldBlack, black: oldWhite });
      chessRef.current = new Chess();
      setFen(INITIAL_FEN);
      setMoves([]);
      setGameOver(null);
      setRematchRequested(false);
      setOpponentWantsRematch(false);
    } else {
      setRematchRequested(true);
      emit('chess-request-rematch', { roomCode });
    }
  };

  const handleResign = () => {
    if (gameOver) return;
    if (mode === 'PVC') {
      setGameOver({ result: myColor === 'white' ? 'BLACK_WIN' : 'WHITE_WIN', reason: 'resignation' });
    } else {
      emit('chess-resign', { roomCode });
    }
  };

  const handleOfferDraw = () => {
    if (gameOver || mode === 'PVC') return;
    emit('chess-offer-draw', { roomCode });
  };

  const handleAcceptDraw = () => {
    if (gameOver || mode === 'PVC') return;
    emit('chess-accept-draw', { roomCode });
    setDrawOffered(false);
  };

  const handleDeclineDraw = () => {
    if (gameOver || mode === 'PVC') return;
    emit('chess-decline-draw', { roomCode });
    setDrawOffered(false);
  };

  const handleStartGame = () => {
    // No novo fluxo, o jogo inicia após a escolha da cor ou sorteio
    // mas mantemos para compatibilidade com o sidebar se necessário
  };

  if (setupPhase === 'WAITING' && mode === 'PVP') {
    return (
      <div className="velha-container flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm">
          <div className="w-16 h-16 border-4 border-t-[#769656] border-gray-200 rounded-full animate-spin mx-auto mb-6"></div>
          
          <h2 className="text-2xl font-black mb-2 uppercase text-gray-800">Aguardando Oponente</h2>
          <p className="text-gray-500 mb-8 font-medium">Compartilhe o código abaixo com seu adversário:</p>
          
          <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 mb-8">
            <span className="text-4xl font-black tracking-[0.2em] text-[#769656]">{roomCode}</span>
          </div>

          <p className="text-xs text-gray-400 mb-6 italic">O sorteio começará automaticamente assim que alguém entrar.</p>
          
          <button 
            onClick={onBack} 
            className="w-full py-3 text-sm text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
          >
            Cancelar e Sair
          </button>
        </div>
      </div>
    );
  }

  if (setupPhase === 'DRAWING') {
    return (
      <div className="velha-container flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative">
          <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter text-gray-800">Realizando Sorteio...</h2>
          <div className="velha-draw-coin-wrapper mb-8">
            <div className="velha-draw-coin">
              <div className="coin-face front">?</div>
              <div className="coin-face back">⚔️</div>
            </div>
          </div>
          {drawWinner && (
            <div className="animate-bounce font-black text-[#769656] text-xl">
              Vencedor: {drawWinner.userName}!
            </div>
          )}
        </div>
      </div>
    );
  }

  if (setupPhase === 'CHOOSING') {
    const iAmWinner = drawWinner.userId == myId;
    return (
      <div className="velha-container flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm">
          {iAmWinner ? (
            <>
              <h2 className="text-2xl font-black mb-2 uppercase text-gray-800">Você Venceu!</h2>
              <p className="text-gray-500 mb-8 font-medium">Escolha sua cor para começar:</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => handlePickColor('white')}
                  className="flex-1 p-6 rounded-2xl border-2 border-gray-200 hover:border-[#769656] transition-all group"
                >
                  <span className="text-4xl mb-2 block group-hover:scale-110 transition-transform">⚪</span>
                  <strong className="block text-sm uppercase">Brancas</strong>
                  <span className="text-[10px] text-gray-400">Começa o Jogo</span>
                </button>
                <button 
                  onClick={() => handlePickColor('black')}
                  className="flex-1 p-6 rounded-2xl border-2 border-gray-200 hover:border-[#769656] transition-all group"
                >
                  <span className="text-4xl mb-2 block group-hover:scale-110 transition-transform">⚫</span>
                  <strong className="block text-sm uppercase">Pretas</strong>
                  <span className="text-[10px] text-gray-400">Joga depois</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black mb-2 uppercase text-gray-800">{drawWinner.userName} Venceu</h2>
              <p className="text-gray-500 mb-8 font-medium">
                {aiChoiceFeedback 
                  ? `O Computador escolheu as ${aiChoiceFeedback === 'white' ? 'BRANCAS' : 'PRETAS'}!` 
                  : 'Aguardando escolha da cor...'}
              </p>
              {aiChoiceFeedback ? (
                <div className="text-6xl animate-bounce mb-4">
                  {aiChoiceFeedback === 'white' ? '⚪' : '⚫'}
                </div>
              ) : (
                <div className="w-12 h-12 border-4 border-t-[#769656] border-gray-100 rounded-full animate-spin mx-auto"></div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

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
        {/* Captured pieces area */}
        <div className="chess-captured-container">
          <CapturedPieces moves={moves} myColor={myColor} />
        </div>

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
            lastMove={moves[moves.length - 1]}
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
            onRematch={handleRematch}
            rematchRequested={rematchRequested}
            opponentWantsRematch={opponentWantsRematch}
            onBack={onBack}
            roomCode={roomCode}
            whiteTime={whiteTime}
            blackTime={blackTime}
          />
        </div>
      </div>
    </div>
  );
}
