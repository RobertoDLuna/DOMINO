import React, { useState, useEffect } from 'react';
import PeaoGame from '../components/PeaoGame';
import PeaoRankingBoard from '../components/PeaoRankingBoard';
import { usePeaoSocket } from '../../../hooks/usePeaoSocket';
import '../components/peao.css';

const AI_LEVELS = [
  { value: 1, label: 'Iniciante',    description: 'Movimentos básicos' },
  { value: 2, label: 'Fácil',        description: 'Pensa 1 jogada à frente' },
  { value: 3, label: 'Médio',        description: 'Equilíbrio ideal' },
  { value: 4, label: 'Difícil',      description: 'Estratégia avançada' },
  { value: 5, label: 'Mestre',       description: 'Praticamente invencível' },
];

export default function PeaoScreen({ user, onBack }) {
  const { emit, on, isConnected } = usePeaoSocket();

  const [mode,        setMode]        = useState(null);    // null | 'PVP' | 'PVC'
  const [subMode,     setSubMode]     = useState(null);    // 'create' | 'join'
  const [aiLevel,     setAiLevel]     = useState(3);
  const [joinCode,    setJoinCode]    = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [gameSession, setGameSession] = useState(null);

  const myId   = user?.id || `guest_${Date.now().toString().slice(-6)}`;
  const myName = user?.fullName || 'Convidado';

  useEffect(() => {
    const unsubs = [
      on('peao-room-created', ({ roomCode, color }) => {
        setLoading(false);
        if (mode === 'PVC') {
          setGameSession({ roomCode, color: 'white', mode: 'PVC', aiLevel, myId });
        }
        // PVP: aguarda adversário
      }),

      on('peao-opponent-joined', ({ opponentName }) => {
        setGameSession(prev => prev ? { ...prev, opponentName, mode: 'PVP' } : null);
      }),

      on('peao-draw-result', ({ winnerId, winnerName }) => {
        // Após sorteio, mostrar escolha de cor se for o vencedor
        setGameSession(prev => prev ? { ...prev, drawWinnerId: winnerId, drawWinnerName: winnerName, phase: 'DRAW' } : null);
      }),

      on('peao-game-ready', ({ board, turn, whiteName, blackName }) => {
        setGameSession(prev => prev
          ? { ...prev, phase: 'PLAYING', whiteName, blackName }
          : null
        );
      }),

      on('peao-room-joined', ({ roomCode }) => {
        setLoading(false);
        setGameSession({ roomCode, color: 'black', mode: 'PVP', myId });
      }),

      on('peao-error', ({ message }) => {
        setError(message);
        setLoading(false);
      }),
    ];

    return () => unsubs.forEach(fn => fn());
  }, [on, mode, aiLevel, myId]);

  function handleCreatePVP() {
    setLoading(true); setError('');
    emit('create-peao-room', { userId: myId, userName: myName, mode: 'PVP' });
    setGameSession({ roomCode: null, color: 'white', mode: 'PVP', phase: 'WAITING', myId });
  }

  function handleCreatePVC() {
    setLoading(true); setError('');
    emit('create-peao-room', { userId: myId, userName: myName, mode: 'PVC', aiLevel });
  }

  function handleJoin() {
    if (!joinCode.trim()) { setError('Digite o código da sala.'); return; }
    setLoading(true); setError('');
    emit('join-peao-room', { roomCode: joinCode.trim().toUpperCase(), userId: myId, userName: myName });
  }

  function handlePickColor(color) {
    if (!gameSession?.roomCode) return;
    emit('peao-pick-color', { roomCode: gameSession.roomCode, color });
  }

  function handleBack() {
    setGameSession(null); setMode(null); setSubMode(null);
    setJoinCode(''); setError(''); setLoading(false);
  }

  // ── Em jogo ─────────────────────────────────────────────────────────────────
  if (gameSession?.phase === 'PLAYING' || gameSession?.mode === 'PVC') {
    const color = gameSession.color;
    return (
      <PeaoGame
        user={user}
        roomData={{
          roomCode:    gameSession.roomCode,
          color,
          mode:        gameSession.mode,
          aiLevel:     gameSession.aiLevel,
          whiteName:   gameSession.whiteName || (color === 'white' ? myName : gameSession.opponentName || '...'),
          blackName:   gameSession.blackName || (color === 'black' ? myName : gameSession.opponentName || 'Computador'),
          myId,
        }}
        onExit={handleBack}
      />
    );
  }

  // ── Sorteio — escolha de cor ──────────────────────────────────────────────
  if (gameSession?.phase === 'DRAW') {
    const isWinner = gameSession.drawWinnerId === myId;
    return (
      <div className="peao-lobby">
        <div className="peao-lobby-bg"><div className="peao-lobby-grid" /></div>
        <div className="peao-lobby-content" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎲</div>
            {isWinner ? (
              <>
                <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '0.5rem' }}>Você ganhou o sorteio!</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Escolha sua cor:</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={() => handlePickColor('white')} className="peao-btn peao-btn--primary" style={{ maxWidth: 140 }}>⬜ Brancas</button>
                  <button onClick={() => handlePickColor('black')} className="peao-btn peao-btn--secondary" style={{ maxWidth: 140 }}>⬛ Pretas</button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '0.5rem' }}>{gameSession.drawWinnerName} ganhou o sorteio</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Aguardando escolha de cor...</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Aguardando adversário ────────────────────────────────────────────────
  if (gameSession?.phase === 'WAITING' && gameSession.mode === 'PVP') {
    return (
      <div className="peao-lobby">
        <div className="peao-lobby-bg"><div className="peao-lobby-grid" /></div>
        <div className="peao-lobby-content" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
          <div className="peao-action-panel" style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Sala Criada
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '0.3em', color: '#FFCE00', marginBottom: '0.5rem' }}>
              {gameSession.roomCode || '…'}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              Compartilhe esse código com um amigo
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div className="peao-conn-dot peao-conn-dot--ok" style={{ animation: 'pulse 1.5s infinite' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700 }}>Aguardando adversário…</span>
            </div>
            <button className="peao-btn peao-btn--secondary" onClick={handleBack}>← Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Lobby principal ──────────────────────────────────────────────────────
  return (
    <div className="peao-lobby">
      <div className="peao-lobby-bg"><div className="peao-lobby-grid" /></div>

      <div className="peao-lobby-content">
        {/* Header */}
        <header className="peao-lobby-header">
          <button className="peao-lobby-back" onClick={onBack}>← Voltar</button>
          <div className="peao-lobby-title-wrap">
            <span className="peao-lobby-icon">♙</span>
            <div>
              <div className="peao-lobby-title">Batalha dos Peões</div>
              <div className="peao-lobby-sub">Leve seus peões à linha inimiga</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowRanking(true)}
              style={{ background: 'rgba(255,206,0,0.1)', border: '1px solid rgba(255,206,0,0.25)', color: '#FFCE00', borderRadius: '9999px', padding: '0.4rem 0.9rem', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              🏆 Ranking
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px', padding: '0.35rem 0.75rem' }}>
              <div className={`peao-conn-dot ${isConnected ? 'peao-conn-dot--ok' : 'peao-conn-dot--off'}`} />
              <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', color: isConnected ? '#22c55e' : '#ef4444', textTransform: 'uppercase' }}>
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Seleção de modo */}
        {!mode && (
          <section>
            <p className="peao-section-title">Como deseja jogar?</p>
            <div className="peao-mode-cards">
              <button className="peao-mode-card" onClick={() => { setMode('PVP'); setSubMode(null); setError(''); }}>
                <span className="peao-mode-emoji">🧑‍🤝‍🧑</span>
                <strong>Jogador vs Jogador</strong>
                <p>Desafie um amigo online</p>
                {user && <span className="peao-mode-badge">Conta para o Ranking</span>}
              </button>
              <button className="peao-mode-card" onClick={() => setMode('PVC')}>
                <span className="peao-mode-emoji">🤖</span>
                <strong>Jogador vs Computador</strong>
                <p>Treine contra a IA Minimax</p>
                <span className="peao-mode-badge peao-mode-badge--gray">Sem Ranking</span>
              </button>
            </div>
          </section>
        )}

        {/* Modo PVP */}
        {mode === 'PVP' && !subMode && (
          <section>
            <p className="peao-section-title">Multiplayer Online</p>
            <div className="peao-mode-cards">
              <button className="peao-mode-card" onClick={() => setSubMode('create')}>
                <span className="peao-mode-emoji">➕</span>
                <strong>Criar Sala</strong>
                <p>Gere um código e convide um amigo</p>
              </button>
              <button className="peao-mode-card" onClick={() => setSubMode('join')}>
                <span className="peao-mode-emoji">🔗</span>
                <strong>Entrar em Sala</strong>
                <p>Digite o código recebido</p>
              </button>
            </div>
            <button className="peao-btn peao-btn--secondary" style={{ marginTop: '1rem', maxWidth: 200 }} onClick={() => setMode(null)}>
              ← Voltar
            </button>
          </section>
        )}

        {/* Criar sala PVP */}
        {mode === 'PVP' && subMode === 'create' && (
          <section>
            <p className="peao-section-title">Criar Sala</p>
            <div className="peao-action-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                Clique em "Criar" e compartilhe o código com seu adversário.
              </p>
              {error && <div className="peao-error">{error}</div>}
              <button className="peao-btn peao-btn--primary" onClick={handleCreatePVP} disabled={loading || !isConnected}>
                {loading ? 'Criando…' : '♙ Criar Sala'}
              </button>
              <button className="peao-btn peao-btn--secondary" onClick={() => { setSubMode(null); setError(''); }}>
                ← Voltar
              </button>
            </div>
          </section>
        )}

        {/* Entrar em sala PVP */}
        {mode === 'PVP' && subMode === 'join' && (
          <section>
            <p className="peao-section-title">Entrar em Sala</p>
            <div className="peao-action-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                className="peao-input"
                placeholder="CÓDIGO DA SALA"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
              />
              {error && <div className="peao-error">{error}</div>}
              <button className="peao-btn peao-btn--primary" onClick={handleJoin} disabled={loading || !isConnected || !joinCode.trim()}>
                {loading ? 'Entrando…' : '🔗 Entrar'}
              </button>
              <button className="peao-btn peao-btn--secondary" onClick={() => { setSubMode(null); setError(''); setJoinCode(''); }}>
                ← Voltar
              </button>
            </div>
          </section>
        )}

        {/* Modo PVC — escolha de nível de IA */}
        {mode === 'PVC' && (
          <section>
            <p className="peao-section-title">Nível da IA</p>
            <div className="peao-action-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="peao-ai-levels">
                {AI_LEVELS.map(l => (
                  <button
                    key={l.value}
                    className={`peao-ai-level-btn ${aiLevel === l.value ? 'peao-ai-level-btn--active' : ''}`}
                    onClick={() => setAiLevel(l.value)}
                  >
                    <span style={{ fontWeight: 900 }}>{l.label}</span>
                    <span style={{ marginLeft: '0.5rem', opacity: 0.6, fontSize: '0.75rem' }}>— {l.description}</span>
                  </button>
                ))}
              </div>
              {error && <div className="peao-error">{error}</div>}
              <button className="peao-btn peao-btn--primary" onClick={handleCreatePVC} disabled={loading}>
                {loading ? 'Iniciando…' : '🤖 Jogar contra IA'}
              </button>
              <button className="peao-btn peao-btn--secondary" onClick={() => setMode(null)}>← Voltar</button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="peao-lobby-footer">
          <span>♙ Batalha dos Peões v1.0</span>
          <span>·</span>
          <span>Peões com movimentos reais</span>
          <span>·</span>
          <span>Objetivo: Linha inimiga</span>
        </footer>
      </div>

      {showRanking && <PeaoRankingBoard onClose={() => setShowRanking(false)} />}
    </div>
  );
}
