/**
 * ChessBoard.jsx
 * The main chess board component.
 *
 * Responsibilities:
 *  - Render the board using react-chessboard
 *  - Validate moves locally with chess.js
 *  - Emit validated moves via Socket.IO
 *  - Handle promotion popup
 *  - Highlight last move and legal moves on piece selection
 *  - Support two visual themes: 'wood' (classic) and 'dark' (modern slate)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import ChessPromotion from './ChessPromotion';

// ── Theme definitions ──────────────────────────────────────────────────────
export const BOARD_THEMES = {
  wood: {
    label: '🪵 Madeira Clássica',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    highlight: 'rgba(20, 85, 30, 0.5)',
    lastMove: 'rgba(155, 199, 0, 0.41)',
  },
  dark: {
    label: '🌑 Dark Moderno',
    lightSquare: '#8ba6c0',
    darkSquare: '#1e3a5f',
    highlight: 'rgba(0, 200, 255, 0.4)',
    lastMove: 'rgba(0, 170, 255, 0.3)',
  },
};

export default function ChessBoard({
  fen,
  myColor,
  isMyTurn,
  boardTheme = 'wood',
  viewMode = '2D',
  onMove,
  gameOver,
  disabled,
}) {
  const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.wood;

  // Local chess instance for move validation (mirrors server state)
  const chessRef = useRef(new Chess(fen));
  const [localFen, setLocalFen] = useState(fen);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});
  const [lastMoveSquares, setLastMoveSquares] = useState({});
  const [promotion, setPromotion] = useState(null); // { from, to }

  // Sync when server sends a new FEN
  useEffect(() => {
    chessRef.current.load(fen);
    setLocalFen(fen);
    setSelectedSquare(null);
    setOptionSquares({});
  }, [fen]);

  // Compute legal moves squares for the selected piece
  const getMoveOptions = useCallback((square) => {
    const moves = chessRef.current.moves({ square, verbose: true });
    if (!moves.length) return {};
    const squares = {};
    moves.forEach((m) => {
      squares[m.to] = {
        background:
          chessRef.current.get(m.to)
            ? `radial-gradient(circle, ${theme.highlight} 60%, transparent 70%)`
            : `radial-gradient(circle, ${theme.highlight} 25%, transparent 30%)`,
        borderRadius: '50%',
      };
    });
    squares[square] = { background: theme.highlight };
    return squares;
  }, [theme]);

  function onSquareClick(square) {
    if (!isMyTurn || gameOver || disabled) return;

    // If a piece was already selected → try to move
    if (selectedSquare && optionSquares[square]) {
      attemptMove(selectedSquare, square);
      return;
    }

    const piece = chessRef.current.get(square);
    if (!piece || piece.color !== (myColor === 'white' ? 'w' : 'b')) {
      setSelectedSquare(null);
      setOptionSquares({});
      return;
    }

    setSelectedSquare(square);
    setOptionSquares(getMoveOptions(square));
  }

  function onPieceDragBegin(piece, sourceSquare) {
    if (!isMyTurn || gameOver || disabled) return;

    // React-chessboard gives us (piece, sourceSquare)
    const square = sourceSquare;
    const chessPiece = chessRef.current.get(square);
    if (!chessPiece || chessPiece.color !== (myColor === 'white' ? 'w' : 'b')) {
      return;
    }

    setSelectedSquare(square);
    setOptionSquares(getMoveOptions(square));
  }

  function onPieceDrop(sourceSquare, targetSquare, piece) {
    if (!isMyTurn || gameOver || disabled) return false;

    // Validate if the move is legal before returning true to allow drag-and-drop
    let isLegal = false;
    try {
      const clone = new Chess(chessRef.current.fen());
      const moveRes = clone.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      isLegal = !!moveRes;
    } catch {
      isLegal = false;
    }

    if (!isLegal) {
      // Clear options if dropped on an invalid square
      setSelectedSquare(null);
      setOptionSquares({});
      return false;
    }

    // If it's legal, we proceed
    attemptMove(sourceSquare, targetSquare);

    // Check if it's a promotion. If it is, we should return false so it temporarily snaps back
    // while the promotion dialog is open. Otherwise, return true so the piece stays there.
    const isPromotion = piece && piece[1].toLowerCase() === 'p' && (targetSquare[1] === '8' || targetSquare[1] === '1');
    return !isPromotion;
  }

  function attemptMove(from, to) {
    const chess = chessRef.current;
    const piece = chess.get(from);

    // Check for pawn promotion
    const isPromotion =
      piece?.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') ||
        (piece.color === 'b' && to[1] === '1'));

    if (isPromotion) {
      setPromotion({ from, to });
      return;
    }

    _doMove(from, to);
  }

  function _doMove(from, to, promotionPiece = 'q') {
    const chess = chessRef.current;
    let result;
    try {
      result = chess.move({ from, to, promotion: promotionPiece });
    } catch {
      /* invalid move — ignore */
    }

    if (!result) {
      setSelectedSquare(null);
      setOptionSquares({});
      return;
    }

    setLastMoveSquares({
      [from]: { background: theme.lastMove },
      [to]: { background: theme.lastMove },
    });
    setSelectedSquare(null);
    setOptionSquares({});
    setLocalFen(chess.fen());
    setPromotion(null);

    onMove({ from, to, promotion: promotionPiece });
  }

  function handlePromotion(piece) {
    if (!promotion) return;
    _doMove(promotion.from, promotion.to, piece);
  }

  const customSquareStyles = { ...lastMoveSquares, ...optionSquares };

  const ranks = myColor === 'white' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
  const files = myColor === 'white' ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] : ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];

  const viewClass = viewMode === '3D' ? 'view-3d' : 'view-2d';

  return (
    <div className={`chess-board-wrapper theme-${boardTheme} ${viewClass}`}>

      {/* Eixo X - Letras (Topo) */}
      <div className="chess-notation-x chess-notation-x--top">
        {files.map(f => <span key={`top-${f}`}>{f}</span>)}
      </div>

      {/* Meio (Eixo Y Esquerdo, Tabuleiro, Eixo Y Direito) */}
      <div className="chess-board-middle">

        {/* Eixo Y - Números (Esquerda) */}
        <div className="chess-notation-y chess-notation-y--left">
          {ranks.map(r => <span key={`left-${r}`}>{r}</span>)}
        </div>

        {/* Tabuleiro Centro */}
        <div className="chess-board-inner">
          <Chessboard
            id="chess-main-board"
            position={localFen}
            onSquareClick={onSquareClick}
            onPieceDragBegin={onPieceDragBegin}
            onPieceDrop={onPieceDrop}
            boardOrientation={myColor}
            arePiecesDraggable={isMyTurn && !gameOver && !disabled}
            showBoardNotation={false}
            customBoardStyle={{
              borderRadius: '4px',
            }}
            customLightSquareStyle={{ backgroundColor: theme.lightSquare }}
            customDarkSquareStyle={{ backgroundColor: theme.darkSquare }}
            customSquareStyles={customSquareStyles}
            animationDuration={180}
            /* Peças 3D - Centralização de Base e Proporção Sólida */
            customPieces={viewMode === '3D' ? {
              wP: () => <img src="/assets/chess/3d/wP.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(0.9, 1.8)', transformOrigin: 'bottom center' }} />,
              wN: () => <img src="/assets/chess/3d/wN.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(0.95, 2.0)', transformOrigin: 'bottom center' }} />,
              wB: () => <img src="/assets/chess/3d/wB.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(0.95, 2.2)', transformOrigin: 'bottom center' }} />,
              wR: () => <img src="/assets/chess/3d/wR.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(0.95, 1.8)', transformOrigin: 'bottom center' }} />,
              wQ: () => <img src="/assets/chess/3d/wQ.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(1.0, 2.4)', transformOrigin: 'bottom center' }} />,
              wK: () => <img src="/assets/chess/3d/wK.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(1.0, 2.5)', transformOrigin: 'bottom center' }} />,
              
              bP: () => <img src="/assets/chess/3d/bP.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(0.9, 1.8)', transformOrigin: 'bottom center' }} />,
              bN: () => <img src="/assets/chess/3d/bN.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(0.95, 2.0)', transformOrigin: 'bottom center' }} />,
              bB: () => <img src="/assets/chess/3d/bB.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(0.95, 2.2)', transformOrigin: 'bottom center' }} />,
              bR: () => <img src="/assets/chess/3d/bR.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(0.95, 1.8)', transformOrigin: 'bottom center' }} />,
              bQ: () => <img src="/assets/chess/3d/bQ.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(1.0, 2.4)', transformOrigin: 'bottom center' }} />,
              bK: () => <img src="/assets/chess/3d/bK.png" alt="" style={{ width: '75%', transform: 'translate(0%, 0%) rotateX(-45deg) scale(1.0, 2.5)', transformOrigin: 'bottom center' }} />,
            } : {}}
          />

          {promotion && (
            <ChessPromotion
              color={myColor === 'white' ? 'w' : 'b'}
              onSelect={handlePromotion}
            />
          )}
        </div>

        {/* Eixo Y - Números (Direita) */}
        <div className="chess-notation-y chess-notation-y--right">
          {ranks.map(r => <span key={`right-${r}`}>{r}</span>)}
        </div>
      </div>

      {/* Eixo X - Letras (Base) */}
      <div className="chess-notation-x chess-notation-x--bottom">
        {files.map(f => <span key={`bottom-${f}`}>{f}</span>)}
      </div>
    </div>
  );
}
