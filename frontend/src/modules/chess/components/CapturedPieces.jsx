import React, { useMemo } from 'react';

// Valores tradicionais das peças
const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

// Ordem de exibição (peões primeiro, depois cavalos, bispos, torres, damas)
const PIECE_ORDER = { p: 1, n: 2, b: 3, r: 4, q: 5 };

export default function CapturedPieces({ moves, myColor }) {
  // Analisa o histórico de movimentos para extrair capturas
  const { whiteCaptures, blackCaptures, whiteScore, blackScore } = useMemo(() => {
    const wCaps = [];
    const bCaps = [];
    let wScore = 0;
    let bScore = 0;

    moves.forEach(move => {
      if (move.captured) {
        if (move.color === 'w') {
          // Brancas capturaram uma peça preta
          wCaps.push(move.captured);
          wScore += PIECE_VALUES[move.captured] || 0;
        } else {
          // Pretas capturaram uma peça branca
          bCaps.push(move.captured);
          bScore += PIECE_VALUES[move.captured] || 0;
        }
      }
    });

    // Ordenar as peças capturadas
    wCaps.sort((a, b) => PIECE_ORDER[a] - PIECE_ORDER[b]);
    bCaps.sort((a, b) => PIECE_ORDER[a] - PIECE_ORDER[b]);

    return { 
      whiteCaptures: wCaps, 
      blackCaptures: bCaps,
      whiteScore: wScore,
      blackScore: bScore
    };
  }, [moves]);

  // Vantagem de material
  const whiteAdvantage = whiteScore - blackScore;
  const blackAdvantage = blackScore - whiteScore;

  // Renderizador de um grupo de peças
  const renderCaptureGroup = (pieces, pieceColor, advantage) => {
    if (pieces.length === 0) return null;

    const pawns = pieces.filter(p => p === 'p');
    const others = pieces.filter(p => p !== 'p');

    return (
      <div className="chess-captured-group animate-fade-in">
        {others.length > 0 && (
          <div className="chess-captured-file back-file">
            {others.map((p, idx) => (
              <img 
                key={`other-${idx}`} 
                src={`/assets/chess/${pieceColor}${p.toUpperCase()}.svg`} 
                alt={p} 
                className="chess-captured-img animate-pop-in"
                style={{ animationDelay: `${idx * 0.05}s` }}
              />
            ))}
          </div>
        )}
        
        {pawns.length > 0 && (
          <div className="chess-captured-file front-file">
            {pawns.map((p, idx) => (
              <img 
                key={`pawn-${idx}`} 
                src={`/assets/chess/${pieceColor}${p.toUpperCase()}.svg`} 
                alt={p} 
                className="chess-captured-img animate-pop-in"
                style={{ animationDelay: `${(idx + others.length) * 0.05}s` }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Se eu sou as brancas, minhas capturas (peças pretas) ficam no meu lado.
  const opponentCaptures = myColor === 'white' ? blackCaptures : whiteCaptures;
  const opponentPieceColor = myColor === 'white' ? 'w' : 'b';
  const opponentAdvantage = myColor === 'white' ? blackAdvantage : whiteAdvantage;

  const myCaptures = myColor === 'white' ? whiteCaptures : blackCaptures;
  const myPieceColor = myColor === 'white' ? 'b' : 'w';
  const myAdvantage = myColor === 'white' ? whiteAdvantage : blackAdvantage;

  return (
    <div className="chess-captured-area">
      {/* Container do oponente (topo na lateral) */}
      <div className="chess-captured-section opponent-section">
        {renderCaptureGroup(opponentCaptures, opponentPieceColor, opponentAdvantage)}
      </div>
      
      {/* Divisória flexível (empurra as capturas do player para baixo) */}
      <div className="chess-captured-spacer"></div>

      {/* Container do jogador local (base na lateral) */}
      <div className="chess-captured-section player-section">
        {renderCaptureGroup(myCaptures, myPieceColor, myAdvantage)}
      </div>
    </div>
  );
}
