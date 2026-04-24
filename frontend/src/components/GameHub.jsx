import React from 'react';
import logoCampina from '../assets/logo-campina.png';
import logoPrefeitura from '../assets/logo-prefeitura.png';

const GameCard = ({ title, description, icon, color, playersOnline, onClick, badge }) => {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col bg-white rounded-[2.5rem] p-8 text-left transition-all hover:scale-[1.05] hover:shadow-[0_20px_50px_rgba(0,150,96,0.15)] border-2 border-emerald-50 hover:border-emerald-200 active:scale-95 overflow-hidden h-full"
    >
      {/* Background Glow */}
      <div 
        className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-10 group-hover:opacity-30 transition-opacity"
        style={{ backgroundColor: color }}
      />

      <div className="flex justify-between items-start mb-8 relative z-10">
        <div 
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl shadow-inner group-hover:rotate-12 transition-transform duration-500 bg-emerald-50"
          style={{ color: color }}
        >
          {icon}
        </div>
        {badge && (
          <span className="bg-[#FFCE00] text-emerald-900 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-2 relative z-10">
        <h3 className="text-2xl font-black text-emerald-900 uppercase italic tracking-tighter leading-none">
          {title}
        </h3>
        <p className="text-emerald-900/60 text-xs font-medium leading-relaxed line-clamp-3">
          {description}
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-emerald-50 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest">
            {playersOnline} Online
          </span>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-[#009660] group-hover:text-white transition-all shadow-sm font-black text-xl">
          →
        </div>
      </div>
    </button>
  );
};

const GameHub = ({ user, onSelectGame, onLogout }) => {
  const games = [
    {
      id: 'domino',
      title: 'Dominó Seduc',
      description: 'O clássico jogo de dominó com temas educativos e salas competitivas.',
      icon: '🀄',
      color: '#009660',
      playersOnline: 124,
      badge: 'Popular'
    },
    {
      id: 'xadrez',
      title: 'Xadrez Real',
      description: 'Desafie seus amigos em partidas épicas de estratégia e raciocínio.',
      icon: '♟️',
      color: '#0284c7',
      playersOnline: 42,
      badge: 'Em Breve'
    },
    {
      id: 'quiz',
      title: 'Mestre do Quiz',
      description: 'Teste seus conhecimentos em diversas matérias e suba no ranking.',
      icon: '💡',
      color: '#d97706',
      playersOnline: 89,
      badge: 'Novo'
    },
    {
      id: 'memoria',
      title: 'Super Memória',
      description: 'Treine seu cérebro combinando cartas de temas escolares.',
      icon: '🧠',
      color: '#db2777',
      playersOnline: 15,
      badge: 'Em Breve'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F0FDF4] p-6 sm:p-12 lg:p-16">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-2 animate-in fade-in slide-in-from-top-4">
                <img src={logoCampina} alt="Seduc" className="h-10 sm:h-14 w-auto object-contain pointer-events-none" />
                <div className="w-px h-10 bg-emerald-200"></div>
                <img src={logoPrefeitura} alt="Prefeitura" className="h-10 sm:h-14 w-auto object-contain pointer-events-none" />
              </div>
              <h1 className="text-4xl font-black text-emerald-900 uppercase italic tracking-tighter leading-none">
                EduGames<span className="text-[#009660]">.</span>
              </h1>
              <p className="text-[10px] font-black uppercase text-emerald-900/40 tracking-[0.3em] mt-1">Plataforma de Aprendizagem</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-white p-3 pr-6 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-emerald-100">
          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-inner">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest leading-none mb-1">Logado como</p>
            <p className="text-sm font-black text-emerald-900">{user?.fullName || 'Visitante'}</p>
          </div>
          <button 
            onClick={onLogout}
            className="ml-4 w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center border-2 border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"
            title="Sair"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto mb-20 relative rounded-[3.5rem] overflow-hidden bg-emerald-900 p-12 text-white shadow-[0_40px_100px_rgba(0,150,96,0.2)]">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block bg-[#FFCE00]/20 text-[#FFCE00] text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.3em] mb-6 border border-[#FFCE00]/30 backdrop-blur-sm">
            Destaque do Mês
          </span>
          <h2 className="text-5xl font-black mb-6 leading-none italic uppercase tracking-tighter drop-shadow-md">
            Torneio de Dominó <br /> <span className="text-[#FFCE00]">Interescolar</span>
          </h2>
          <p className="text-emerald-100/80 text-lg font-medium mb-8 leading-tight max-w-lg border-l-4 border-[#FFCE00] pl-6">
            Participe das eliminatórias e ganhe prêmios exclusivos para sua escola. As inscrições estão abertas!
          </p>
          <button className="bg-[#FFCE00] text-emerald-900 px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-[0_6px_0_#d1a900] hover:scale-105 transition-all active:translate-y-1 active:shadow-none">
            Ver Detalhes 🚀
          </button>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-black/20 to-transparent" />
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#FFCE00] rounded-full blur-[140px] opacity-20" />
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-white rounded-full blur-[120px] opacity-10" />
      </section>

      {/* Games Grid */}
      <section className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h3 className="text-3xl font-black text-emerald-900 uppercase italic tracking-tighter">
              Nossos Jogos
            </h3>
            <p className="text-xs font-black text-emerald-900/30 uppercase tracking-[0.2em] mt-1">Selecione para começar</p>
          </div>
          <div className="flex gap-3">
            <span className="w-10 h-3 rounded-full bg-[#009660] shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-emerald-200" />
            <span className="w-3 h-3 rounded-full bg-emerald-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {games.map(game => (
            <GameCard
              key={game.id}
              {...game}
              onClick={() => game.id === 'domino' ? onSelectGame(game.id) : alert('Este jogo estará disponível em breve!')}
            />
          ))}
        </div>
      </section>

      {/* Footer / Stats */}
      <footer className="max-w-7xl mx-auto mt-24 py-12 border-t-2 border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-4">
          <img src={logoCampina} alt="Seduc" className="h-8 w-auto opacity-50 grayscale hover:grayscale-0 transition-all" />
          <p className="text-emerald-900/30 font-black uppercase text-[9px] tracking-[0.3em]">
            © 2026 EduGames Plataforma de Jogos Seduc
          </p>
        </div>
        <div className="flex gap-12 bg-white px-10 py-6 rounded-[2.5rem] shadow-sm border border-emerald-50">
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-900 leading-none">1.2k</p>
            <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest mt-1">Partidas Hoje</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-900 leading-none">45</p>
            <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest mt-1">Escolas Ativas</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GameHub;
