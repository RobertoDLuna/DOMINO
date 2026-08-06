/**
 * ChessBoard.jsx
 * Componente principal do tabuleiro de xadrez.
 *
 * Responsabilidades:
 *  - Renderizar o tabuleiro usando react-chessboard
 *  - Validar movimentos localmente com chess.js
 *  - Emitir movimentos validados via Socket.IO
 *  - Gerenciar modal de promoção de peão
 *  - Destacar último lance e movimentos válidos na seleção de peças
 *  - Suportar temas visuais: 'wood' (madeira clássica) e 'dark' (moderno)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import ChessPromotion from './ChessPromotion';

// ── Definições de Temas Visuais ─────────────────────────────────────────────
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
  lastMove,
}) {
  const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.wood;

  // Instância local do chess.js para validação de lances (espelha o estado do servidor)
  const chessRef = useRef(new Chess(fen));
  const [localFen, setLocalFen] = useState(fen);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});
  const [lastMoveSquares, setLastMoveSquares] = useState({});
  const [checkmateStyles, setCheckmateStyles] = useState({});
  const [promotion, setPromotion] = useState(null); // { from, to }

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Sincroniza quando o servidor envia um novo FEN
  useEffect(() => {
    chessRef.current.load(fen);
    setLocalFen(fen);
    setSelectedSquare(null);
    setOptionSquares({});
    
    if (lastMove) {
      setLastMoveSquares({
        [lastMove.from]: { background: theme.lastMove },
        [lastMove.to]: { background: theme.lastMove },
      });
    } else {
      setLastMoveSquares({});
    }
  }, [fen, lastMove, theme.lastMove]);

  // Calcula estilos visuais para a casa do rei em xeque-mate
  useEffect(() => {
    if (gameOver && gameOver.reason === 'checkmate') {
      const chess = chessRef.current;
      const board = chess.board();
      let wKing, bKing;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k') {
            const sq = String.fromCharCode(97 + c) + (8 - r);
            if (piece.color === 'w') wKing = sq;
            else bKing = sq;
          }
        }
      }
      
      const isWhiteWin = gameOver.result === 'WHITE_WIN';
      
      // SVGs embutidos para Coroa Vencedora e Coroa Caída
      const greenCrownSVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><circle cx="15" cy="15" r="15" fill="%2358a74f"/><text x="15" y="21" font-size="16" text-anchor="middle" fill="white">👑</text></svg>`;
      const redFallenCrownSVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><circle cx="15" cy="15" r="15" fill="%23d34e4e"/><text x="15" y="21" font-size="16" text-anchor="middle" fill="white" transform="rotate(90 15 15)">👑</text></svg>`;

      const winStyle = { backgroundImage: `url('${greenCrownSVG}')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'top right', backgroundSize: '35%' };
      const loseStyle = { backgroundImage: `url('${redFallenCrownSVG}')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'top right', backgroundSize: '35%' };

      setCheckmateStyles({
        [wKing]: isWhiteWin ? winStyle : loseStyle,
        [bKing]: isWhiteWin ? loseStyle : winStyle,
      });
    } else {
      setCheckmateStyles({});
    }
  }, [gameOver]);

  // Calcula casas de movimentos válidos para a peça selecionada
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

    // Se uma peça já estava selecionada → tenta mover
    if (selectedSquare && optionSquares[square]) {
      attemptMove(selectedSquare, square);
      return;
    }

    const piece = chessRef.current.get(square);
    if (!piece || (myColor !== 'both' && piece.color !== (myColor === 'white' ? 'w' : 'b'))) {
      setSelectedSquare(null);
      setOptionSquares({});
      return;
    }

    setSelectedSquare(square);
    setOptionSquares(getMoveOptions(square));
  }

  function onPieceDragBegin(piece, sourceSquare) {
    if (!isMyTurn || gameOver || disabled) return;

    // O react-chessboard fornece (piece, sourceSquare)
    const square = sourceSquare;
    const chessPiece = chessRef.current.get(square);
    if (!chessPiece) return;
    if (myColor !== 'both' && chessPiece.color !== (myColor === 'white' ? 'w' : 'b')) {
      return;
    }

    setSelectedSquare(square);
    setOptionSquares(getMoveOptions(square));
  }

  function onPieceDrop(sourceSquare, targetSquare, piece) {
    if (!isMyTurn || gameOver || disabled) return false;

    // Valida se o movimento é legal antes de permitir o arrastar e soltar
    let isLegal = false;
    try {
      const clone = new Chess(chessRef.current.fen());
      const moveRes = clone.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      isLegal = !!moveRes;
    } catch {
      isLegal = false;
    }

    if (!isLegal) {
      // Limpa as opções caso seja solto em uma casa inválida
      setSelectedSquare(null);
      setOptionSquares({});
      return false;
    }

    // Se for válido, executa a jogada
    attemptMove(sourceSquare, targetSquare);

    // Se for promoção, retorna false para a peça voltar temporariamente enquanto o modal de promoção está aberto
    const isPromotion = piece && piece[1].toLowerCase() === 'p' && (targetSquare[1] === '8' || targetSquare[1] === '1');
    return !isPromotion;
  }

  function attemptMove(from, to) {
    const chess = chessRef.current;
    const piece = chess.get(from);

    // Verifica promoção de peão
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
      /* lance inválido ignorado */
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

  const customSquareStyles = { ...lastMoveSquares, ...optionSquares, ...checkmateStyles };

  const ranks = (myColor === 'white' || myColor === 'both') ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
  const files = (myColor === 'white' || myColor === 'both') ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  const viewClass = viewMode === '3D' ? 'view-3d' : 'view-2d';

  return (
    <div className={`chess-board-wrapper theme-${boardTheme} ${viewClass}`}>
      {/* Eixo X - Letras (Topo) */}
      {viewMode !== '3D' && (
        <div className="chess-notation-x chess-notation-x--top">
          {files.map(f => <span key={`top-${f}`}>{f}</span>)}
        </div>
      )}

      {/* Meio (Eixo Y Esquerdo, Tabuleiro, Eixo Y Direito) */}
      <div className="chess-board-middle">
        {/* Eixo Y - Números (Esquerda) */}
        {viewMode !== '3D' && (
          <div className="chess-notation-y chess-notation-y--left">
            {ranks.map(r => <span key={`left-${r}`}>{r}</span>)}
          </div>
        )}

        {/* Tabuleiro Centro */}
        <div className="chess-board-inner">
          <Chessboard
            id="chess-main-board"
            position={localFen}
            onSquareClick={onSquareClick}
            onPieceDragBegin={onPieceDragBegin}
            onPieceDrop={onPieceDrop}
            boardOrientation={myColor === 'both' ? 'white' : myColor}
            arePiecesDraggable={isMyTurn && !gameOver && !disabled && !isTouchDevice}
            showBoardNotation={false}
            customBoardStyle={{
              backgroundColor: 'transparent',
              border: 'none',
              boxShadow: 'none'
            }}
            customLightSquareStyle={{ backgroundColor: viewMode === '3D' ? 'transparent' : theme.lightSquare }}
            customDarkSquareStyle={{ backgroundColor: viewMode === '3D' ? 'transparent' : theme.darkSquare }}
            customSquareStyles={customSquareStyles}
            animationDuration={180}
            /* Peças 3D Staunton - Restauradas para o visual natural (Premium) */
            customPieces={viewMode === '3D' ? {
              wP: () => <img src="/assets/chess/3d/wP.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.0, 2.0)', transformOrigin: 'bottom center' }} />,
              wN: () => <img src="/assets/chess/3d/wN.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.0, 2.2)', transformOrigin: 'bottom center' }} />,
              wB: () => <img src="/assets/chess/3d/wB.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.0, 2.4)', transformOrigin: 'bottom center' }} />,
              wR: () => <img src="/assets/chess/3d/wR.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.0, 2.0)', transformOrigin: 'bottom center' }} />,
              wQ: () => <img src="/assets/chess/3d/wQ.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.1, 2.6)', transformOrigin: 'bottom center' }} />,
              wK: () => <img src="/assets/chess/3d/wK.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.1, 2.8)', transformOrigin: 'bottom center' }} />,

              bP: () => <img src="/assets/chess/3d/bP.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.0, 2.0)', transformOrigin: 'bottom center' }} />,
              bN: () => <img src="/assets/chess/3d/bN.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.0, 2.2)', transformOrigin: 'bottom center' }} />,
              bB: () => <img src="/assets/chess/3d/bB.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.0, 2.4)', transformOrigin: 'bottom center' }} />,
              bR: () => <img src="/assets/chess/3d/bR.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.0, 2.0)', transformOrigin: 'bottom center' }} />,
              bQ: () => <img src="/assets/chess/3d/bQ.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.1, 2.6)', transformOrigin: 'bottom center' }} />,
              bK: () => <img src="/assets/chess/3d/bK.png" alt="" style={{ width: '80%', transform: 'rotateX(-65deg) scale(1.1, 2.8)', transformOrigin: 'bottom center' }} />,
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
        {viewMode !== '3D' && (
          <div className="chess-notation-y chess-notation-y--right">
            {ranks.map(r => <span key={`right-${r}`}>{r}</span>)}
          </div>
        )}
      </div>

      {/* Eixo X - Letras (Base) */}
      {viewMode !== '3D' && (
        <div className="chess-notation-x chess-notation-x--bottom">
          {files.map(f => <span key={`bottom-${f}`}>{f}</span>)}
        </div>
      )}
    </div>
  );
}
