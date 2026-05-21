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

export default function XadrezVelhaScreen({ user, onBack, onSessionActive }) {
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

  // Identidade do usuário para esta sessão
  const myId = user?.id || `guest_${Date.now().toString().slice(-6)}`;
  const myName = user?.fullName || 'Convidado';

  useEffect(() => {
    const unsubCreated = ({ roomCode, color }) => {
      setLoading(false);
      setGameSession({
        roomCode,
        color,
        mode: 'PVP',
        aiLevel: null,
        whiteName: myName,
        blackName: null,
        myId: myId,
      });
    };

    const unsubJoined = (data) => {
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
        phase: data.phase,
        myId: myId,
      });
    };

    const offCreated = on('velha-room-created', unsubCreated);
    const offJoined = on('velha-room-joined', unsubJoined);

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
      offCreated();
      offJoined();
      unsubOpponent();
      unsubError();
    };
  }, [on, user, myId, myName]);

  useEffect(() => {
    if (onSessionActive) {
      onSessionActive(!!gameSession);
    }
  }, [gameSession, onSessionActive]);

  function handleCreateRoom() {
    if (!isConnected) { setError('Sem conexão com o servidor.'); return; }
    setError('');
    setLoading(true);
    emit('create-velha-room', {
      userId: myId,
      userName: myName,
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
      userId: myId,
      userName: myName,
    });
  }

  function handlePlayVsAI() {
    setGameSession({
      roomCode: `ai_${Date.now()}`,
      color: 'white', 
      mode: 'PVC',
      aiLevel,
      whiteName: myName,
      blackName: `Computador (Nív.${aiLevel})`,
      myId: myId,
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
        user={user}
        roomData={gameSession}
        onExit={handleBack}
      />
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (subMode) setSubMode(null);
              else if (mode) setMode(null);
              else onBack();
            }}
            className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-emerald-950 border-2 border-emerald-100 active:scale-95 transition-all shrink-0 font-black text-xl"
            title="Voltar"
          >
            ←
          </button>
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 uppercase italic tracking-tighter">Xadrez da Velha</h2>
            <p className="text-xs sm:text-sm font-medium text-emerald-900/60">Estratégia • Simplicidade • Diversão</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowRanking(true)}
            className="bg-amber-400 text-amber-950 px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-[0_5px_0_#d97706] hover:brightness-105 transition-all active:translate-y-1 active:shadow-none flex items-center gap-2"
          >
            <span>🏆</span> Ranking
          </button>
          <div className="flex items-center gap-2 bg-emerald-100/50 px-4 py-2 rounded-full border border-emerald-100">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[9px] font-black tracking-widest ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* PVP/PVC selector */}
      {!mode && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-xl font-black text-emerald-950 uppercase italic tracking-tight mb-6">Como deseja jogar?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-left transition-all hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,150,96,0.1)] hover:border-emerald-300 active:scale-95 overflow-hidden"
              onClick={() => { setMode('PVP'); setSubMode(null); setError(''); }}
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                🧑‍🤝‍🧑
              </div>
              <h3 className="text-emerald-950 font-black text-xl uppercase italic tracking-tight mb-2">Jogador vs Jogador</h3>
              <p className="text-emerald-900/60 text-sm font-medium mb-6">Desafie um amigo online.</p>
              {user ? (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider mt-auto w-fit">
                  Conta para o Ranking
                </span>
              ) : (
                <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider mt-auto w-fit">
                  Faça login para ranquear
                </span>
              )}
            </button>

            <button
              className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-left transition-all hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,150,96,0.1)] hover:border-emerald-300 active:scale-95 overflow-hidden"
              onClick={() => setMode('PVC')}
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                🤖
              </div>
              <h3 className="text-emerald-950 font-black text-xl uppercase italic tracking-tight mb-2">Jogador vs Computador</h3>
              <p className="text-emerald-900/60 text-sm font-medium mb-6">Treine contra a Inteligência Artificial.</p>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider mt-auto w-fit">
                Treino Casual
              </span>
            </button>
          </div>
        </section>
      )}

      {/* PVP Options (Create / Join) */}
      {mode === 'PVP' && !subMode && (
        <section className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 mt-12">
          <h2 className="text-xl font-black text-emerald-950 uppercase italic tracking-tight mb-6 text-center">Multiplayer Online</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              className="group relative flex flex-col items-center text-center bg-white rounded-[2rem] border-2 border-emerald-100 p-8 transition-all hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,150,96,0.1)] hover:border-emerald-300 active:scale-95"
              onClick={() => setSubMode('create')}
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">➕</div>
              <h3 className="text-emerald-950 font-black text-lg uppercase italic mb-2">Criar Sala</h3>
              <p className="text-emerald-900/60 text-xs font-medium">Gere um código e convide um amigo</p>
            </button>
            <button
              className="group relative flex flex-col items-center text-center bg-white rounded-[2rem] border-2 border-emerald-100 p-8 transition-all hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,150,96,0.1)] hover:border-emerald-300 active:scale-95"
              onClick={() => setSubMode('join')}
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">🔗</div>
              <h3 className="text-emerald-950 font-black text-lg uppercase italic mb-2">Entrar em Sala</h3>
              <p className="text-emerald-900/60 text-xs font-medium">Digite o código recebido</p>
            </button>
          </div>
        </section>
      )}

      {/* PVP Create Action */}
      {mode === 'PVP' && subMode === 'create' && (
        <section className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 mt-12 bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">➕</div>
          <h2 className="text-xl font-black text-emerald-950 uppercase italic tracking-tight mb-4">Criar Sala Privada</h2>
          <p className="text-emerald-900/60 text-sm font-medium mb-8">
            Você será as <strong className="text-emerald-950">Brancas</strong>. Compartilhe o código gerado com seu amigo para que ele possa entrar.
          </p>
          {error && <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl mb-6">{error}</div>}
          <button 
            className="w-full bg-emerald-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-[0_5px_0_#047857] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCreateRoom} 
            disabled={loading}
          >
            {loading ? '⏳ Criando...' : '🎮 Criar Sala Agora'}
          </button>
        </section>
      )}

      {/* PVP Join Action */}
      {mode === 'PVP' && subMode === 'join' && (
        <section className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 mt-12 bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">🔗</div>
          <h2 className="text-xl font-black text-emerald-950 uppercase italic tracking-tight mb-4">Entrar em Sala</h2>
          <p className="text-emerald-900/60 text-sm font-medium mb-8">
            Você jogará de <strong className="text-emerald-950">Negras</strong>. Digite abaixo o código da sala criada pelo seu amigo.
          </p>
          <input
            type="text"
            placeholder="Ex: AB12CD"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl px-6 py-4 text-center text-2xl font-black tracking-[0.25em] text-emerald-950 placeholder:text-emerald-900/30 mb-6 focus:outline-none focus:border-emerald-500 transition-colors"
            maxLength={6}
          />
          {error && <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl mb-6">{error}</div>}
          <button 
            className="w-full bg-emerald-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-[0_5px_0_#047857] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleJoinRoom} 
            disabled={loading || !joinCode}
          >
            {loading ? '⏳ Conectando...' : '🔗 Entrar na Sala'}
          </button>
        </section>
      )}

      {/* PVC Options */}
      {mode === 'PVC' && (
        <section className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 mt-12 bg-white rounded-[2rem] border-2 border-emerald-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🤖</div>
            <h2 className="text-xl font-black text-emerald-950 uppercase italic tracking-tight mb-2">Nível de Dificuldade</h2>
            <p className="text-emerald-900/60 text-sm font-medium">Escolha a força do computador para este desafio.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {AI_LEVELS.map(lvl => (
              <button 
                key={lvl.value} 
                className={`flex flex-col text-left p-4 rounded-2xl border-2 transition-all ${
                  aiLevel === lvl.value 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-emerald-50 bg-white hover:border-emerald-200'
                }`}
                onClick={() => setAiLevel(lvl.value)}
              >
                <strong className={`text-sm font-black uppercase tracking-tight mb-1 ${aiLevel === lvl.value ? 'text-emerald-700' : 'text-emerald-950'}`}>
                  {lvl.label}
                </strong>
                <span className="text-[10px] font-semibold text-emerald-900/50 leading-snug">
                  {lvl.description}
                </span>
              </button>
            ))}
          </div>

          <button 
            className="w-full bg-emerald-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-[0_5px_0_#047857] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
            onClick={handlePlayVsAI}
          >
            🤖 Iniciar Partida
          </button>
        </section>
      )}
      
      {showRanking && (
        <VelhaRankingBoard onClose={() => setShowRanking(false)} />
      )}
    </div>
  );
}
