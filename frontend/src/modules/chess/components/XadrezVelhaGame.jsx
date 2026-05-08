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
  [0,1,2], [3,4,5], [6,7,8], // Linhas
  [0,3,6], [1,4,7], [2,5,8], // Colunas
  [0,4,8], [2,4,6]           // Diagonais
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
  
  if (phase === 'MOVE' && checkDraw(board, turn)) return { score: 0 };
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
        const invW = Object.values(newInv.W).reduce((a,b)=>a+b,0);
        const invB = Object.values(newInv.B).reduce((a,b)=>a+b,0);
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
        const invW = Object.values(newInv.W).reduce((a,b)=>a+b,0);
        const invB = Object.values(newInv.B).reduce((a,b)=>a+b,0);
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

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────
export default function XadrezVelhaGame({ roomData, onExit }) {
  const { emit, on } = useVelhaSocket();

  const isPVC = roomData.mode === 'PVC';
  const myColor = roomData.color; // 'white' ou 'black'
  const myColorCode = myColor === 'white' ? 'W' : 'B';
  const oppColorCode = myColorCode === 'W' ? 'B' : 'W';

  // Estado Local (pode ser sobrescrito pelo Socket em PVP)
  const [board, setBoard] = useState(roomData.board || Array(9).fill(null));
  const [inventory, setInventory] = useState({ W: {T:1,C:1,B:1}, B: {T:1,C:1,B:1} });
  const [turn, setTurn] = useState('W');
  const [phase, setPhase] = useState('DROP'); // DROP | MOVE

  const [selectedDropPiece, setSelectedDropPiece] = useState(null);
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(null);
  const [validMoves, setValidMoves] = useState([]);

  const [gameOver, setGameOver] = useState(null); // { result, reason, winLine }

  // ── ATUALIZAÇÕES DO SOCKET (PVP/PVC) ───────────────────────────────────
  useEffect(() => {
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

    return () => { unsubDrop(); unsubMove(); unsubOver(); };
  }, [on]);

  // ── IA JOGANDO (PVC) ────────────────────────────────────────────────────
  useEffect(() => {
    if (isPVC && !gameOver && turn === oppColorCode) {
      const timer = setTimeout(() => {
        // Nível define profundidade: 1=random(depth 0), 2=depth2, 3=depth3, 4=depth5, 5=depth7
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
      }, 600); // delay para dar sensação de "pensamento"
      return () => clearTimeout(timer);
    }
  }, [turn, isPVC, gameOver, board, inventory, phase]);

  // Lógica local para PVC
  const handleLocalDrop = (idx, pieceType, colorCode) => {
    const newBoard = [...board];
    newBoard[idx] = colorCode + pieceType;
    const newInv = { ...inventory, [colorCode]: { ...inventory[colorCode], [pieceType]: inventory[colorCode][pieceType] - 1 } };
    
    let newPhase = phase;
    const invW = Object.values(newInv.W).reduce((a,b)=>a+b,0);
    const invB = Object.values(newInv.B).reduce((a,b)=>a+b,0);
    if (invW === 0 && invB === 0) newPhase = 'MOVE';

    setBoard(newBoard);
    setInventory(newInv);
    setPhase(newPhase);
    setTurn(colorCode === 'W' ? 'B' : 'W');
    setSelectedDropPiece(null);

    const win = checkWin(newBoard);
    if (win) {
      setGameOver({ result: win.winner === 'W' ? 'WHITE_WIN' : 'BLACK_WIN', reason: 'checkmate', winLine: win.line });
      return;
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

    const win = checkWin(newBoard);
    if (win) {
      setGameOver({ result: win.winner === 'W' ? 'WHITE_WIN' : 'BLACK_WIN', reason: 'checkmate', winLine: win.line });
      return;
    }
    if (checkDraw(newBoard, colorCode === 'W' ? 'B' : 'W')) {
      setGameOver({ result: 'DRAW', reason: 'stalemate' });
      return;
    }
  };


  // ── INTERAÇÕES DO USUÁRIO ───────────────────────────────────────────────
  const handleCellClick = (idx) => {
    if (gameOver || turn !== myColorCode) return;

    if (phase === 'DROP') {
      if (board[idx] || !selectedDropPiece) return;
      
      if (isPVC) {
        handleLocalDrop(idx, selectedDropPiece, myColorCode);
      } else {
        emit('velha-drop-piece', { roomCode: roomData.roomCode, idx, pieceType: selectedDropPiece });
      }
    } else if (phase === 'MOVE') {
      const piece = board[idx];
      
      // Se clicou na própria peça, seleciona ela
      if (piece && piece[0] === myColorCode) {
        setSelectedMoveIdx(idx);
        setValidMoves(getValidMoves(board, idx));
        return;
      }

      // Se clicou numa casa vazia e tem peça selecionada
      if (!piece && selectedMoveIdx !== null && validMoves.includes(idx)) {
        if (isPVC) {
          handleLocalMove(selectedMoveIdx, idx, myColorCode);
        } else {
          emit('velha-move-piece', { roomCode: roomData.roomCode, from: selectedMoveIdx, to: idx });
        }
      }
    }
  };

  const handleResign = () => {
    if (isPVC) {
      setGameOver({ result: myColorCode === 'W' ? 'BLACK_WIN' : 'WHITE_WIN', reason: 'resignation' });
    } else {
      emit('velha-resign', { roomCode: roomData.roomCode });
    }
  };

  // ── RENDERIZAÇÃO ────────────────────────────────────────────────────────
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

  return (
    <div className="velha-container pt-4 pb-20 relative">
      {/* Botão de Voltar no topo */}
      <div className="absolute top-4 left-4 z-10">
        <button 
          className="chess-lobby-back group flex items-center gap-2" 
          onClick={onExit}
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span> 
          Voltar
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
        {[0,1,2,3,4,5,6,7,8].map(idx => renderCell(idx))}
      </div>

      {renderInventory(myColorCode)}

      <div className="mt-8 flex gap-4">
        <button 
          onClick={handleResign}
          className="px-6 py-3 bg-red-100 text-red-700 font-bold rounded-xl shadow hover:bg-red-200 transition"
        >
          Abandonar
        </button>
      </div>

      {/* MODAL DE FIM DE JOGO */}
      {gameOver && (
        <div className="velha-overlay">
          <div className={`velha-modal ${
            gameOver.result === 'DRAW' ? 'draw' : 
            (gameOver.result === (myColorCode === 'W' ? 'WHITE_WIN' : 'BLACK_WIN') ? 'win' : 'loss')
          }`}>
            <h2>
              {gameOver.result === 'DRAW' ? 'Empate!' : 
               (gameOver.result === (myColorCode === 'W' ? 'WHITE_WIN' : 'BLACK_WIN') ? 'Você Venceu! 🎉' : 'Você Perdeu 😢')}
            </h2>
            <p>
              {gameOver.reason === 'checkmate' ? 'Linha completa!' :
               gameOver.reason === 'stalemate' ? 'Sem movimentos possíveis.' :
               gameOver.reason === 'resignation' ? 'Desistência.' : 'Oponente desconectou.'}
            </p>
            <button 
              onClick={onExit}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
