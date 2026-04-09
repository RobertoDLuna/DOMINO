import React, { useState, useEffect } from 'react';
import ThemeService from '../services/ThemeService';
import { themes as defaultThemes } from '../config/themes';
import ThemeCreator from './ThemeCreator';
import AuthService from '../services/AuthService';
import RankingBoard from './RankingBoard';

const GameCard = ({ theme, onClick }) => {
  const isDefault = theme.isDefault;
  const author = theme.owner?.fullName || (isDefault ? 'SISTEMA' : 'DESCONHECIDO');
  const date = theme.createdAt ? new Date(theme.createdAt).toLocaleDateString('pt-BR') : '--/--/----';
  const categoryName = theme.category?.name || 'GERAL';
  
  return (
    <button
      onClick={() => onClick(theme)}
      className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-5 text-left transition-all hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(0,150,96,0.15)] hover:border-emerald-300 active:scale-95 animate-in fade-in zoom-in duration-500 overflow-hidden"
    >
      {/* Background Accent */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: theme.color || '#009660' }}
      />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
          {theme.emoji || '🎨'}
        </div>
        {isDefault && (
          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            Padrão
          </span>
        )}
      </div>

      <h3 className="text-emerald-900 font-black text-lg leading-tight uppercase mb-1 truncate">
        {theme.name}
      </h3>
      
      <p className="text-emerald-900/60 text-xs font-medium mb-4 line-clamp-2 h-8">
        {theme.description || 'Nenhuma descrição disponível.'}
      </p>

      <div className="mt-auto space-y-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest">Nível:</span>
          <span className="text-[10px] font-black text-emerald-600 uppercase">{categoryName}</span>
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-emerald-50">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-emerald-900/30 uppercase tracking-tighter">Autor</span>
            <span className="text-[9px] font-black text-emerald-800 uppercase truncate max-w-[80px]">{author}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] font-black text-emerald-900/30 uppercase tracking-tighter">Criado em</span>
            <span className="text-[9px] font-black text-emerald-800">{date}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

const GameDetailsModal = ({ theme, onPlay, onClose }) => {
  if (!theme) return null;
  
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-emerald-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="relative h-48 flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 opacity-20" 
            style={{ backgroundColor: theme.color || '#009660' }}
          />
          <div className="text-7xl relative z-10 animate-bounce-slow">
            {theme.emoji || '🎨'}
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-emerald-900 flex items-center justify-center font-black transition-colors z-20"
          >
            ✕
          </button>
        </header>

        <div className="p-8 sm:p-10 text-center">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-2 block">
            {theme.category?.name || 'GERAL'}
          </span>
          <h2 className="text-3xl font-black text-emerald-900 uppercase italic tracking-tighter mb-4">
            {theme.name}
          </h2>
          
          <div className="bg-emerald-50/50 rounded-3xl p-6 mb-8 text-emerald-900/80 font-medium leading-relaxed">
            <p className="text-sm italic">
              {theme.summary || theme.description || 'Este jogo não possui um resumo detalhado.'}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all active:scale-95"
            >
              Voltar
            </button>
            <button
              onClick={() => onPlay(theme)}
              className="flex-[2] py-4 rounded-2xl bg-[#FFCE00] text-[#009660] font-black uppercase tracking-widest text-sm shadow-[0_6px_0_#d1a900] hover:brightness-105 transition-all active:translate-y-1 active:shadow-none"
            >
              JOGAR AGORA! 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HomeScreen = ({ user, onSelectTheme, onJoinRoom }) => {
  const [themes, setThemes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [detailsTheme, setDetailsTheme] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, DEFAULT, CUSTOM

  const handleLogout = () => {
    if (confirm('Deseja realmente sair?')) {
      AuthService.logout();
      window.location.reload();
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (selectedCategory) filters.categoryId = selectedCategory;
      if (selectedSubCategory) filters.subcategoryId = selectedSubCategory;
      if (search) filters.search = search;
      
      const dbThemes = await ThemeService.getThemes(filters);
      
      // Merge with hardcoded themes
      const allDefaultThemes = defaultThemes.map(t => ({ 
        ...t, 
        isDefault: true,
        category: { name: 'GERAL' },
        createdAt: new Date().toISOString()
      }));
      
      // Filter default themes in memory if filters apply
      const filteredDefaults = allDefaultThemes.filter(t => {
        if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
        // Defaults are currently all category GERAL, so if a category is selected and it's not GERAL, hide them
        if (selectedCategory && selectedCategory !== 'default') return false; 
        return true;
      });

      // Se o Backend retornou temas padrões que a gente inseriu lá pro Ranking, exclua-os pra não duplicar o card na Home
      const filteredDbThemes = dbThemes.filter(dbTheme => 
         !allDefaultThemes.some(defaultTheme => defaultTheme.id === dbTheme.id)
      );

      setThemes([...filteredDefaults, ...filteredDbThemes]);
    } catch (err) {
      console.error("Erro ao carregar dados da Home:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, selectedSubCategory, search]);

  useEffect(() => {
    ThemeService.getCategories().then(setCategories);
  }, []);

  const filteredThemes = themes.filter(t => {
    if (activeTab === 'DEFAULT') return t.isDefault;
    if (activeTab === 'CUSTOM') return !t.isDefault;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-[#F0FDF4] w-full relative">
      {/* Mobile Overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-emerald-900/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-xl border-r-2 border-emerald-100 p-6 sm:p-8 flex flex-col z-50 transform transition-transform duration-300 lg:static lg:translate-x-0 ${showMobileMenu ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-[#009660] italic tracking-tighter leading-none mb-1">DOMINÓ</h1>
            <p className="text-[10px] font-black uppercase text-emerald-900/40 tracking-[0.2em]">Educação & Diversão</p>
          </div>
          <button 
            onClick={() => setShowMobileMenu(false)}
            className="lg:hidden text-emerald-900 bg-emerald-50 w-8 h-8 rounded-full flex items-center justify-center hover:bg-emerald-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-8 overflow-y-auto pr-2 scrollbar-hide">
          {/* Categories */}
          <div>
            <h3 className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest mb-4 flex items-center gap-2">
              <span>📚</span> NÍVEIS DE ENSINO
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => { setSelectedCategory(null); setSelectedSubCategory(null); }}
                className={`w-full text-left p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all ${!selectedCategory ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-900/60 hover:bg-emerald-50'}`}
              >
                Todos os Níveis
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSelectedSubCategory(null); }}
                  className={`w-full text-left p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all ${selectedCategory === cat.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-900/60 hover:bg-emerald-50'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategories */}
          {selectedCategory && (
            <div className="animate-in slide-in-from-left-4">
              <h3 className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest mb-4 flex items-center gap-2">
                <span>🍎</span> DISCIPLINAS
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedSubCategory(null)}
                  className={`w-full text-left p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all ${!selectedSubCategory ? 'bg-amber-400 text-amber-900 shadow-lg' : 'text-emerald-900/60 hover:bg-amber-50'}`}
                >
                  Todas as Disciplinas
                </button>
                {categories.find(c => c.id === selectedCategory)?.subs?.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubCategory(sub.id)}
                    className={`w-full text-left p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all ${selectedSubCategory === sub.id ? 'bg-amber-400 text-amber-900 shadow-lg' : 'text-emerald-900/60 hover:bg-amber-50'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

         <div className="mt-auto pt-8 border-t-2 border-emerald-50 space-y-4">
          {/* Admin Panel Button inside Sidebar for Admins */}
          {user?.role === 'ADMIN' && (
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('openAdminPanel'))}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border-b-4 border-slate-950"
            >
              <span>🛡️</span> PAINEL ADMIN
            </button>
          )}

          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-3xl relative group">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black shrink-0">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-[10px] font-black text-emerald-900/40 uppercase leading-none mb-1">Logado como</p>
              <p className="text-xs font-black text-emerald-900 truncate">{user?.fullName || 'Usuário'}</p>
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

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-10 lg:p-12 overflow-y-auto h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setShowMobileMenu(true)}
               className="lg:hidden w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-emerald-900 border-2 border-emerald-100 active:scale-95 transition-transform shrink-0"
             >
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <line x1="3" y1="12" x2="21" y2="12"></line>
                 <line x1="3" y1="6" x2="21" y2="6"></line>
                 <line x1="3" y1="18" x2="21" y2="18"></line>
               </svg>
             </button>
             <div>
               <h2 className="text-3xl sm:text-4xl font-black text-emerald-900 uppercase italic tracking-tighter">Explorar Jogos</h2>
               <p className="text-xs sm:text-sm font-medium text-emerald-900/40">Escolha um tema e comece o desafio!</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
              <input
                type="text"
                placeholder="BUSCAR JOGO..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border-2 border-emerald-100 p-4 pl-12 rounded-[2rem] focus:border-emerald-300 transition-all outline-none font-black text-sm text-emerald-900 uppercase placeholder:text-emerald-200"
              />
            </div>
            <button
              onClick={onJoinRoom}
              className="bg-amber-400 text-amber-900 p-4 rounded-[1.5rem] font-black text-sm shadow-[0_6px_0_#d97706] hover:brightness-110 transition-all active:translate-y-1 active:shadow-none flex items-center gap-2 whitespace-nowrap"
            >
              <span>🔑</span> <span className="hidden sm:inline">SALA</span>
            </button>
            <button
              onClick={() => setShowRanking(true)}
              className="bg-indigo-500 text-white p-4 rounded-[1.5rem] font-black text-sm shadow-[0_6px_0_#3730a3] hover:brightness-110 transition-all active:translate-y-1 active:shadow-none flex items-center gap-2 whitespace-nowrap"
            >
              <span>🏆</span> <span className="hidden sm:inline">RANKING</span>
            </button>
            {(user?.role === 'ADMIN' || user?.role === 'PROFESSOR') && (
              <button
                onClick={() => setShowCreator(true)}
                className="bg-[#009660] text-white p-4 rounded-[1.5rem] font-black text-sm shadow-[0_6px_0_#00764D] hover:brightness-110 transition-all active:translate-y-1 active:shadow-none flex items-center gap-2 whitespace-nowrap"
              >
                <span>➕</span> <span className="hidden sm:inline">CRIAR NOVO</span>
              </button>
            )}

          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-emerald-100/50 p-1.5 rounded-[2rem] w-fit">
          <button 
            onClick={() => setActiveTab('ALL')}
            className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-900/40 hover:text-emerald-900'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setActiveTab('DEFAULT')}
            className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'DEFAULT' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-900/40 hover:text-emerald-900'}`}
          >
            Padrão
          </button>
          <button 
            onClick={() => setActiveTab('CUSTOM')}
            className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'CUSTOM' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-900/40 hover:text-emerald-900'}`}
          >
            Customizados
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {loading ? (
             [...Array(6)].map((_, i) => (
                <div key={i} className="bg-emerald-50 h-64 rounded-[2rem] animate-pulse" />
             ))
          ) : filteredThemes.length > 0 ? (
            filteredThemes.map(theme => (
              <GameCard 
                key={theme.id} 
                theme={theme} 
                onClick={setDetailsTheme} 
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="text-6xl mb-6 truncate grayscale">🏜️</div>
              <p className="text-emerald-900/40 font-black uppercase tracking-widest">Nenhum jogo encontrado com estes filtros.</p>
              <button 
                onClick={() => { setSearch(''); setSelectedCategory(null); setSelectedSubCategory(null); }}
                className="mt-4 text-emerald-600 font-bold hover:underline"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Overlays */}
      {showCreator && (
        <ThemeCreator 
          onThemeCreated={(newTheme) => { setShowCreator(false); fetchData(); }} 
          onClose={() => setShowCreator(false)} 
        />
      )}
      
      {showRanking && (
        <RankingBoard onClose={() => setShowRanking(false)} />
      )}
      
      {detailsTheme && (
        <GameDetailsModal 
          theme={detailsTheme} 
          onClose={() => setDetailsTheme(null)} 
          onPlay={(theme) => onSelectTheme(theme)}
        />
      )}
    </div>
  );
};

export default HomeScreen;
