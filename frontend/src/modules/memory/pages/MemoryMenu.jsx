import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import ThemeService from '../../../services/ThemeService';
import { themes as defaultThemes } from '../../../config/themes';
import ThemeCreator from '../../domino/components/ThemeCreator';
import logoCampina from '../../../assets/logo-campina.png';

const GameCard = ({ theme, onClick, user, onDelete }) => {
  const isDefault = theme.isDefault;
  const author = theme.owner?.fullName || (isDefault ? 'SISTEMA' : 'DESCONHECIDO');
  const categoryName = theme.category?.name || 'GERAL';
  const canDelete = !isDefault && user && (user.role === 'ADMIN' || user.role === 'PROFESSOR' || user.id === theme.ownerId);

  return (
    <div
      onClick={() => onClick(theme)}
      className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-5 text-left transition-all hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(0,150,96,0.15)] hover:border-emerald-300 active:scale-95 animate-in fade-in zoom-in duration-500 overflow-hidden cursor-pointer"
      role="button"
      tabIndex={0}
    >
      {canDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(theme); }}
          className="absolute top-4 right-4 bg-red-50 text-red-500 w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white border-2 border-red-100 z-20"
          title="Excluir Tema"
        >
          <Trash2 size={16} strokeWidth={2.5} />
        </button>
      )}
      <div
        className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: theme.color || '#009660' }}
      />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
          {theme.emoji || '🧠'}
        </div>
        {isDefault && (
          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            Padrão
          </span>
        )}
      </div>
      <h3 className="text-emerald-900 font-black text-lg leading-tight uppercase mb-1 truncate pr-8">
        {theme.name}
      </h3>
      <p className="text-emerald-900/60 text-xs font-medium mb-4 line-clamp-2 h-8">
        {theme.description || 'Tema para jogo da memória.'}
      </p>
      <div className="mt-auto space-y-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-emerald-900/70 uppercase tracking-widest">Nível:</span>
          <span className="text-[10px] font-black text-emerald-600 uppercase">{categoryName}</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-emerald-50">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-emerald-900/70 uppercase tracking-tighter">Autor</span>
            <span className="text-[9px] font-black text-emerald-800 uppercase truncate max-w-[80px]">{author}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MemoryMenu = ({ user, onBack, onStartGame, onViewReports }) => {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [showCreator, setShowCreator] = useState(false);

  const fetchThemes = async () => {
    setLoading(true);
    try {
      const dbThemes = await ThemeService.getThemes({ search });
      const allDefaultThemes = defaultThemes.map(t => ({
        ...t,
        isDefault: true,
        category: { name: 'GERAL' },
        createdAt: new Date().toISOString()
      }));

      const filteredDefaults = allDefaultThemes.filter(t => {
        if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });

      const filteredDbThemes = dbThemes.filter(dbTheme =>
        !allDefaultThemes.some(defaultTheme => defaultTheme.id === dbTheme.id)
      );

      // Apenas temas que têm imagens configuradas podem ser jogados (para o jogo da memória)
      // O array symbols deve ter pelomenos 6 imagens (mesmo do domino).
      setThemes([...filteredDefaults, ...filteredDbThemes].filter(t => t.symbols && t.symbols.length >= 6));
    } catch (err) {
      console.error("Erro ao carregar dados da Home:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, [search]);

  const handleDeleteTheme = async (theme) => {
    if (window.confirm(`Deseja realmente excluir o tema "${theme.name}"?`)) {
      try {
        await ThemeService.deleteTheme(theme.id);
        fetchThemes();
      } catch (err) {
        alert(err.message || 'Erro ao excluir tema.');
      }
    }
  };

  const filteredThemes = themes.filter(t => {
    if (activeTab === 'DEFAULT') return t.isDefault;
    if (activeTab === 'CUSTOM') return !t.isDefault;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-[#F0FDF4] w-full relative">
      <main className="flex-1 p-6 sm:p-10 lg:p-12 overflow-y-auto h-screen max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-emerald-900 border-2 border-emerald-100 active:scale-95 transition-transform shrink-0 font-black text-xl"
                title="Voltar"
              >
                ←
              </button>
            )}
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-emerald-900 uppercase italic tracking-tighter">Super Memória</h2>
              <p className="text-xs sm:text-sm font-medium text-emerald-900/70">Treine seu cérebro combinando os pares!</p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            <input
              type="text"
              placeholder="BUSCAR TEMA..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border-2 border-emerald-100 p-4 pl-12 rounded-[2rem] focus:border-emerald-300 transition-all outline-none font-black text-sm text-emerald-900 uppercase placeholder:text-emerald-200 shadow-sm"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {(user?.role === 'ADMIN' || user?.role === 'PROFESSOR') && (
              <>
                <button
                  onClick={() => setShowCreator(true)}
                  className="w-full md:w-auto bg-[#009660] text-white px-5 py-4 rounded-[1.5rem] font-black text-[11px] shadow-[0_6px_0_#00764D] hover:brightness-110 transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>➕</span> <span className="inline">CRIAR NOVO TEMA</span>
                </button>
                <button
                  onClick={onViewReports}
                  className="w-full md:w-auto bg-indigo-500 text-white px-5 py-4 rounded-[1.5rem] font-black text-[11px] shadow-[0_6px_0_#3730a3] hover:brightness-110 transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>📊</span> <span className="inline">RELATÓRIOS (ALUNOS)</span>
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex gap-2 mb-8 bg-emerald-100/50 p-1.5 rounded-[2rem] w-fit">
          <button onClick={() => setActiveTab('ALL')} className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-900/70 hover:text-emerald-900'}`}>Todos</button>
          <button onClick={() => setActiveTab('DEFAULT')} className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'DEFAULT' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-900/70 hover:text-emerald-900'}`}>Padrão</button>
          <button onClick={() => setActiveTab('CUSTOM')} className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'CUSTOM' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-900/70 hover:text-emerald-900'}`}>Customizados</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-emerald-50 h-64 rounded-[2rem] animate-pulse" />
            ))
          ) : filteredThemes.length > 0 ? (
            filteredThemes.map(theme => (
              <GameCard key={theme.id} theme={theme} onClick={onStartGame} user={user} onDelete={handleDeleteTheme} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="text-6xl mb-6 truncate grayscale">🧠</div>
              <p className="text-emerald-900/70 font-black uppercase tracking-widest">Nenhum tema encontrado.</p>
            </div>
          )}
        </div>
      </main>

      {showCreator && (
        <ThemeCreator 
          gameType="memory"
          onThemeCreated={() => {
            setShowCreator(false);
            fetchThemes();
          }} 
          onClose={() => setShowCreator(false)} 
        />
      )}
    </div>
  );
};

export default MemoryMenu;
