import React, { useState, useEffect } from 'react';
import XadrezVelhaGame from '../components/XadrezVelhaGame';
import VelhaRankingBoard from '../components/VelhaRankingBoard';
import { useVelhaSocket } from '../../../hooks/useVelhaSocket';
import '../components/chess.css';

const AI_LEVELS = [
  { value: 1, label: 'Iniciante', description: 'Joga aleatoriamente' },
  { value: 2, label: 'Fácil', description: 'Pensa apenas 2 jogadas à frente' },
  { value: 3, label: 'Médio', description: 'Nível equilibrado (padrão)' },
  { value: 4, label: 'Difícil', description: 'Boa capacidade de antecipação' },
  { value: 5, label: 'Mestre', description: 'Quase perfeito, resolve o jogo' },
];

export default function XadrezVelhaScreen({ user, onBack }) {
  const { emit, on, isConnected } = useVelhaSocket();

  // lobby state
  const [mode, setMode] = useState(null); // null | 'PVP' | 'PVC'
  const [subMode, setSubMode] = useState(null); // 'create' | 'join'
  const [aiLevel, setAiLevel] = useState(3);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRanking, setShowRanking] = useState(false);

  // game session
  const [gameSession, setGameSession] = useState(null);

  useEffect(() => {
    const unsubCreated = on('velha-room-created', ({ roomCode, color }) => {
      setLoading(false);
      setGameSession({
        roomCode,
        color,
        mode: 'PVP',
        aiLevel: null,
        whiteName: user?.fullName || 'Você',
        blackName: null,
      });
    });

    const unsubJoined = on('velha-room-joined', (data) => {
      setLoading(false);
      setGameSession({
        roomCode: data.roomCode,
        color: data.color,
        mode: 'PVP',
        aiLevel: null,
        whiteName: data.whiteName,
        blackName: data.blackName,
        board: data.board,
        turn: data.turn,
        phase: data.phase
      });
    });

    const unsubOpponent = on('velha-opponent-joined', (data) => {
      setGameSession(prev => prev ? {
        ...prev,
        blackName: data.opponentName,
      } : null);
    });

    const unsubError = on('velha-error', ({ message }) => {
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

  function handleCreateRoom() {
    if (!isConnected) { setError('Sem conexão com o servidor.'); return; }
    setError('');
    setLoading(true);
    emit('create-velha-room', {
      userId: user?.id || `guest_${Date.now()}`,
      userName: user?.fullName || 'Convidado',
      mode: 'PVP',
    });
  }

  function handleJoinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) { setError('Informe um código válido.'); return; }
    if (!isConnected) { setError('Sem conexão com o servidor.'); return; }
    setError('');
    setLoading(true);
    emit('join-velha-room', {
      roomCode: code,
      userId: user?.id || `guest_${Date.now()}`,
      userName: user?.fullName || 'Convidado',
    });
  }

  function handlePlayVsAI() {
    setGameSession({
      roomCode: `ai_${Date.now()}`,
      color: 'white', // always white vs AI in this simple impl
      mode: 'PVC',
      aiLevel,
      whiteName: user?.fullName || 'Você',
      blackName: `Computador (Nív.${aiLevel})`,
    });
  }

  function handleBack() {
    setGameSession(null);
    setMode(null);
    setSubMode(null);
    setJoinCode('');
    setError('');
  }

  if (gameSession) {
    return (
      <XadrezVelhaGame
        roomData={gameSession}
        onExit={handleBack}
      />
    );
  }

  return (
    <div className="chess-lobby">
      <div className="chess-lobby-bg" aria-hidden="true">
        <div className="chess-lobby-grid" />
      </div>

      <div className="chess-lobby-content">
        <header className="chess-lobby-header">
          <button 
            className="chess-lobby-back group flex items-center gap-2" 
            onClick={() => {
              if (subMode) setSubMode(null);
              else if (mode) setMode(null);
              else onBack();
            }}
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span> 
            Voltar
          </button>
          <div className="chess-lobby-title-wrap">
            <span className="chess-lobby-icon" aria-hidden="true">⚔️</span>
            <div>
              <h1 className="chess-lobby-title text-[#769656]">Xadrez da Velha</h1>
              <p className="chess-lobby-sub">ESTRATÉGIA • SIMPLICIDADE • DIVERSÃO</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowRanking(true)}
              className="bg-[#f1c40f] hover:bg-[#f39c12] text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_4px_0_#b7950b] active:shadow-none active:translate-y-1 transition-all flex items-center gap-2"
            >
              <span>🏆</span> Ranking
            </button>
            <div className="flex items-center gap-2 bg-black/5 px-3 py-1.5 rounded-full border border-black/5">
              <div className={`chess-conn-dot ${isConnected ? 'chess-conn-dot--ok' : 'chess-conn-dot--off'}`} />
              <span className={`text-[9px] font-bold tracking-widest ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </header>

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
                <p>Desafie um amigo online</p>
                {user && <span className="chess-mode-badge">Conta para o Ranking</span>}
              </button>

              <button
                className="chess-mode-card chess-mode-card--pvc"
                onClick={() => setMode('PVC')}
              >
                <span className="chess-mode-emoji">🤖</span>
                <strong>Jogador vs Computador</strong>
                <p>Treine contra a Inteligência Artificial</p>
                <span className="chess-mode-badge chess-mode-badge--gray">Sem Ranking</span>
              </button>
            </div>
          </section>
        )}

        {mode === 'PVP' && !subMode && (
          <section className="chess-pvp-options">
            <h2 className="chess-section-title">Multiplayer Online</h2>
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

        {mode === 'PVP' && subMode === 'create' && (
          <section className="chess-action-panel">
            <h2 className="chess-section-title">Criar Sala Privada</h2>
            <p className="chess-action-desc">
              Você será as <strong>Brancas</strong>. Compartilhe o código gerado com seu amigo para que ele possa entrar.
            </p>
            {error && <div className="chess-error">{error}</div>}
            <button className="chess-primary-btn mt-4" onClick={handleCreateRoom} disabled={loading}>
              {loading ? '⏳ Criando...' : '🎮 Criar Sala Agora'}
            </button>
          </section>
        )}

        {mode === 'PVP' && subMode === 'join' && (
          <section className="chess-action-panel">
            <h2 className="chess-section-title">Entrar em Sala</h2>
            <p className="chess-action-desc">
              Você jogará de <strong>Negras</strong>. Digite abaixo o código da sala criada pelo seu amigo.
            </p>
            <div className="my-4">
              <input
                type="text"
                placeholder="Ex: AB12CD"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="chess-code-input"
                maxLength={6}
              />
            </div>
            {error && <div className="chess-error mb-4">{error}</div>}
            <button className="chess-primary-btn" onClick={handleJoinRoom} disabled={loading || !joinCode}>
              {loading ? '⏳ Conectando...' : '🔗 Entrar na Sala'}
            </button>
          </section>
        )}

        {mode === 'PVC' && (
          <section className="chess-action-panel">
            <h2 className="chess-section-title">Nível de Dificuldade</h2>
            <p className="chess-action-desc mb-4">Escolha a força do computador para este desafio.</p>
            
            <div className="chess-ai-levels mb-6">
              {AI_LEVELS.map(lvl => (
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

            <button className="chess-primary-btn w-full" onClick={handlePlayVsAI}>
              🤖 Iniciar Partida
            </button>
          </section>
        )}
        <footer className="chess-lobby-footer mt-12">
          <span>⚔️ Xadrez da Velha v1.0</span>
          <span>·</span>
          <span>Peças com movimentos reais</span>
          <span>·</span>
          <span>Objetivo: Linha ou Diagonal</span>
        </footer>
      </div>

      {showRanking && (
        <VelhaRankingBoard onClose={() => setShowRanking(false)} />
      )}
    </div>
  );
}
