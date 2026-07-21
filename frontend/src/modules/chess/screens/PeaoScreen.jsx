import React, { useState, useEffect } from 'react';
import PeaoGame from '../components/PeaoGame';
import PeaoRankingBoard from '../components/PeaoRankingBoard';
import { usePeaoSocket } from '../../../hooks/usePeaoSocket';
import '../components/peao.css';
import '../components/xadrez-velha.css';

const AI_LEVELS = [
  { value: 1, label: 'Iniciante', description: 'Movimentos básicos' },
  { value: 2, label: 'Fácil', description: 'Pensa 1 jogada à frente' },
  { value: 3, label: 'Médio', description: 'Equilíbrio ideal' },
  { value: 4, label: 'Difícil', description: 'Estratégia avançada' },
  { value: 5, label: 'Mestre', description: 'Praticamente invencível' },
];

export default function PeaoScreen({ user, onBack, onSessionActive }) {
  const { emit, on, isConnected } = usePeaoSocket();

  const [mode, setMode] = useState(null);    // null | 'PVP' | 'PVC'
  const [subMode, setSubMode] = useState(null);    // 'create' | 'join'
  const [aiLevel, setAiLevel] = useState(3);
  const [timeLimit, setTimeLimit] = useState(300);     // 300s = 5 min, 600s = 10 min
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [gameSession, setGameSession] = useState(null);

  const myId = React.useMemo(() => user?.id || `guest_${Math.random().toString(36).substring(2, 8).toUpperCase()}`, [user?.id]);
  const myName = user?.fullName || 'Convidado';

  const [aiChoiceFeedback, setAiChoiceFeedback] = useState(null);

  useEffect(() => {
    const unsubs = [
      on('peao-room-created', ({ roomCode, color, timeLimit: serverTime }) => {
        setLoading(false);
        if (mode === 'PVC') {
          setGameSession({
            roomCode,
            color: 'white',
            mode: 'PVC',
            aiLevel,
            myId,
            timeLimit: serverTime || timeLimit,
            phase: 'DRAWING'
          });
        } else {
          setGameSession(prev => prev ? { ...prev, roomCode, timeLimit: serverTime || prev.timeLimit } : null);
        }
      }),

      on('peao-opponent-joined', ({ opponentName }) => {
        setGameSession(prev => prev ? { ...prev, opponentName, mode: 'PVP' } : null);
      }),

      on('peao-draw-result', ({ winnerId, winnerName }) => {
        setGameSession(prev => prev ? { ...prev, drawWinnerId: winnerId, drawWinnerName: winnerName, phase: 'DRAWING' } : null);
      }),

      on('peao-game-ready', ({ board, turn, white, black, whiteName, blackName, timeLimit: serverTime, aiChoice }) => {
        const updateSession = () => {
          setGameSession(prev => {
            if (!prev) return null;
            let assignedColor = prev.color;
            if (white && black) {
              assignedColor = white.userId === myId ? 'white' : 'black';
            }
            return {
              ...prev,
              phase: 'PLAYING',
              color: assignedColor,
              whiteName,
              blackName,
              timeLimit: serverTime || prev.timeLimit
            };
          });
        };

        if (aiChoice) {
          setAiChoiceFeedback(aiChoice);
          setTimeout(() => {
            updateSession();
            setAiChoiceFeedback(null);
          }, 1500);
        } else {
          updateSession();
        }
      }),

      on('peao-room-joined', ({ roomCode, timeLimit: serverTime }) => {
        setLoading(false);
        setGameSession({ roomCode, color: 'black', mode: 'PVP', myId, timeLimit: serverTime, phase: 'WAITING' });
      }),

      on('peao-error', ({ message }) => {
        setError(message);
        setLoading(false);
      }),
    ];

    return () => unsubs.forEach(fn => fn());
  }, [on, mode, aiLevel, myId, timeLimit]);

  // Transição de DRAWING para CHOOSING no PVP e PVC
  useEffect(() => {
    if (gameSession?.phase === 'DRAWING') {
      const timer = setTimeout(() => {
        setGameSession(prev => prev?.phase === 'DRAWING' ? { ...prev, phase: 'CHOOSING' } : prev);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameSession?.phase]);

  useEffect(() => {
    if (onSessionActive) {
      onSessionActive(!!gameSession);
    }
  }, [gameSession, onSessionActive]);

  function handleCreatePVP() {
    setLoading(true); setError('');
    emit('create-peao-room', { userId: myId, userName: myName, mode: 'PVP', timeLimit });
    setGameSession({ roomCode: null, color: 'white', mode: 'PVP', phase: 'WAITING', myId, timeLimit });
  }

  function handleCreatePVC() {
    setLoading(true); setError('');

    const sessionData = {
      roomCode: `ai_${Date.now()}`,
      mode: 'PVC',
      aiLevel,
      timeLimit,
      myId,
      myName,
      opponentName: `Computador (Nív.${aiLevel})`
    };

    const isHumanWinner = Math.random() > 0.5;

    if (isHumanWinner) {
      setGameSession({
        ...sessionData,
        drawWinnerId: myId,
        drawWinnerName: myName,
        phase: 'DRAWING'
      });
      setLoading(false);
    } else {
      setGameSession({
        ...sessionData,
        drawWinnerId: 'AI',
        drawWinnerName: 'Computador',
        phase: 'DRAWING'
      });

      setTimeout(() => {
        const aiChoice = Math.random() > 0.5 ? 'white' : 'black';
        setAiChoiceFeedback(aiChoice);

        setTimeout(() => {
          setGameSession(prev => ({
            ...prev,
            color: aiChoice === 'white' ? 'black' : 'white',
            whiteName: aiChoice === 'white' ? prev.opponentName : prev.myName,
            blackName: aiChoice === 'black' ? prev.opponentName : prev.myName,
            phase: 'PLAYING'
          }));
          setAiChoiceFeedback(null);
        }, 2000);
      }, 3000);
      setLoading(false);
    }
  }

  function handleJoin() {
    if (!joinCode.trim()) { setError('Digite o código da sala.'); return; }
    setLoading(true); setError('');
    emit('join-peao-room', { roomCode: joinCode.trim().toUpperCase(), userId: myId, userName: myName });
  }

  function handlePickColor(color) {
    if (!gameSession?.roomCode) return;

    if (gameSession.mode === 'PVC') {
      setGameSession(prev => ({
        ...prev,
        color: color,
        whiteName: color === 'white' ? prev.myName : prev.opponentName,
        blackName: color === 'black' ? prev.myName : prev.opponentName,
        phase: 'PLAYING'
      }));
      return;
    }

    emit('peao-pick-color', { roomCode: gameSession.roomCode, color });
  }

  function handleBack() {
    setGameSession(null); setMode(null); setSubMode(null);
    setJoinCode(''); setError(''); setLoading(false);
  }

  // ── Em jogo ─────────────────────────────────────────────────────────────────
  if (gameSession?.phase === 'PLAYING') {
    const color = gameSession.color;
    return (
      <PeaoGame
        user={user}
        roomData={{
          roomCode: gameSession.roomCode,
          color,
          mode: gameSession.mode,
          aiLevel: gameSession.aiLevel,
          whiteName: gameSession.whiteName || (color === 'white' ? myName : gameSession.opponentName || '...'),
          blackName: gameSession.blackName || (color === 'black' ? myName : gameSession.opponentName || 'Computador'),
          myId,
          timeLimit: gameSession.timeLimit || 300,
        }}
        onExit={handleBack}
      />
    );
  }

  // ── Sorteio (Fase DRAWING) ──────────────────────────────────────────────────
  if (gameSession?.phase === 'DRAWING') {
    const winnerName = gameSession.drawWinnerName;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full animate-in fade-in duration-300">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative">
          <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter text-emerald-950">Realizando Sorteio...</h2>
          <div className="velha-draw-coin-wrapper mb-8">
            <div className="velha-draw-coin">
              <div className="coin-face front" style={{ borderColor: '#059669', color: '#059669' }}>?</div>
              <div className="coin-face back" style={{ borderColor: '#059669', background: '#059669' }}>⚔️</div>
            </div>
          </div>
          {winnerName && (
            <div className="animate-bounce font-black text-emerald-600 text-xl">
              Vencedor: {winnerName}!
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Escolha de Cor (Fase CHOOSING) ──────────────────────────────────────────
  if (gameSession?.phase === 'CHOOSING') {
    const iAmWinner = gameSession.drawWinnerId === myId;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full animate-in fade-in duration-300">
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
              <h2 className="text-2xl font-black mb-2 uppercase text-emerald-950">{gameSession.drawWinnerName} Venceu</h2>
              <p className="text-gray-500 mb-8 font-medium">
                Aguardando escolha da cor...
              </p>
              <div className="w-12 h-12 border-4 border-t-emerald-600 border-gray-100 rounded-full animate-spin mx-auto"></div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Aguardando adversário ────────────────────────────────────────────────
  if (gameSession?.phase === 'WAITING' && gameSession.mode === 'PVP') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full animate-in fade-in duration-300">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm">
          <div className="w-16 h-16 border-4 border-t-emerald-600 border-gray-200 rounded-full animate-spin mx-auto mb-6"></div>

          <h2 className="text-2xl font-black mb-2 uppercase text-emerald-950">Aguardando Oponente</h2>
          <p className="text-gray-500 mb-8 font-medium">Compartilhe o código abaixo com seu adversário:</p>

          <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 mb-8">
            <span className="text-4xl font-black tracking-[0.2em] text-emerald-600">{gameSession.roomCode}</span>
          </div>

          <p className="text-xs text-gray-400 mb-6 italic">O sorteio começará automaticamente assim que alguém entrar.</p>

          <button
            onClick={handleBack}
            className="w-full py-3 text-sm text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
          >
            Cancelar e Sair
          </button>
        </div>
      </div>
    );
  }

  // ── Lobby principal ──────────────────────────────────────────────────────
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
            <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 uppercase italic tracking-tighter">Batalha dos Peões</h2>
            <p className="text-xs sm:text-sm font-medium text-emerald-900/60">Leve seus peões à linha inimiga</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            <button
              className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-left transition-all hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,150,96,0.1)] hover:border-emerald-300 active:scale-95 overflow-hidden"
              onClick={() => {
                setGameSession({
                  roomCode: `local_${Date.now()}`,
                  color: 'both',
                  mode: 'PVP_LOCAL',
                  aiLevel: null,
                  whiteName: 'Jogador 1',
                  blackName: 'Jogador 2',
                  timeLimit: 300,
                  phase: 'PLAYING',
                });
              }}
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                📱
              </div>
              <h3 className="text-emerald-950 font-black text-xl uppercase italic tracking-tight mb-2">Jogador vs Jogador (Local)</h3>
              <p className="text-emerald-900/60 text-sm font-medium mb-6">Jogue com um amigo no mesmo dispositivo.</p>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider mt-auto w-fit">
                Modo Offline
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

          <div className="text-left mb-6">
            <label className="block text-xs font-black text-emerald-900/70 uppercase tracking-widest mb-3">
              ⏱️ Tempo de Partida
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTimeLimit(300)}
                className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${timeLimit === 300 ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 shadow-sm' : 'bg-gray-50 text-gray-500 border-2 border-gray-100 hover:bg-emerald-50 hover:text-emerald-600'}`}
              >
                5 Minutos
              </button>
              <button
                type="button"
                onClick={() => setTimeLimit(600)}
                className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${timeLimit === 600 ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 shadow-sm' : 'bg-gray-50 text-gray-500 border-2 border-gray-100 hover:bg-emerald-50 hover:text-emerald-600'}`}
              >
                10 Minutos
              </button>
            </div>
          </div>

          <p className="text-emerald-900/60 text-sm font-medium mb-8">
            Você compartilhará o código gerado com seu amigo para que ele possa entrar.
          </p>
          {error && <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl mb-6">{error}</div>}
          <button
            className="w-full bg-emerald-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-[0_5px_0_#047857] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCreatePVP}
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
            Digite abaixo o código da sala criada pelo seu amigo.
          </p>
          <input
            type="text"
            placeholder="Ex: AB12CD"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl px-6 py-4 text-center text-2xl font-black tracking-[0.25em] text-emerald-950 placeholder:text-emerald-900/70 mb-6 focus:outline-none focus:border-emerald-500 transition-colors"
            maxLength={8}
          />
          {error && <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl mb-6">{error}</div>}
          <button
            className="w-full bg-emerald-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-[0_5px_0_#047857] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleJoin}
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
            <h2 className="text-xl font-black text-emerald-950 uppercase italic tracking-tight mb-2">Opções da Partida</h2>
            <p className="text-emerald-900/60 text-sm font-medium">Configure a dificuldade e o tempo.</p>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-black text-emerald-900/70 uppercase tracking-widest mb-3">
              🤖 Nível da IA
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AI_LEVELS.map(lvl => (
                <button
                  key={lvl.value}
                  className={`flex flex-col text-left p-4 rounded-2xl border-2 transition-all ${aiLevel === lvl.value
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
          </div>

          <div className="mb-8">
            <label className="block text-xs font-black text-emerald-900/70 uppercase tracking-widest mb-3">
              ⏱️ Tempo de Partida
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTimeLimit(300)}
                className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${timeLimit === 300 ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 shadow-sm' : 'bg-gray-50 text-gray-500 border-2 border-gray-100 hover:bg-emerald-50 hover:text-emerald-600'}`}
              >
                5 Minutos
              </button>
              <button
                type="button"
                onClick={() => setTimeLimit(600)}
                className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${timeLimit === 600 ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 shadow-sm' : 'bg-gray-50 text-gray-500 border-2 border-gray-100 hover:bg-emerald-50 hover:text-emerald-600'}`}
              >
                10 Minutos
              </button>
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl mb-6">{error}</div>}

          <button
            className="w-full bg-emerald-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-[0_5px_0_#047857] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
            onClick={handleCreatePVC}
            disabled={loading}
          >
            {loading ? '⏳ Iniciando...' : '🤖 Iniciar Partida'}
          </button>
        </section>
      )}
    </div>
  );
}
