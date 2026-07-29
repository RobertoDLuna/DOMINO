import React, { useState, useEffect, useCallback } from 'react';
import { useVelhaSocket } from '../../../hooks/useVelhaSocket';
import './xadrez-velha.css';

// ── CONSTANTES E REGRAS ──────────────────────────────────────────────────
const PIECES = {
  T: { emoji: '♜', name: 'Torre' },
  B: { emoji: '♝', name: 'Bispo' },
  C: { emoji: '♞', name: 'Cavalo' }
};

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
  [0, 4, 8], [2, 4, 6]           // Diagonais
];

function isPathClear(board, r1, c1, r2, c2) {
  const stepR = r2 > r1 ? 1 : (r2 < r1 ? -1 : 0);
  const stepC = c2 > c1 ? 1 : (c2 < c1 ? -1 : 0);
  let currR = r1 + stepR;
  let currC = c1 + stepC;
  while (currR !== r2 || currC !== c2) {
    if (board[currR * 3 + currC]) return false;
    currR += stepR;
    currC += stepC;
  }
  return true;
}

function getValidMoves(board, idx) {
  if (!board[idx]) return [];
  const type = board[idx][1];
  const r = Math.floor(idx / 3);
  const c = idx % 3;
  const moves = [];

  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    const tr = Math.floor(i / 3);
    const tc = i % 3;
    const dr = Math.abs(r - tr);
    const dc = Math.abs(c - tc);

    if (type === 'T') {
      if (r === tr || c === tc) {
        if (isPathClear(board, r, c, tr, tc)) moves.push(i);
      }
    } else if (type === 'B') {
      if (dr === dc) {
        if (isPathClear(board, r, c, tr, tc)) moves.push(i);
      }
    } else if (type === 'C') {
      if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) moves.push(i);
    }
  }
  return moves;
}

function checkWin(board) {
  for (let l of WIN_LINES) {
    if (board[l[0]] && board[l[0]][0] === board[l[1]]?.[0] && board[l[0]][0] === board[l[2]]?.[0]) {
      return { winner: board[l[0]][0], line: l };
    }
  }
  return null;
}

function checkDraw(board, turn) {
  for (let i = 0; i < 9; i++) {
    if (board[i] && board[i][0] === turn) {
      if (getValidMoves(board, i).length > 0) return false;
    }
  }
  return true;
}

// ── IA MINIMAX ───────────────────────────────────────────────────────────
function evaluateBoard(board, myColor) {
  const oppColor = myColor === 'W' ? 'B' : 'W';
  const win = checkWin(board);
  if (win) {
    if (win.winner === myColor) return 1000;
    if (win.winner === oppColor) return -1000;
  }
  // Heurística simples baseada em controle do centro e linhas
  let score = 0;
  if (board[4] && board[4][0] === myColor) score += 5;
  if (board[4] && board[4][0] === oppColor) score -= 5;
  return score;
}

function getPossibleActions(board, inventory, turn, phase) {
  const actions = [];
  if (phase === 'DROP') {
    ['T', 'B', 'C'].forEach(pType => {
      if (inventory[turn][pType] > 0) {
        for (let i = 0; i < 9; i++) {
          if (!board[i]) actions.push({ type: 'drop', piece: pType, idx: i });
        }
      }
    });
  } else {
    for (let i = 0; i < 9; i++) {
      if (board[i] && board[i][0] === turn) {
        const moves = getValidMoves(board, i);
        moves.forEach(to => actions.push({ type: 'move', from: i, to }));
      }
    }
  }
  return actions;
}

function minimax(board, inventory, turn, phase, depth, alpha, beta, isMaximizing, myColor) {
  const oppColor = myColor === 'W' ? 'B' : 'W';
  const win = checkWin(board);
  if (win) return { score: win.winner === myColor ? 1000 + depth : -1000 - depth };

  if (phase === 'MOVE' && checkDraw(board, turn)) return { score: turn === myColor ? -1000 - depth : 1000 + depth };
  if (depth === 0) return { score: evaluateBoard(board, myColor) };

  const actions = getPossibleActions(board, inventory, turn, phase);
  if (actions.length === 0) return { score: 0 };

  let bestAction = actions[Math.floor(Math.random() * actions.length)]; // Random fallback

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let action of actions) {
      // Simula a ação
      const newBoard = [...board];
      const newInv = JSON.parse(JSON.stringify(inventory));
      let newPhase = phase;

      if (action.type === 'drop') {
        newBoard[action.idx] = turn + action.piece;
        newInv[turn][action.piece]--;
        const invW = Object.values(newInv.W).reduce((a, b) => a + b, 0);
        const invB = Object.values(newInv.B).reduce((a, b) => a + b, 0);
        if (invW === 0 && invB === 0) newPhase = 'MOVE';
      } else {
        newBoard[action.to] = newBoard[action.from];
        newBoard[action.from] = null;
      }

      const evalResult = minimax(newBoard, newInv, oppColor, newPhase, depth - 1, alpha, beta, false, myColor);
      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestAction = action;
      }
      alpha = Math.max(alpha, evalResult.score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, action: bestAction };
  } else {
    let minEval = Infinity;
    for (let action of actions) {
      // Simula a ação
      const newBoard = [...board];
      const newInv = JSON.parse(JSON.stringify(inventory));
      let newPhase = phase;

      if (action.type === 'drop') {
        newBoard[action.idx] = turn + action.piece;
        newInv[turn][action.piece]--;
        const invW = Object.values(newInv.W).reduce((a, b) => a + b, 0);
        const invB = Object.values(newInv.B).reduce((a, b) => a + b, 0);
        if (invW === 0 && invB === 0) newPhase = 'MOVE';
      } else {
        newBoard[action.to] = newBoard[action.from];
        newBoard[action.from] = null;
      }

      const evalResult = minimax(newBoard, newInv, oppColor, newPhase, depth - 1, alpha, beta, true, myColor);
      if (evalResult.score < minEval) {
        minEval = evalResult.score;
        bestAction = action;
      }
      beta = Math.min(beta, evalResult.score);
      if (beta <= alpha) break;
    }
    return { score: minEval, action: bestAction };
  }
}

function SidebarVictoryAnimation({ type }) {
  const particles = Array.from({ length: 20 });
  const symbols = type === 'win' ? ['🏆', '⭐', '✨', '👑'] : 
                 type === 'loss' ? ['💀', '❌', '📉', '♟️'] : 
                 ['🤝', '⚖️', '🏳️', '✨'];

  return (
    <div className={`sidebar-win-animation sidebar-animation-${type}`}>
      {particles.map((_, i) => (
        <div 
          key={i} 
          className="sidebar-particle" 
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

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────
export default function XadrezVelhaGame({ user, roomData, onExit }) {
  const { emit, on } = useVelhaSocket();

  const isPVC = roomData.mode === 'PVC';
  const isPVPLocal = roomData.mode === 'PVP_LOCAL';

  // Fases de Setup: 'WAITING' (PVP) | 'DRAWING' | 'CHOOSING' | 'READY'
  const [setupPhase, setSetupPhase] = useState(isPVC ? 'DRAWING' : (isPVPLocal ? 'READY' : 'WAITING'));
  const [drawWinner, setDrawWinner] = useState(null); // { userId, userName }
  const [assignedColors, setAssignedColors] = useState(isPVPLocal ? { white: {userId: 'p1', userName: 'Jogador 1'}, black: {userId: 'p2', userName: 'Jogador 2'} } : null); // { white: {userId}, black: {userId} }

  // Estado Local do Jogo
  const [board, setBoard] = useState(Array(9).fill(null));
  const [inventory, setInventory] = useState({ W: { T: 1, C: 1, B: 1 }, B: { T: 1, C: 1, B: 1 } });
  const [turn, setTurn] = useState('W');
  const [phase, setPhase] = useState('DROP'); // DROP | MOVE
  const [boardHistory, setBoardHistory] = useState([]);

  const [selectedDropPiece, setSelectedDropPiece] = useState(null);
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(null);
  const [validMoves, setValidMoves] = useState([]);

  const [gameOver, setGameOver] = useState(null); // { result, reason, winLine }
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);
  const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);

  // Derivados de Cor
  const myId = roomData.myId || user?.id || 'YOU';
  const myColor = isPVPLocal ? 'both' : (assignedColors ? (assignedColors.white.userId == myId ? 'white' : 'black') : 'white');
  const myColorCode = isPVPLocal ? turn : (myColor === 'white' ? 'W' : 'B');
  const oppColorCode = myColorCode === 'W' ? 'B' : 'W';

  // ── ATUALIZAÇÕES DO SOCKET (PVP/PVC) ───────────────────────────────────
  useEffect(() => {
    const unsubOpponent = on('velha-opponent-joined', () => {
      // No backend, o sorteio é automático ao entrar o segundo player
    });

    const unsubDrawResult = (data) => {
      // Ajusta para o formato esperado pelo componente: { userId: ..., userName: ... }
      setDrawWinner({ userId: data.winnerId, userName: data.winnerName });
      setSetupPhase('DRAWING');
      setTimeout(() => setSetupPhase('CHOOSING'), 2000);
    };

    const offDraw = on('velha-draw-result', unsubDrawResult);

    const offReady = on('velha-game-ready', (data) => {
      setAssignedColors({ white: data.white, black: data.black });
      setBoard(data.board);
      setInventory(data.inventory);
      setTurn(data.turn);
      setPhase(data.phase);
      setBoardHistory([data.board.join(',')]);
      setGameOver(null);
      setRematchRequested(false);
      setOpponentWantsRematch(false);
      setShowGameOverOverlay(false);
      setSetupPhase('READY');
    });

    const unsubDrop = on('velha-piece-dropped', (data) => {
      setBoard(data.board);
      setInventory(data.inventory);
      setTurn(data.turn);
      setPhase(data.phase);
      setSelectedDropPiece(null);
    });

    const unsubMove = on('velha-piece-moved', (data) => {
      setBoard(data.board);
      setTurn(data.turn);
      setSelectedMoveIdx(null);
      setValidMoves([]);
    });

    const unsubOver = on('velha-game-over', (data) => {
      setGameOver(data);
    });

    const unsubRematchReq = on('velha-rematch-requested', () => {
      setOpponentWantsRematch(true);
    });

    return () => {
      unsubOpponent();
      offDraw();
      offReady();
      unsubDrop();
      unsubMove();
      unsubOver();
      unsubRematchReq();
    };
  }, [on, myId]);

  // Sorteio Local para PVC
  useEffect(() => {
    if (isPVC && setupPhase === 'DRAWING') {
      const winner = Math.random() > 0.5 ? { userId: myId, userName: roomData.whiteName } : { userId: 'AI', userName: 'Computador' };
      setTimeout(() => {
        setDrawWinner(winner);
        setTimeout(() => setSetupPhase('CHOOSING'), 2000);
      }, 1000);
    }
  }, [isPVC, setupPhase, roomData, myId]);

  const handlePickColor = (color) => {
    if (isPVC) {
      const iAmWinner = drawWinner.userId === myId;
      const pickedColor = color; // 'white' | 'black'

      let white, black;
      if (iAmWinner) {
        white = pickedColor === 'white' ? { userId: myId, userName: roomData.whiteName } : { userId: 'AI', userName: 'Computador' };
        black = pickedColor === 'black' ? { userId: myId, userName: roomData.whiteName } : { userId: 'AI', userName: 'Computador' };
      } else {
        // Se a IA ganhou o sorteio, ela escolhe aleatoriamente
        // Já tratado no useEffect de IA escolha
      }

      setAssignedColors({ white, black });
      setSetupPhase('READY');
    } else {
      emit('velha-pick-color', { roomCode: roomData.roomCode, color });
    }
  };

  const [aiChoiceFeedback, setAiChoiceFeedback] = useState(null);

  // Se a IA ganhar o sorteio, ela escolhe automaticamente
  useEffect(() => {
    if (isPVC && setupPhase === 'CHOOSING' && drawWinner?.userId === 'AI') {
      const timer = setTimeout(() => {
        const aiChoice = Math.random() > 0.5 ? 'white' : 'black';
        setAiChoiceFeedback(aiChoice);

        setTimeout(() => {
          const white = aiChoice === 'white' ? { userId: 'AI', userName: 'Computador' } : { userId: myId, userName: roomData.whiteName };
          const black = aiChoice === 'black' ? { userId: 'AI', userName: 'Computador' } : { userId: myId, userName: roomData.whiteName };
          setAssignedColors({ white, black });
          setSetupPhase('READY');
          setAiChoiceFeedback(null);
        }, 1500);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isPVC, setupPhase, drawWinner, roomData]);

  useEffect(() => {
    if (gameOver) {
      const timer = setTimeout(() => setShowGameOverOverlay(true), 7000);
      return () => clearTimeout(timer);
    } else {
      setShowGameOverOverlay(false);
    }
  }, [gameOver]);

  // ── IA JOGANDO (PVC) ────────────────────────────────────────────────────
  useEffect(() => {
    if (isPVC && !gameOver && turn === oppColorCode && setupPhase === 'READY') {
      const timer = setTimeout(() => {
        const depths = { 1: 0, 2: 2, 3: 3, 4: 5, 5: 7 };
        const depth = depths[roomData.aiLevel || 3];

        let actionToPlay;
        if (depth === 0) {
          const actions = getPossibleActions(board, inventory, turn, phase);
          actionToPlay = actions[Math.floor(Math.random() * actions.length)];
        } else {
          const aiResult = minimax(board, inventory, turn, phase, depth, -Infinity, Infinity, true, oppColorCode);
          actionToPlay = aiResult.action;
        }

        if (actionToPlay) {
          if (actionToPlay.type === 'drop') {
            handleLocalDrop(actionToPlay.idx, actionToPlay.piece, oppColorCode);
          } else {
            handleLocalMove(actionToPlay.from, actionToPlay.to, oppColorCode);
          }
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [turn, isPVC, gameOver, board, inventory, phase, setupPhase]);

  // Lógica local para PVC
  const handleLocalDrop = (idx, pieceType, colorCode) => {
    const newBoard = [...board];
    newBoard[idx] = colorCode + pieceType;
    const newInv = { ...inventory, [colorCode]: { ...inventory[colorCode], [pieceType]: inventory[colorCode][pieceType] - 1 } };

    let newPhase = phase;
    const invW = Object.values(newInv.W).reduce((a, b) => a + b, 0);
    const invB = Object.values(newInv.B).reduce((a, b) => a + b, 0);
    if (invW === 0 && invB === 0) newPhase = 'MOVE';

    setBoard(newBoard);
    setInventory(newInv);
    setPhase(newPhase);
    setTurn(colorCode === 'W' ? 'B' : 'W');
    setSelectedDropPiece(null);

    const newHistory = [...boardHistory, newBoard.join(',')];
    setBoardHistory(newHistory);

    const win = checkWin(newBoard);
    if (win) {
      setGameOver({ result: win.winner === 'W' ? 'WHITE_WIN' : 'BLACK_WIN', reason: 'checkmate', winLine: win.line });
      return;
    }

    if (newPhase === 'MOVE' && checkDraw(newBoard, colorCode === 'W' ? 'B' : 'W')) {
      setGameOver({ result: 'DRAW', reason: 'stalemate' });
      return;
    }

    // Repetição 3x
    const repetitions = newHistory.filter(s => s === newBoard.join(',')).length;
    if (repetitions >= 3) {
      setGameOver({ result: 'DRAW', reason: 'repetition' });
    }
  };

  const handleLocalMove = (from, to, colorCode) => {
    const newBoard = [...board];
    newBoard[to] = newBoard[from];
    newBoard[from] = null;

    setBoard(newBoard);
    setTurn(colorCode === 'W' ? 'B' : 'W');
    setSelectedMoveIdx(null);
    setValidMoves([]);

    const newHistory = [...boardHistory, newBoard.join(',')];
    setBoardHistory(newHistory);

    const win = checkWin(newBoard);
    if (win) {
      setGameOver({ result: win.winner === 'W' ? 'WHITE_WIN' : 'BLACK_WIN', reason: 'checkmate', winLine: win.line });
      return;
    }
    if (checkDraw(newBoard, colorCode === 'W' ? 'B' : 'W')) {
      setGameOver({ result: 'DRAW', reason: 'stalemate' });
      return;
    }

    // Repetição 3x
    const repetitions = newHistory.filter(s => s === newBoard.join(',')).length;
    if (repetitions >= 3) {
      setGameOver({ result: 'DRAW', reason: 'repetition' });
    }
  };

  // ── INTERAÇÕES DO USUÁRIO ───────────────────────────────────────────────
  const handleCellClick = (idx) => {
    if (gameOver || turn !== myColorCode) return;

    if (phase === 'DROP') {
      if (board[idx] || !selectedDropPiece) return;

      if (isPVC || isPVPLocal) {
        handleLocalDrop(idx, selectedDropPiece, myColorCode);
      } else {
        emit('velha-drop-piece', { roomCode: roomData.roomCode, idx, pieceType: selectedDropPiece });
      }
    } else if (phase === 'MOVE') {
      const piece = board[idx];

      if (piece && piece[0] === myColorCode) {
        setSelectedMoveIdx(idx);
        setValidMoves(getValidMoves(board, idx));
        return;
      }

      if (!piece && selectedMoveIdx !== null && validMoves.includes(idx)) {
        if (isPVC || isPVPLocal) {
          handleLocalMove(selectedMoveIdx, idx, myColorCode);
        } else {
          emit('velha-move-piece', { roomCode: roomData.roomCode, from: selectedMoveIdx, to: idx });
        }
      }
    }
  };

  const handleRematch = () => {
    if (isPVC || isPVPLocal) {
      const oldWhite = assignedColors.white;
      const oldBlack = assignedColors.black;
      setAssignedColors({ white: oldBlack, black: oldWhite });
      setBoard(Array(9).fill(null));
      setBoardHistory([Array(9).fill(null).join(',')]);
      setInventory({ W: { T: 1, C: 1, B: 1 }, B: { T: 1, C: 1, B: 1 } });
      setTurn('W');
      setPhase('DROP');
      setGameOver(null);
      setRematchRequested(false);
      setOpponentWantsRematch(false);
    } else {
      setRematchRequested(true);
      emit('velha-request-rematch', { roomCode: roomData.roomCode });
    }
  };

  const handleResign = () => {
    if (gameOver) return;
    if (isPVC || isPVPLocal) {
      setGameOver({ result: myColorCode === 'W' ? 'BLACK_WIN' : 'WHITE_WIN', reason: 'resignation' });
    } else {
      emit('velha-resign', { roomCode: roomData.roomCode });
    }
  };

  // ── RENDERIZAÇÃO ────────────────────────────────────────────────────────
  if (setupPhase === 'WAITING' && !isPVC) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm">
          <div className="w-16 h-16 border-4 border-t-emerald-600 border-gray-200 rounded-full animate-spin mx-auto mb-6"></div>

          <h2 className="text-2xl font-black mb-2 uppercase text-emerald-950">Aguardando Oponente</h2>
          <p className="text-gray-500 mb-8 font-medium">Compartilhe o código abaixo com seu adversário:</p>

          <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 mb-8">
            <span className="text-4xl font-black tracking-[0.2em] text-emerald-600">{roomData.roomCode}</span>
          </div>

          <p className="text-xs text-gray-400 mb-6 italic">O sorteio começará automaticamente assim que alguém entrar.</p>

          <button
            onClick={onExit}
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative">
          <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter text-emerald-950">Realizando Sorteio...</h2>
          <div className="velha-draw-coin-wrapper mb-8">
            <div className="velha-draw-coin">
              <div className="coin-face front" style={{ borderColor: '#059669', color: '#059669' }}>?</div>
              <div className="coin-face back" style={{ borderColor: '#059669', background: '#059669' }}>⚔️</div>
            </div>
          </div>
          {drawWinner && (
            <div className="animate-bounce font-black text-emerald-600 text-xl">
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm">
          {iAmWinner ? (
            <>
              <h2 className="text-2xl font-black mb-2 uppercase text-emerald-950">Você Venceu!</h2>
              <p className="text-gray-500 mb-8 font-medium">Escolha sua cor para começar:</p>
              <div className="flex gap-4">
                <button
                  onClick={() => handlePickColor('white')}
                  className="flex-1 p-6 rounded-2xl border-2 border-gray-200 hover:border-emerald-600 transition-all group"
                >
                  <span className="text-4xl mb-2 block group-hover:scale-110 transition-transform">⚪</span>
                  <strong className="block text-sm uppercase">Brancas</strong>
                  <span className="text-[10px] text-gray-400">Começa o Jogo</span>
                </button>
                <button
                  onClick={() => handlePickColor('black')}
                  className="flex-1 p-6 rounded-2xl border-2 border-gray-200 hover:border-emerald-600 transition-all group"
                >
                  <span className="text-4xl mb-2 block group-hover:scale-110 transition-transform">⚫</span>
                  <strong className="block text-sm uppercase">Pretas</strong>
                  <span className="text-[10px] text-gray-400">Joga depois</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black mb-2 uppercase text-emerald-950">{drawWinner.userName} Venceu</h2>
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
                <div className="w-12 h-12 border-4 border-t-emerald-600 border-gray-100 rounded-full animate-spin mx-auto"></div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const renderCell = (idx) => {
    const piece = board[idx];
    const isLight = (Math.floor(idx / 3) + (idx % 3)) % 2 === 0;

    let cellClass = `velha-cell ${isLight ? 'velha-cell-light' : 'velha-cell-dark'}`;

    if (selectedMoveIdx === idx) cellClass += ' selected';
    if (validMoves.includes(idx)) cellClass += ' valid-move';
    if (gameOver?.winLine?.includes(idx)) cellClass += ' win-cell';

    return (
      <div key={idx} className={cellClass} onClick={() => handleCellClick(idx)}>
        {piece && (
          <span className={`velha-piece velha-piece-${piece[0]}`}>
            {PIECES[piece[1]].emoji}
          </span>
        )}
      </div>
    );
  };

  const renderInventory = (color) => {
    const inv = inventory[color];
    const isMyInv = color === myColorCode;
    const isTurn = turn === color;

    return (
      <div className={`velha-inventory ${isMyInv ? 'bottom' : 'top'}`}>
        <div className="flex items-center gap-2">
          <span className="font-bold">{isMyInv ? 'Você' : (isPVC ? 'Computador' : 'Oponente')}</span>
          {isTurn && !gameOver && <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>}
        </div>

        <div className="velha-inventory-group">
          {['T', 'B', 'C'].map(pType => {
            const count = inv[pType];
            const isSelectable = phase === 'DROP' && isMyInv && isTurn && count > 0;
            const isSelected = selectedDropPiece === pType;

            return (
              <button
                key={pType}
                className={`velha-piece-btn ${isSelected ? 'selected' : ''}`}
                disabled={!isSelectable && !(!isMyInv && count > 0)}
                onClick={() => isSelectable ? setSelectedDropPiece(pType) : null}
              >
                <span className={`piece-icon velha-piece-${color}`}>{PIECES[pType].emoji}</span>
                {count > 0 && <span className="piece-count">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const isMyTurn = turn === myColorCode && !gameOver;

  const iWon = gameOver && (
    gameOver.result === (myColorCode === 'W' ? 'WHITE_WIN' : 'BLACK_WIN')
  );

  const REASON_LABELS = {
    checkmate: 'Linha Completa!',
    stalemate: 'Sem Movimentos',
    repetition: 'Repetição',
    resignation: 'Desistência'
  };

  const getGameOverMsg = () => {
    if (!gameOver) return '';
    if (gameOver.result === 'DRAW') return '🤝 EMPATE!';
    return iWon ? 'VOCÊ VENCEU!' : 'VOCÊ PERDEU';
  };

  return (
    <div className="velha-container relative overflow-hidden pt-4 pb-20 min-h-screen">
      <div className={`w-full transition-all duration-1000 ${showGameOverOverlay ? 'blur-md scale-105 pointer-events-none opacity-50' : ''}`}>
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
        <button
          className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-emerald-950 border-2 border-emerald-100 active:scale-95 transition-all shrink-0 font-black text-xl hover:border-emerald-300 hover:shadow-md"
          onClick={onExit}
          title="Voltar"
        >
          ←
        </button>
      </div>

      <div className="velha-info-panel mt-12 sm:mt-0">
        <h2 className="velha-info-title">
          {phase === 'DROP' ? 'Fase de Colocação' : 'Fase de Movimento'}
        </h2>
        <p className="velha-info-subtitle">
          {turn === myColorCode ? 'Sua vez de jogar' : 'Aguardando oponente...'}
        </p>
      </div>

      {renderInventory(oppColorCode)}

      <div className="velha-board my-4">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(idx => renderCell(idx))}
      </div>

      {renderInventory(myColorCode)}
      </div>

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
            {isPVC || isPVPLocal ? (
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
              {gameOver?.reason === 'checkmate' ? 'Por Xeque-Mate' : 
               gameOver?.reason === 'stalemate' ? 'Por Afogamento' : 
               gameOver?.reason === 'repetition' ? 'Por Repetição' : 
               gameOver?.reason === 'timeout' ? 'Tempo Esgotado' : 
               gameOver?.reason === 'resignation' ? 'Desistência' : 
               gameOver?.reason || ''}
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

              <button onClick={onExit} className="bg-white hover:bg-red-50 text-red-500 font-black px-6 py-4 rounded-2xl sm:rounded-3xl text-xl sm:text-2xl transition-all shadow-[0_6px_0_#e5e7eb] active:translate-y-1 active:shadow-none border-2 border-gray-100 flex items-center justify-center gap-3">
                <span>🏠</span> SAIR DO JOGO
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
