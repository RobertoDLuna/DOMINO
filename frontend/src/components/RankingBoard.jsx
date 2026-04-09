import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const RankingBoard = ({ onClose }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterMode, setFilterMode] = useState('GERAL'); // GERAL, CATEGORIA, TEMA, CREATOR
  const [filterId, setFilterId] = useState(null);
  
  const [categories, setCategories] = useState([]);
  const [themes, setThemes] = useState([]);

  // Carrega lista de categorias e temas no Início
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const catRes = await fetch(`${API_URL}/themes/categories`);
        if (catRes.ok) setCategories(await catRes.json());
        
        const token = localStorage.getItem('domino_token') || localStorage.getItem('token');
        const themeRes = await fetch(`${API_URL}/themes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (themeRes.ok) setThemes(await themeRes.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchDropdowns();
  }, []);

  // Recarrega o Ranking sempre que o Mode ou ID mudarem
  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('domino_token') || localStorage.getItem('token');
        
        let query = '';
        if (filterMode === 'CATEGORY' && filterId) query = `?categoryId=${filterId}`;
        else if (filterMode === 'THEME' && filterId) query = `?themeId=${filterId}`;
        else if (filterMode === 'CREATOR') query = `?type=CREATORS`;

        const response = await fetch(`${API_URL}/ranking${query}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data);
        } else {
          setLeaderboard([]);
        }
      } catch (error) {
        console.error("Erro ao buscar ranking:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [filterMode, filterId]);

  const handleModeChange = (mode) => {
    setFilterMode(mode);
    setFilterId(null); // Reseta pra não mesclar IDs errados
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-emerald-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="relative bg-[#009660] p-6 sm:p-8 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter">🏆 Ranking Global</h2>
            <p className="text-emerald-100 font-medium text-xs sm:text-sm mt-1">Sua glória eternizada na mesa de dominó</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center font-black transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs de Filtro */}
        <div className="bg-white shadow-[0_5px_15px_rgba(0,0,0,0.05)] z-10 px-4 pt-4 border-b-2 border-slate-100 flex flex-col gap-3">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
            <button onClick={() => handleModeChange('GERAL')} className={`flex-1 truncate py-2 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterMode === 'GERAL' ? 'bg-white text-emerald-600 shadow-md scale-100' : 'text-slate-400 hover:text-slate-600'}`}>🌍 GERAL</button>
            <button onClick={() => handleModeChange('CATEGORY')} className={`flex-1 truncate py-2 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterMode === 'CATEGORY' ? 'bg-white text-emerald-600 shadow-md scale-100' : 'text-slate-400 hover:text-slate-600'}`}>📚 NÍVEIS</button>
            <button onClick={() => handleModeChange('THEME')} className={`flex-1 truncate py-2 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterMode === 'THEME' ? 'bg-white text-emerald-600 shadow-md scale-100' : 'text-slate-400 hover:text-slate-600'}`}>🎯 JOGOS</button>
            <button onClick={() => handleModeChange('CREATOR')} className={`flex-1 title="Autores com mais partidas concluídas" truncate py-2 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterMode === 'CREATOR' ? 'bg-white text-emerald-600 shadow-md scale-100' : 'text-slate-400 hover:text-slate-600'}`}>🛠️ AUTORES</button>
          </div>
          
          {filterMode === 'CATEGORY' && (
            <select onChange={(e) => setFilterId(e.target.value)} value={filterId || ''} className="w-full mb-3 bg-white border-2 border-emerald-100 p-3 rounded-xl focus:outline-none focus:border-emerald-500 font-bold text-slate-700 text-sm">
               <option value="" disabled>Selecione um Nível de Ensino...</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {filterMode === 'THEME' && (
            <select onChange={(e) => setFilterId(e.target.value)} value={filterId || ''} className="w-full mb-3 bg-white border-2 border-emerald-100 p-3 rounded-xl focus:outline-none focus:border-emerald-500 font-bold text-slate-700 text-sm">
               <option value="" disabled>Selecione o Jogo Específico...</option>
               {themes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category?.name || 'Geral'})</option>)}
            </select>
          )}
        </div>

        {/* Content ListView */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 relative">
          {(filterMode === 'CATEGORY' || filterMode === 'THEME') && !filterId ? (
             <div className="text-center py-16 opacity-50">
                <span className="text-5xl block mb-4">🔽</span>
                <p className="font-black text-slate-500 uppercase tracking-widest text-sm">Selecione o filtro acima para ver os líderes.</p>
             </div>
          ) : loading ? (
             <div className="flex justify-center py-10">
                 <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : leaderboard.length === 0 ? (
             <div className="text-center py-20 opacity-50">
                <span className="text-6xl block mb-4">🏜️</span>
                <p className="font-black text-slate-500 uppercase tracking-widest text-sm">Nenhum ranking ainda para esta categoria.</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Seja o primeiro a jogar e conquistar os pontos!</p>
             </div>
          ) : (
             <div className="space-y-3">
               {leaderboard.map((user, idx) => (
                 <div 
                   key={user.id} 
                   className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white shadow-sm border-2 transition-all ${idx === 0 ? 'border-[#FFCE00] bg-yellow-50/50 transform hover:scale-[1.01]' : idx === 1 ? 'border-zinc-300 bg-zinc-50' : idx === 2 ? 'border-orange-300 bg-orange-50' : 'border-transparent'}`}
                 >
                   {/* Colocação */}
                   <div className={`w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center rounded-xl font-black text-lg sm:text-xl shrink-0 shadow-sm ${idx === 0 ? 'bg-[#FFCE00] text-[#009660]' : idx === 1 ? 'bg-zinc-300 text-zinc-700' : idx === 2 ? 'bg-orange-300 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                     {idx + 1}
                   </div>
                   
                   {/* Info */}
                   <div className="flex-1 overflow-hidden">
                     <h3 className={`font-black text-slate-800 text-base sm:text-lg truncate uppercase leading-tight ${idx === 0 ? 'text-[#009660]' : ''}`}>{user.name}</h3>
                     <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{user.school}</p>
                   </div>
                   
                   {/* Pontuação Final */}
                   <div className="text-right shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl">
                      <span className="block text-xl sm:text-2xl font-black text-emerald-600 leading-none">{user.points}</span>
                      <span className="block text-[8px] sm:text-[9px] font-black text-emerald-900/40 uppercase tracking-widest leading-none mt-1">
                        {filterMode === 'CREATOR' ? 'PARTIDAS' : 'PTS'}
                      </span>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RankingBoard;
