/**
 * ChessHomeScreen.jsx
 * Lobby de Xadrez Premium: Selecione modos de jogo (PVP ou PVC), crie ou entre em salas.
 * Design alinhado com a identidade moderna e refinada do EduGames.
 */
import React, { useState, useEffect } from 'react';
import ChessScreen from './ChessScreen';
import XadrezVelhaScreen from './XadrezVelhaScreen';
import PeaoScreen from './PeaoScreen';
import { useChessSocket } from '../../../hooks/useChessSocket';
import logoCampina from '../../../assets/logo-campina.png';
import AuthService from '../../../services/AuthService';
import ChessRankingBoard from '../components/ChessRankingBoard';
import '../components/chess.css';

const AI_LEVELS = [
  { value: 1, label: 'Iniciante', description: 'Ideal para aprender as regras básicas' },
  { value: 3, label: 'Fácil', description: 'Comete alguns erros estratégicos' },
  { value: 5, label: 'Médio', description: 'Joga de forma consistente e sólida' },
  { value: 8, label: 'Difícil', description: 'Antecipa jogadas e cria armadilhas' },
  { value: 10, label: 'Mestre', description: 'Desafio extremo, praticamente imbatível' },
];

const TIME_OPTIONS = [
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: null, label: 'Sem tempo' },
];

export default function ChessHomeScreen({ user, onBack }) {
  const { emit, on, connected } = useChessSocket();

  // Estados principais
  const [gameType, setGameType] = useState(null); // null (Todos) | 'classic' | 'velha' | 'peao'
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isChildSessionActive, setIsChildSessionActive] = useState(false);
  const [showRanking, setShowRanking] = useState(false);

  // Estados do lobby clássico (Xadrez Real)
  const [mode, setMode] = useState(null); // null | 'PVP' | 'PVC'
  const [subMode, setSubMode] = useState(null); // null | 'create' | 'join'
  const [aiLevel, setAiLevel] = useState(5);
  const [timeLimit, setTimeLimit] = useState(600); // 10 min padrão
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sessão do jogo clássico
  const [gameSession, setGameSession] = useState(null);

  // Identidade do usuário
  const myId = user?.id || `guest_${Date.now().toString().slice(-6)}`;
  const myName = user?.fullName || 'Convidado';

  // Sincronização do estado de sessão ativa
  const isGameActive = !!gameSession || isChildSessionActive;

  // Logout unificado
  const handleLogout = () => {
    if (confirm('Deseja realmente sair da conta?')) {
      AuthService.logout();
      window.location.reload();
    }
  };

  // ── Listeners de Evento do Socket (Xadrez Real) ───────────────────────────
  useEffect(() => {
    const unsubCreated = ({ roomCode, color, fen, timeLimit: serverTimeLimit }) => {
      setLoading(false);
      setGameSession({
        roomCode,
        myColor: color,
        mode: 'PVP',
        aiLevel: null,
        whiteName: myName,
        blackName: null,
        initialFen: fen,
        status: 'waiting',
        timeLimit: serverTimeLimit,
        myId: myId,
      });
    };

    const unsubJoined = (data) => {
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
        timeLimit: data.timeLimit,
        myId: myId,
      });
    };

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

    const offCreated = on('chess-room-created', unsubCreated);
    const offJoined = on('chess-room-joined', unsubJoined);

    return () => {
      offCreated();
      offJoined();
      unsubOpponent();
      unsubError();
    };
  }, [on, user, myId, myName]);

  // ── Handlers do Xadrez Real ───────────────────────────────────────────────
  function handleCreateRoom() {
    if (!connected) { setError('Sem conexão com o servidor.'); return; }
    setError('');
    setLoading(true);
    emit('create-chess-room', {
      userId: myId,
      userName: myName,
      mode: 'PVP',
      timeLimit,
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
      userId: myId,
      userName: myName,
    });
  }

  function handlePlayVsAI() {
    setGameSession({
      roomCode: `ai_${Date.now()}`,
      myColor: 'white',
      mode: 'PVC',
      aiLevel,
      whiteName: myName,
      blackName: `IA Nível ${aiLevel}`,
      initialFen: null,
      status: 'playing',
      timeLimit,
      myId: myId,
    });
  }

  function handleBackClassic() {
    setGameSession(null);
    setMode(null);
    setSubMode(null);
    setJoinCode('');
    setError('');
  }

  // ── RENDERIZAÇÃO COMPLETA EM TELA CHEIA (Jogo Ativo) ───────────────────────
  if (isGameActive) {
    if (gameType === 'classic' && gameSession) {
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
          timeLimit={gameSession.timeLimit}
          myId={gameSession.myId}
          boardTheme="wood"
          onBack={handleBackClassic}
        />
      );
    }
  }

  // ── RENDERIZAÇÃO DO LOBBY GERAL + BARRA LATERAL ───────────────────────────
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F0FDF4] w-full relative overflow-hidden">
      {/* Header (Mobile) */}
      {!isGameActive && (
        <header className="lg:hidden bg-white border-b-2 border-emerald-100 p-4 sticky top-0 z-40 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoCampina} alt="Seduc" className="h-8 w-auto object-contain pointer-events-none" />
              <div className="flex flex-col">
                <span className="text-lg font-black text-emerald-950 italic tracking-tighter leading-none uppercase">EduGames</span>
                <span className="text-[9px] font-black text-[#009660] uppercase tracking-widest leading-none mt-0.5">Xadrez</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-xs shrink-0">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <span className="text-[10px] font-black text-emerald-900 truncate max-w-[80px]">
                  {user?.fullName?.split(' ')[0] || 'Usuário'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center border border-red-100 active:scale-95 transition-all"
                title="Sair"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Horizontal Game Modes Tab Menu */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            <button
              onClick={() => setGameType(null)}
              className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 shrink-0 ${!gameType ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' : 'bg-slate-50 text-emerald-900/60'}`}
            >
              🎮 Todos
            </button>
            <button
              onClick={() => setGameType('classic')}
              className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 shrink-0 ${gameType === 'classic' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' : 'bg-slate-50 text-emerald-900/60'}`}
            >
              ♟️ Xadrez Real
            </button>
            <button
              onClick={() => setGameType('velha')}
              className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 shrink-0 ${gameType === 'velha' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' : 'bg-slate-50 text-emerald-900/60'}`}
            >
              ⚔️ Xadrez da Velha
            </button>
            <button
              onClick={() => setGameType('peao')}
              className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 shrink-0 ${gameType === 'peao' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' : 'bg-slate-50 text-emerald-900/60'}`}
            >
              ♙ Batalha dos Peões
            </button>
          </div>
        </header>
      )}

      {/* Sidebar (Desktop) */}
      {!isGameActive && (
        <aside className="hidden lg:flex lg:flex-col w-72 bg-white/95 backdrop-blur-xl border-r-2 border-emerald-100 p-6 sm:p-8 shrink-0">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              {/* Branding EduGames - Sempre visível */}
              <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-4">
                <img src={logoCampina} alt="Seduc" className="h-6 sm:h-12 w-auto object-contain pointer-events-none" />
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-emerald-950 italic tracking-tighter leading-none uppercase">EduGames</span>
                </div>
              </div>

              <div className="pl-1">
                <h1 className="text-3xl font-black text-[#009660] italic tracking-tighter leading-none mb-1">XADREZ</h1>
                <p className="text-[10px] font-black uppercase text-emerald-900/70 tracking-[0.2em]">Educação & Diversão</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-8 overflow-y-auto pr-2 scrollbar-hide">
            {/* Categorias / Desafios */}
            <div>
              <h3 className="text-[10px] font-black uppercase text-emerald-900/70 tracking-widest mb-4 flex items-center gap-2">
                <span>♟️</span> MODOS DE JOGO
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setGameType(null)}
                  className={`w-full text-left p-3.5 rounded-2xl font-black text-xs uppercase tracking-tight transition-all active:scale-95 ${!gameType ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-emerald-900/60 hover:bg-emerald-50'}`}
                >
                  🎮 Todos os Modos
                </button>

                <button
                  onClick={() => setGameType('classic')}
                  className={`w-full text-left p-3.5 rounded-2xl font-black text-xs uppercase tracking-tight transition-all active:scale-95 ${gameType === 'classic' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-emerald-900/60 hover:bg-emerald-50'}`}
                >
                  ♟️ Xadrez Real
                </button>

                <button
                  onClick={() => setGameType('velha')}
                  className={`w-full text-left p-3.5 rounded-2xl font-black text-xs uppercase tracking-tight transition-all active:scale-95 ${gameType === 'velha' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-emerald-900/60 hover:bg-emerald-50'}`}
                >
                  ⚔️ Xadrez da Velha
                </button>

                <button
                  onClick={() => setGameType('peao')}
                  className={`w-full text-left p-3.5 rounded-2xl font-black text-xs uppercase tracking-tight transition-all active:scale-95 ${gameType === 'peao' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-emerald-900/60 hover:bg-emerald-50'}`}
                >
                  ♙ Batalha dos Peões
                </button>
              </div>
            </div>
          </nav>

          {/* Rodapé da Sidebar - Perfil e Logout */}
          <div className="mt-auto pt-8 border-t-2 border-emerald-50 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-3xl relative group">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black shrink-0">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-[10px] font-black text-emerald-900/70 uppercase leading-none mb-1">Logado como</p>
                <p className="text-xs font-black text-emerald-950 truncate">{user?.fullName || 'Usuário'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center border-2 border-red-100 transition-all hover:bg-red-500 hover:text-white shrink-0"
                title="Sair"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 lg:p-12 overflow-y-auto lg:h-screen relative w-full">
        
        {/* Renderiza: TODOS OS MODOS (SELEÇÃO) */}
        {gameType === null && (
          <div className="flex flex-col">
            <header className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-4">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-emerald-950 border-2 border-emerald-100 active:scale-95 transition-all shrink-0 font-black text-xl"
                    title="Voltar"
                  >
                    ←
                  </button>
                )}
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 uppercase italic tracking-tighter">Escolha seu Desafio</h2>
                  <p className="text-xs sm:text-sm font-medium text-emerald-900/60 font-medium">Selecione um modo de jogo para começar a desenvolver suas habilidades!</p>
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Card: Xadrez Real */}
              <button
                onClick={() => setGameType('classic')}
                className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-left transition-all hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(0,150,96,0.12)] hover:border-emerald-300 active:scale-95 overflow-hidden h-[340px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity bg-[#009660]" />
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                  ♟️
                </div>
                <h3 className="text-emerald-950 font-black text-xl uppercase italic tracking-tight mb-2 truncate">Xadrez Real</h3>
                <p className="text-emerald-900/60 text-xs font-semibold leading-relaxed mb-6 line-clamp-3">
                  Enfrente IA ou adversários reais nas regras clássicas oficiais de xadrez da FIDE. Roque, En Passant e promoção completa.
                </p>
                <div className="mt-auto space-y-4">
                  <span className="inline-block bg-emerald-100 text-emerald-700 text-[9px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest">
                    Competitivo FIDE
                  </span>
                  <div className="pt-3 border-t border-emerald-50 flex justify-between items-center text-[10px] font-black text-emerald-900/70 uppercase tracking-wider">
                    <span>Modos: PVP / PVC</span>
                    <span>Tempo Controlado</span>
                  </div>
                </div>
              </button>

              {/* Card: Xadrez da Velha */}
              <button
                onClick={() => setGameType('velha')}
                className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-left transition-all hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(0,150,96,0.12)] hover:border-emerald-300 active:scale-95 overflow-hidden h-[340px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity bg-amber-400" />
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                  ⚔️
                </div>
                <h3 className="text-emerald-950 font-black text-xl uppercase italic tracking-tight mb-2 truncate">Xadrez da Velha</h3>
                <p className="text-emerald-900/60 text-xs font-semibold leading-relaxed mb-6 line-clamp-3">
                  Uma fusão alucinante! Controle peças de xadrez e capture oponentes em uma grade de jogo da velha. Rapidez e atenção!
                </p>
                <div className="mt-auto space-y-4">
                  <span className="inline-block bg-amber-100 text-amber-800 text-[9px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest">
                    Estratégia Casual
                  </span>
                  <div className="pt-3 border-t border-emerald-50 flex justify-between items-center text-[10px] font-black text-emerald-900/70 uppercase tracking-wider">
                    <span>Partidas Rápidas</span>
                    <span>PVC Integrado</span>
                  </div>
                </div>
              </button>

              {/* Card: Batalha dos Peões */}
              <button
                onClick={() => setGameType('peao')}
                className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-left transition-all hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(0,150,96,0.12)] hover:border-emerald-300 active:scale-95 overflow-hidden h-[340px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity bg-indigo-500" />
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                  ♙
                </div>
                <h3 className="text-emerald-950 font-black text-xl uppercase italic tracking-tight mb-2 truncate">Batalha dos Peões</h3>
                <p className="text-emerald-900/60 text-xs font-semibold leading-relaxed mb-6 line-clamp-3">
                  Leve o seu exército de peões até a linha de fundo do oponente e vença o combate tático de avanços e capturas.
                </p>
                <div className="mt-auto space-y-4">
                  <span className="inline-block bg-indigo-100 text-indigo-700 text-[9px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest">
                    Novo!
                  </span>
                  <div className="pt-3 border-t border-emerald-50 flex justify-between items-center text-[10px] font-black text-emerald-900/70 uppercase tracking-wider">
                    <span>Avanço Dinâmico</span>
                    <span>PVP / PVC</span>
                  </div>
                </div>
              </button>
            </section>
          </div>
        )}

        {/* Renderiza: LOBBY DE XADREZ REAL (CLÁSSICO) */}
        {gameType === 'classic' && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    if (subMode) setSubMode(null);
                    else if (mode) setMode(null);
                    else setGameType(null);
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-emerald-950 border-2 border-emerald-100 active:scale-95 transition-all shrink-0 font-black text-xl"
                  title="Voltar"
                >
                  ←
                </button>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 uppercase italic tracking-tighter">Xadrez Real</h2>
                  <p className="text-xs sm:text-sm font-medium text-emerald-900/60">Desafie sua mente no clássico jogo de estratégia.</p>
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
                  <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className={`text-[9px] font-black tracking-widest ${connected ? 'text-green-700' : 'text-red-700'}`}>
                    {connected ? 'LIVE' : 'OFFLINE'}
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
                    <p className="text-emerald-900/60 text-sm font-medium mb-6">Desafie um amigo ou outro estudante online em tempo real.</p>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider mt-auto w-fit">
                      Conta para o Ranking
                    </span>
                  </button>

                  <button
                    className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-left transition-all hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,150,96,0.1)] hover:border-emerald-300 active:scale-95 overflow-hidden"
                    onClick={() => setMode('PVC')}
                  >
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                      🤖
                    </div>
                    <h3 className="text-emerald-950 font-black text-xl uppercase italic tracking-tight mb-2">Jogador vs Computador</h3>
                    <p className="text-emerald-900/60 text-sm font-medium mb-6">Treine e aprimore suas jogadas contra a Inteligência Artificial.</p>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider mt-auto w-fit">
                      Treino Casual
                    </span>
                  </button>
                </div>
              </section>
            )}

            {/* PVP options */}
            {mode === 'PVP' && !subMode && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-xl font-black text-emerald-950 uppercase italic tracking-tight mb-6">Opções do Jogo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-left transition-all hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,150,96,0.1)] hover:border-emerald-300 active:scale-95 overflow-hidden"
                    onClick={() => setSubMode('create')}
                  >
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                      ➕
                    </div>
                    <h3 className="text-emerald-950 font-black text-xl uppercase italic tracking-tight mb-2">Criar Nova Sala</h3>
                    <p className="text-emerald-900/60 text-sm font-medium">Gere um código exclusivo e convide um colega para jogar.</p>
                  </button>

                  <button
                    className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-8 text-left transition-all hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,150,96,0.1)] hover:border-emerald-300 active:scale-95 overflow-hidden"
                    onClick={() => setSubMode('join')}
                  >
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                      🔗
                    </div>
                    <h3 className="text-emerald-950 font-black text-xl uppercase italic tracking-tight mb-2">Entrar em Sala</h3>
                    <p className="text-emerald-900/60 text-sm font-medium">Digite o código de acesso gerado pelo seu oponente.</p>
                  </button>
                </div>
              </section>
            )}

            {/* PVP Create Panel */}
            {mode === 'PVP' && subMode === 'create' && (
              <section className="max-w-2xl mx-auto w-full bg-white border-2 border-emerald-100 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,150,96,0.05)] animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-2xl font-black text-emerald-950 uppercase italic tracking-tight mb-2 text-center">Criar Nova Sala</h2>
                <p className="text-emerald-900/60 text-sm font-medium mb-8 text-center">
                  Uma sala exclusiva será aberta. Um sorteio inicial definirá as cores de cada jogador de forma justa.
                </p>

                <div className="mb-8">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-900/70 mb-3 block">Controle de Tempo</span>
                  <div className="flex flex-wrap gap-2">
                    {TIME_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        className={`px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-tight transition-all active:scale-95 ${timeLimit === opt.value ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-50 text-emerald-900/60 hover:bg-slate-100'}`}
                        onClick={() => setTimeLimit(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-2xl text-xs font-black uppercase mb-6">
                    ⚠ {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => setSubMode(null)}
                    className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs shadow-[0_6px_0_#004d33] hover:brightness-105 transition-all active:translate-y-1 active:shadow-none"
                  >
                    {loading ? '⏳ CRIANDO...' : '🎮 INICIAR DESAFIO'}
                  </button>
                </div>
              </section>
            )}

            {/* PVP Join Panel */}
            {mode === 'PVP' && subMode === 'join' && (
              <section className="max-w-md mx-auto w-full bg-white border-2 border-emerald-100 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,150,96,0.05)] animate-in fade-in slide-in-from-bottom-4 duration-300 text-center">
                <h2 className="text-2xl font-black text-emerald-950 uppercase italic tracking-tight mb-2">Entrar em Sala</h2>
                <p className="text-emerald-900/60 text-sm font-medium mb-8 text-center">
                  Digite o código de 6 caracteres fornecido pelo criador do jogo.
                </p>

                <input
                  type="text"
                  placeholder="CÓDIGO (EX: ABC123)"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
                  maxLength={8}
                  className="w-full bg-slate-50 border-2 border-emerald-100/50 p-4 rounded-2xl focus:border-emerald-300 transition-all outline-none font-black text-base text-emerald-950 text-center uppercase placeholder:text-emerald-900/20 shadow-inner mb-6 tracking-[0.2em]"
                />

                {error && (
                  <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-2xl text-xs font-black uppercase mb-6">
                    ⚠ {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => setSubMode(null)}
                    className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleJoinRoom}
                    disabled={loading || !joinCode}
                    className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs shadow-[0_6px_0_#004d33] hover:brightness-105 transition-all active:translate-y-1 active:shadow-none"
                  >
                    {loading ? '⏳ ENTRANDO...' : '🔗 CONECTAR'}
                  </button>
                </div>
              </section>
            )}

            {/* PVC Panel */}
            {mode === 'PVC' && (
              <section className="max-w-2xl mx-auto w-full bg-white border-2 border-emerald-100 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,150,96,0.05)] animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-2xl font-black text-emerald-950 uppercase italic tracking-tight mb-2 text-center">Treinar Contra o Computador</h2>
                <p className="text-emerald-900/60 text-sm font-medium mb-8 text-center">
                  Desafie o computador para treinar suas estratégias e aprimorar o seu xadrez no seu próprio ritmo.
                </p>

                <div className="mb-8">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-900/70 mb-4 block">Selecione a Dificuldade</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AI_LEVELS.map((lvl) => (
                      <button
                        key={lvl.value}
                        className={`flex flex-col p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${aiLevel === lvl.value ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 hover:border-emerald-100'}`}
                        onClick={() => setAiLevel(lvl.value)}
                      >
                        <strong className="text-emerald-950 font-black text-sm">{lvl.label}</strong>
                        <span className="text-emerald-900/50 text-[10px] font-medium">{lvl.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-900/70 mb-3 block">Controle de Tempo</span>
                  <div className="flex flex-wrap gap-2">
                    {TIME_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        className={`px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-tight transition-all active:scale-95 ${timeLimit === opt.value ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-50 text-emerald-900/60 hover:bg-slate-100'}`}
                        onClick={() => setTimeLimit(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setMode(null)}
                    className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handlePlayVsAI}
                    className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs shadow-[0_6px_0_#004d33] hover:brightness-105 transition-all active:translate-y-1 active:shadow-none"
                  >
                    🤖 JOGAR CONTRA IA
                  </button>
                </div>
              </section>
            )}

            <footer className="mt-auto pt-12 flex flex-col sm:flex-row gap-2 text-[10px] font-black text-emerald-900/70 uppercase tracking-widest">
              <span>♟ Todas as regras FIDE implementadas</span>
              <span className="hidden sm:inline">·</span>
              <span>En passant · Roque · Promoção</span>
              <span className="hidden sm:inline">·</span>
              <span>Empates Regulamentares</span>
            </footer>
          </div>
        )}

        {/* Renderiza: LOBBY DE XADREZ DA VELHA (EMBUTIDO) */}
        {gameType === 'velha' && (
          <div className="h-full relative select-none">
            <XadrezVelhaScreen 
              user={user} 
              onBack={() => setGameType(null)} 
              onSessionActive={setIsChildSessionActive} 
            />
          </div>
        )}

        {/* Renderiza: LOBBY DE BATALHA DOS PEÕES (EMBUTIDO) */}
        {gameType === 'peao' && (
          <div className="h-full relative select-none">
            <PeaoScreen 
              user={user} 
              onBack={() => setGameType(null)} 
              onSessionActive={setIsChildSessionActive} 
            />
          </div>
        )}

      </main>

      {/* Modais flutuantes */}
      {showRanking && <ChessRankingBoard onClose={() => setShowRanking(false)} />}
    </div>
  );
}
