/**
 * ChessScreen.jsx
 * Main game container. Manages Socket.IO events, Stockfish AI (PVC mode),
 * board state, game flow and UI composition.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessBoard, { BOARD_THEMES } from '../components/ChessBoard';
import ChessSidebar, { ChessTimer } from '../components/ChessSidebar';
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
  onShowReport,
}) {
  const { emit, on } = useChessSocket();

  // Fases de Setup: 'WAITING' (PVP) | 'DRAWING' | 'CHOOSING' | 'READY'
  const [setupPhase, setSetupPhase] = useState(mode === 'PVC' ? 'DRAWING' : (mode === 'PVP_LOCAL' ? 'READY' : 'WAITING'));
  const [drawWinner, setDrawWinner] = useState(null); // { userId, userName }
  const [assignedColors, setAssignedColors] = useState(mode === 'PVP_LOCAL' ? { white: {userId: 'p1', userName: 'Jogador 1'}, black: {userId: 'p2', userName: 'Jogador 2'} } : null); // { white: {userId}, black: {userId} }

  const [fen, setFen] = useState(INITIAL_FEN);
  const [moves, setMoves] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(boardTheme || 'wood');
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);

  // Timers (em segundos)
  const [whiteTime, setWhiteTime] = useState(timeLimit === undefined ? 600 : timeLimit);
  const [blackTime, setBlackTime] = useState(timeLimit === undefined ? 600 : timeLimit);

  const chessRef = useRef(new Chess());
  const stockfishRef = useRef(null);

  const myColor = mode === 'PVP_LOCAL' ? 'both' : (assignedColors ? (assignedColors.white.userId === myId ? 'white' : 'black') : 'white');
  const whiteName = assignedColors?.white?.userName || (mode === 'PVP_LOCAL' ? 'Jogador 1' : 'Aguardando...');
  const blackName = assignedColors?.black?.userName || (mode === 'PVP_LOCAL' ? 'Jogador 2' : 'Aguardando...');

  const isMyTurn = mode === 'PVP_LOCAL' ? true : (assignedColors && chessRef.current.turn() === (myColor === 'white' ? 'w' : 'b'));

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

    // Array de profundidades para os níveis de 1 a 10
    const profundidades = [1, 2, 3, 4, 5, 7, 9, 11, 13, 15];
    const depth = profundidades[aiLevel - 1] || 1;
    stockfishRef.current.postMessage(`position fen ${chessRef.current.fen()}`);
    stockfishRef.current.postMessage(`go depth ${depth}`);
  }, [fen, mode, myColor, aiLevel, gameOver]);

  function _applyAiMove(uciMove) {
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
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
    if (moves.length === 0) return; // Não inicia o cronômetro antes da primeira jogada (movimento das brancas)

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
  }, [status, gameOver, timeLimit, moves.length]);

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
      const resetTime = data.timeLimit !== undefined ? data.timeLimit : (timeLimit === undefined ? 600 : timeLimit);
      setWhiteTime(resetTime);
      setBlackTime(resetTime);
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
        white = color === 'white' ? { userId: myId, userName: user?.fullName || 'Você' } : { userId: 'AI', userName: 'Computador' };
        black = color === 'black' ? { userId: myId, userName: user?.fullName || 'Você' } : { userId: 'AI', userName: 'Computador' };
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
  useEffect(() => {
    if (gameOver) {
      const timer = setTimeout(() => {
        setShowGameOverOverlay(true);
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      setShowGameOverOverlay(false);
    }
  }, [gameOver]);

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
      const resetTime = timeLimit === undefined ? 600 : timeLimit;
      setWhiteTime(resetTime);
      setBlackTime(resetTime);
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

  const opponentColor = myColor === 'white' ? 'black' : 'white';
  const opponentName = myColor === 'white' ? (blackName || (mode === 'PVC' ? `IA Nível ${aiLevel}` : 'Aguardando...')) : (whiteName || 'Aguardando...');
  const playerName = myColor === 'white' ? (whiteName || 'Você') : (blackName || 'Você');

  const MobileHUD = ({ playerColor, name, playerTime, isActive, isTop }) => (
    <div className={`chess-mobile-hud ${isTop ? 'top-hud' : 'bottom-hud'} md:hidden`}>
      <div className="chess-hud-player">
        <div className={`chess-hud-avatar chess-hud-avatar--${playerColor}`}>
          {playerColor === 'white' ? '♔' : '♚'}
        </div>
        <span className="chess-hud-name">{name}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="chess-hud-timer">
          {status === 'playing' && <ChessTimer seconds={playerTime} active={isActive} />}
        </div>
        {!isTop && (
          <button
            className="chess-menu-btn"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            ☰ Menu
          </button>
        )}
      </div>
    </div>
  );

  // Check if I won for styling
  const iWon = gameOver && (
    (gameOver.result === 'WHITE_WIN' && myColor === 'white') ||
    (gameOver.result === 'BLACK_WIN' && myColor === 'black')
  );
  
  const REASON_LABELS = {
    checkmate: 'Por Xeque-Mate',
    stalemate: 'Por Afogamento',
    insufficient_material: 'Material Insuficiente',
    threefold_repetition: 'Repetição de Movimentos',
    fifty_move_rule: 'Regra dos 50 Movimentos',
    timeout: 'Tempo Esgotado',
    resignation: 'Por Desistência'
  };
  
  const getGameOverMsg = () => {
    if (!gameOver) return '';
    if (gameOver.result === 'DRAW') return '🤝 EMPATE!';
    return iWon ? 'VOCÊ VENCEU!' : 'VOCÊ PERDEU';
  };

  return (
    <div className={`chess-screen relative overflow-hidden ${(mode === 'PVC' || mode === 'PVP_LOCAL') ? 'offline-responsive' : ''} ${mode === 'PVP_LOCAL' ? 'rotate-opponent' : ''}`}>
      {/* Elementos normais do jogo. Serão "borrados" quando terminar */}
      <div className={`w-full h-full flex flex-col absolute inset-0 transition-all duration-1000 ${showGameOverOverlay ? 'blur-md scale-105 pointer-events-none opacity-50' : ''}`}>

      {/* Theme switcher — top right (Desktop) */}
      <div className="chess-theme-switcher hidden md:flex">
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

      {/* Top Mobile HUD (Opponent) */}
      <MobileHUD
        playerColor={opponentColor}
        name={opponentName}
        playerTime={opponentColor === 'white' ? whiteTime : blackTime}
        isActive={status === 'playing' && !isMyTurn}
        isTop={true}
      />

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
            gameOver={gameOver}
            disabled={status !== 'playing'}
            lastMove={moves[moves.length - 1]}
          />
        </div>

        {/* Mobile HUD Bottom (You) */}
        <MobileHUD
          playerColor={myColor}
          name={playerName}
          playerTime={myColor === 'white' ? whiteTime : blackTime}
          isActive={status === 'playing' && isMyTurn}
          isTop={false}
        />

        {/* Backdrop for Mobile Menu */}
        <div
          className={`chess-menu-backdrop md:hidden ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Sidebar container para sincronização de altura */}
        <div className={`chess-sidebar-container ${isMobileMenuOpen ? 'open' : ''}`}>

          {/* Header Mobile com Theme Switcher e Fechar */}
          <div className="flex md:hidden justify-between items-center mb-4 pb-4 border-b-2 border-gray-100">
            <div className="flex gap-2">
              {Object.entries(BOARD_THEMES).map(([key, t]) => (
                <button
                  key={key}
                  className={`chess-theme-btn !min-h-[32px] !px-3 ${currentTheme === key ? 'chess-theme-btn--active' : ''}`}
                  onClick={() => setCurrentTheme(key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
            >
              ✕
            </button>
          </div>

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
            onShowReport={onShowReport}
          />
        </div>
      </div>
      </div>

      {/* OVERLAY DE FIM DE JOGO (Exibe 4 segundos após o fim) */}
      {showGameOverOverlay && (
        <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center p-4">

          <div className="absolute inset-0 z-[120] pointer-events-none overflow-hidden">
            {iWon ? (
              [...Array(60)].map((_, i) => (
                <div key={i} className="confetti" style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#FFCE00', '#FFFFFF', '#009660', '#3b82f6', '#ef4444'][i % 5],
                  animationDelay: `${Math.random() * 4}s`,
                  animationDuration: `${2.5 + Math.random() * 2}s`,
                  width: `${8 + Math.random() * 10}px`,
                  height: `${Math.random() * 12 + 4}px`,
                  position: 'absolute',
                  top: '-20px'
                }} />
              ))
            ) : (
              [...Array(50)].map((_, i) => (
                <div key={i} className="rain" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1.5}s`,
                  animationDuration: `${1 + Math.random() * 1}s`,
                  opacity: Math.random() * 0.5,
                  position: 'absolute',
                  top: '-20px',
                  width: '2px',
                  height: '40px',
                  backgroundColor: 'rgba(255,255,255,0.7)'
                }} />
              ))
            )}
          </div>
          <section className={`p-6 sm:p-10 rounded-[3rem] flex flex-col items-center text-center max-w-lg w-full shadow-[0_40px_100px_rgba(0,0,0,0.5)] transform transition-all animate-in zoom-in duration-700 border-[10px] sm:border-[12px] bg-white ${iWon ? 'border-[#FFCE00]' : (gameOver?.result === 'DRAW' ? 'border-gray-400' : 'border-red-500')} z-[130]`}>
            <h1 className="text-base sm:text-xl font-black mb-1 sm:mb-2 uppercase tracking-widest text-[#009660] opacity-50">Fim de Jogo</h1>
            {mode === 'PVC' || mode === 'PVP_LOCAL' ? (
              <>
                <h2 className={`font-black mb-2 sm:mb-3 uppercase italic tracking-tighter leading-none ${iWon ? 'text-5xl sm:text-7xl text-[#FFCE00]' : (gameOver?.result === 'DRAW' ? 'text-4xl sm:text-6xl text-gray-500' : 'text-4xl sm:text-6xl text-red-500')}`}>
                  {gameOver?.result === 'DRAW' ? 'EMPATE!' : (iWon ? 'VITÓRIA!' : 'FOI QUASE!')}
                </h2>
                {gameOver?.result !== 'DRAW' && (
                  <div className="flex flex-col gap-1 mb-6 sm:mb-8">
                    <p className="text-xs sm:text-sm font-black text-gray-400 uppercase tracking-widest leading-none">Vencedor:</p>
                    <p className={`text-2xl sm:text-4xl font-black uppercase italic ${iWon ? 'text-orange-500' : 'text-emerald-700'}`}>
                      🏆 AS {gameOver?.result === 'WHITE_WIN' ? 'BRANCAS' : 'PRETAS'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <h2 className={`font-black mb-2 sm:mb-3 uppercase italic tracking-tighter leading-none ${iWon ? 'text-5xl sm:text-7xl text-[#FFCE00]' : (gameOver?.result === 'DRAW' ? 'text-4xl sm:text-6xl text-gray-500' : 'text-4xl sm:text-6xl text-red-500')}`}>
                {getGameOverMsg()}
              </h2>
            )}
            <div className={`text-base sm:text-lg font-black mb-6 sm:mb-8 p-4 rounded-[1.5rem] shadow-inner ${iWon ? 'bg-yellow-50 text-yellow-800' : (gameOver?.result === 'DRAW' ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-900')}`}>
              {gameOver?.reason ? (REASON_LABELS[gameOver.reason] || gameOver.reason) : ''}
            </div>
            
            <div className="flex flex-col gap-3 sm:gap-4 w-full">
              {rematchRequested && !opponentWantsRematch ? (
                <div className="bg-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl sm:rounded-3xl text-lg font-black flex items-center justify-center gap-3 border-2 border-emerald-200 shadow-inner">
                  <span>⏳</span> AGUARDANDO OPONENTE...
                </div>
              ) : (
                <button onClick={handleRematch} className="group bg-[#009660] hover:bg-[#00a86b] text-white font-black px-6 py-4 rounded-2xl sm:rounded-3xl text-xl sm:text-2xl transition-all shadow-[0_6px_0_#004d32] active:translate-y-1 active:shadow-none flex items-center justify-center gap-3">
                  <span className="group-hover:animate-spin">🔄</span> JOGAR DE NOVO
                </button>
              )}

              {onShowReport && (
                <button onClick={onShowReport} className="bg-indigo-500 hover:bg-indigo-600 text-white font-black px-6 py-4 rounded-2xl sm:rounded-3xl text-xl transition-all shadow-[0_6px_0_#3730a3] active:translate-y-1 active:shadow-none flex items-center justify-center gap-3">
                  <span>📊</span> VER RELATÓRIO
                </button>
              )}

              <button onClick={onBack} className="bg-white hover:bg-red-50 text-red-500 font-black px-6 py-4 rounded-2xl sm:rounded-3xl text-xl sm:text-2xl transition-all shadow-[0_6px_0_#e5e7eb] active:translate-y-1 active:shadow-none border-2 border-gray-100 flex items-center justify-center gap-3">
                <span>🏠</span> SAIR DO JOGO
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
