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
    darkSquare:  '#b58863',
    highlight:   'rgba(20, 85, 30, 0.5)',
    lastMove:    'rgba(155, 199, 0, 0.41)',
  },
  dark: {
    label: '🌑 Dark Moderno',
    lightSquare: '#8ba6c0',
    darkSquare:  '#1e3a5f',
    highlight:   'rgba(0, 200, 255, 0.4)',
    lastMove:    'rgba(0, 170, 255, 0.3)',
  },
};

export default function ChessBoard({
  fen,
  myColor,       // 'white' | 'black'
  isMyTurn,
  boardTheme,    // 'wood' | 'dark'
  onMove,        // (moveObj) => void  — called when a legal move is made
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

  function onPieceDrop(sourceSquare, targetSquare) {
    if (!isMyTurn || gameOver || disabled) return false;
    attemptMove(sourceSquare, targetSquare);
    return false; // We control the board update via fen prop
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
      [to]:   { background: theme.lastMove },
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

  return (
    <div className="chess-board-wrapper">
      <Chessboard
        id="chess-main-board"
        position={localFen}
        onSquareClick={onSquareClick}
        onPieceDrop={onPieceDrop}
        boardOrientation={myColor}
        arePiecesDraggable={isMyTurn && !gameOver && !disabled}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        customLightSquareStyle={{ backgroundColor: theme.lightSquare }}
        customDarkSquareStyle={{ backgroundColor: theme.darkSquare }}
        customSquareStyles={customSquareStyles}
        animationDuration={180}
      />

      {promotion && (
        <ChessPromotion
          color={myColor === 'white' ? 'w' : 'b'}
          onSelect={handlePromotion}
        />
      )}
    </div>
  );
}
