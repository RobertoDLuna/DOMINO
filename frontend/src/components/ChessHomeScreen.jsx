/**
 * ChessHomeScreen.jsx
 * Chess lobby: choose game mode (PVP or PVC), create or join a room.
 * Design follows the EduGames premium visual language.
 */
import React, { useState, useEffect } from 'react';
import ChessScreen from './ChessScreen';
import { useChessSocket } from '../hooks/useChessSocket';
import './chess/chess.css';


const AI_LEVELS = [
  { value: 1, label: 'Iniciante', description: 'Ideal para aprender' },
  { value: 3, label: 'Fácil', description: 'Comete erros ocasionais' },
  { value: 5, label: 'Médio', description: 'Joga de forma sólida' },
  { value: 8, label: 'Difícil', description: 'Pensa vários lances à frente' },
  { value: 10, label: 'Mestre', description: 'Quase imbatível' },
];

export default function ChessHomeScreen({ user, onBack }) {
  const { emit, on, connected } = useChessSocket();

  // lobby state
  const [mode, setMode] = useState(null); // null | 'PVP' | 'PVC'
  const [subMode, setSubMode] = useState(null); // 'create' | 'join'
  const [aiLevel, setAiLevel] = useState(5);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // game session
  const [gameSession, setGameSession] = useState(null);

  // ── Socket event listeners ──────────────────────────────────────────────
  useEffect(() => {
    const unsubCreated = on('chess-room-created', ({ roomCode, color, fen }) => {
      setLoading(false);
      setGameSession({
        roomCode,
        myColor: color,
        mode: 'PVP',
        aiLevel: null,
        whiteName: user?.fullName || 'Você',
        blackName: null,
        initialFen: fen,
        status: 'waiting',
      });
    });

    const unsubJoined = on('chess-room-joined', (data) => {
      setLoading(false);
      setGameSession({
        roomCode: data.roomCode,
        myColor: data.color,
        mode: 'PVP',
        aiLevel: null,
        whiteName: data.whiteName,
        blackName: data.blackName,
        initialFen: data.fen,
        status: 'playing',
      });
    });

    const unsubOpponent = on('chess-opponent-joined', (data) => {
      setGameSession(prev => prev ? {
        ...prev,
        blackName: data.blackName,
        blackId: data.blackId,
      } : null);
    });

    const unsubError = on('chess-error', ({ message }) => {
      setLoading(false);
      setError(message);
    });

    return () => {
      unsubCreated();
      unsubJoined();
      unsubOpponent();
      unsubError();
    };
  }, [on, user]);

  // ── Handlers ────────────────────────────────────────────────────────────
  function handleCreateRoom() {
    if (!connected) { setError('Sem conexão com o servidor.'); return; }
    setError('');
    setLoading(true);
    emit('create-chess-room', {
      userId: user?.id || `guest_${Date.now()}`,
      userName: user?.fullName || 'Convidado',
      mode: 'PVP',
    });
  }

  function handleJoinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) { setError('Informe um código de sala válido.'); return; }
    if (!connected) { setError('Sem conexão com o servidor.'); return; }
    setError('');
    setLoading(true);
    emit('join-chess-room', {
      roomCode: code,
      userId: user?.id || `guest_${Date.now()}`,
      userName: user?.fullName || 'Convidado',
    });
  }

  function handlePlayVsAI() {
    setGameSession({
      roomCode: `ai_${Date.now()}`,
      myColor: 'white',
      mode: 'PVC',
      aiLevel,
      whiteName: user?.fullName || 'Você',
      blackName: `IA Nível ${aiLevel}`,
      initialFen: null,
      status: 'playing',
    });
  }

  function handleBack() {
    setGameSession(null);
    setMode(null);
    setSubMode(null);
    setJoinCode('');
    setError('');
  }

  // ── Render: Game active ──────────────────────────────────────────────────
  if (gameSession) {
    return (
      <ChessScreen
        user={user}
        roomCode={gameSession.roomCode}
        myColor={gameSession.myColor}
        mode={gameSession.mode}
        aiLevel={gameSession.aiLevel}
        whiteName={gameSession.whiteName}
        blackName={gameSession.blackName}
        initialFen={gameSession.initialFen}
        boardTheme="wood"
        onBack={handleBack}
      />
    );
  }

  // ── Render: Lobby ────────────────────────────────────────────────────────
  return (
    <div className="chess-lobby">
      {/* Background pattern */}
      <div className="chess-lobby-bg" aria-hidden="true">
        <div className="chess-lobby-grid" />
      </div>

      <div className="chess-lobby-content">
        {/* Header */}
        <header className="chess-lobby-header">
          <button className="chess-lobby-back" onClick={onBack}>
            ← Voltar
          </button>
          <div className="chess-lobby-title-wrap">
            <span className="chess-lobby-icon" aria-hidden="true">♟️</span>
            <div>
              <h1 className="chess-lobby-title">Xadrez Real</h1>
              <p className="chess-lobby-sub">Estratégia • Raciocínio • Domínio</p>
            </div>
          </div>
          <div className={`chess-conn-dot ${connected ? 'chess-conn-dot--ok' : 'chess-conn-dot--off'}`} />
        </header>

        {/* Mode selector */}
        {!mode && (
          <section className="chess-mode-select">
            <h2 className="chess-section-title">Como deseja jogar?</h2>
            <div className="chess-mode-cards">
              <button
                className="chess-mode-card chess-mode-card--pvp"
                onClick={() => { setMode('PVP'); setSubMode(null); setError(''); }}
              >
                <span className="chess-mode-emoji">🧑‍🤝‍🧑</span>
                <strong>Jogador vs Jogador</strong>
                <p>Desafie um amigo em tempo real</p>
                {user && <span className="chess-mode-badge">Conta para o Ranking</span>}
              </button>

              <button
                className="chess-mode-card chess-mode-card--pvc"
                onClick={() => setMode('PVC')}
              >
                <span className="chess-mode-emoji">🤖</span>
                <strong>Jogador vs Computador</strong>
                <p>Treine contra a inteligência artificial</p>
                <span className="chess-mode-badge chess-mode-badge--gray">Sem Ranking</span>
              </button>
            </div>
          </section>
        )}

        {/* PVP sub-options */}
        {mode === 'PVP' && !subMode && (
          <section className="chess-pvp-options">
            <button className="chess-lobby-back" onClick={() => setMode(null)}>← Voltar</button>
            <h2 className="chess-section-title">Multiplayer</h2>
            <div className="chess-mode-cards">
              <button
                className="chess-mode-card"
                onClick={() => setSubMode('create')}
              >
                <span className="chess-mode-emoji">➕</span>
                <strong>Criar Sala</strong>
                <p>Gere um código e convide um amigo</p>
              </button>
              <button
                className="chess-mode-card"
                onClick={() => setSubMode('join')}
              >
                <span className="chess-mode-emoji">🔗</span>
                <strong>Entrar em Sala</strong>
                <p>Digite o código recebido</p>
              </button>
            </div>
          </section>
        )}

        {/* PVP — Create */}
        {mode === 'PVP' && subMode === 'create' && (
          <section className="chess-action-panel">
            <button className="chess-lobby-back" onClick={() => setSubMode(null)}>← Voltar</button>
            <h2 className="chess-section-title">Criar Nova Sala</h2>
            <p className="chess-action-desc">
              Uma sala será criada e você jogará com as <strong>peças brancas</strong>.
              Compartilhe o código com seu adversário.
            </p>
            {error && <p className="chess-error">{error}</p>}
            <button
              className="chess-primary-btn"
              onClick={handleCreateRoom}
              disabled={loading}
              id="btn-create-chess-room"
            >
              {loading ? '⏳ Criando...' : '🎮 Criar Sala'}
            </button>
          </section>
        )}

        {/* PVP — Join */}
        {mode === 'PVP' && subMode === 'join' && (
          <section className="chess-action-panel">
            <button className="chess-lobby-back" onClick={() => setSubMode(null)}>← Voltar</button>
            <h2 className="chess-section-title">Entrar em Sala</h2>
            <p className="chess-action-desc">
              Digite o código de 6 letras compartilhado pelo criador da sala.
            </p>
            <input
              className="chess-code-input"
              type="text"
              placeholder="Ex: ABC123"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
              maxLength={8}
              id="chess-room-code-input"
            />
            {error && <p className="chess-error">{error}</p>}
            <button
              className="chess-primary-btn"
              onClick={handleJoinRoom}
              disabled={loading || !joinCode}
              id="btn-join-chess-room"
            >
              {loading ? '⏳ Entrando...' : '🔗 Entrar'}
            </button>
          </section>
        )}

        {/* PVC — Level selector */}
        {mode === 'PVC' && (
          <section className="chess-action-panel">
            <button className="chess-lobby-back" onClick={() => setMode(null)}>← Voltar</button>
            <h2 className="chess-section-title">Escolha a Dificuldade</h2>
            <div className="chess-ai-levels">
              {AI_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  className={`chess-ai-level-btn ${aiLevel === lvl.value ? 'chess-ai-level-btn--active' : ''}`}
                  onClick={() => setAiLevel(lvl.value)}
                >
                  <strong>{lvl.label}</strong>
                  <span>{lvl.description}</span>
                </button>
              ))}
            </div>
            <button
              className="chess-primary-btn"
              onClick={handlePlayVsAI}
              id="btn-play-vs-ai"
            >
              🤖 Jogar contra a IA
            </button>
          </section>
        )}

        {/* Info strip */}
        <footer className="chess-lobby-footer">
          <span>♟ Todas as regras FIDE implementadas</span>
          <span>·</span>
          <span>En passant · Roque · Promoção</span>
          <span>·</span>
          <span>Empate por repetição · 50 lances · Afogamento</span>
        </footer>
      </div>
    </div>
  );
}
