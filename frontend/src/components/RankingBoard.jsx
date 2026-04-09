import React, { useState, useEffect } from 'react';

import { API_URL } from '../config/api';

const Podium = ({ top3, mode }) => {
  if (!top3 || top3.length === 0) return null;
  const reordered = [];
  if (top3.length > 1) reordered.push({ ...top3[1], pos: 2 });
  if (top3.length > 0) reordered.push({ ...top3[0], pos: 1 });
  if (top3.length > 2) reordered.push({ ...top3[2], pos: 3 });

  const label = mode === 'CREATOR' ? 'PARTIDAS' : 'PTS';

  return (
    <div className="flex justify-center items-end gap-3 sm:gap-6 mt-12 mb-6 pb-4 border-b-2 border-emerald-900/5 relative overflow-visible px-2">
      {reordered.map((u) => (
        <div key={u.id} className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 hover:-translate-y-2 transition-transform">
          {u.pos === 1 && <span className="text-[40px] sm:text-[50px] -mb-3 z-20 drop-shadow-xl relative animate-bounce">👑</span>}
          {u.pos === 2 && <span className="text-[30px] sm:text-[40px] -mb-2 z-20 drop-shadow-md">🥈</span>}
          {u.pos === 3 && <span className="text-[30px] sm:text-[40px] -mb-2 z-20 drop-shadow-md">🥉</span>}
          
          {/* Avatar Círculo */}
          <div className={`relative z-10 rounded-full flex flex-col items-center justify-center font-black text-white shadow-xl border-4 ${
            u.pos === 1 ? 'w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-[#FFCE00] to-yellow-400 border-white text-emerald-900' :
            u.pos === 2 ? 'w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-zinc-300 to-slate-400 border-white text-white' :
            'w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-orange-300 to-amber-600 border-white text-white'
          }`}>
             <div className="text-center truncate px-2 w-full">
                 <span className={`block text-[10px] sm:text-xs uppercase tracking-widest truncate mix-blend-color-burn`}>{u.name.split(' ')[0]}</span>
                 <span className={`${u.pos === 1 ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'} drop-shadow-md leading-none mt-1 block`}>{u.points}</span>
             </div>
          </div>
          
          {/* Base do Pódio 3D Styled */}
          <div className={`w-[85px] sm:w-[110px] flex flex-col items-center pt-3 rounded-t-2xl shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2)] mt-[-15px] relative overflow-hidden ${
            u.pos === 1 ? 'h-[140px] sm:h-[180px] bg-gradient-to-b from-[#009660] to-[#007b4f] border-t-[10px] border-[#FFCE00]' :
            u.pos === 2 ? 'h-[110px] sm:h-[140px] bg-gradient-to-b from-[#008253] to-[#00603d] border-t-[10px] border-zinc-300 opacity-95' :
            'h-[80px] sm:h-[100px] bg-gradient-to-b from-[#007047] to-[#005030] border-t-[10px] border-orange-300 opacity-90'
          }`}>
            <span className="text-4xl sm:text-6xl font-black text-black/10 drop-shadow-sm mix-blend-overlay">{u.pos}</span>
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-100/50 mt-1">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const RankingBoard = ({ onClose }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterMode, setFilterMode] = useState('GERAL'); // GERAL, CATEGORIA, TEMA, CREATOR
  const [filterId, setFilterId] = useState(null);
  
  const [categories, setCategories] = useState([]);
  const [themes, setThemes] = useState([]);

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
    setFilterId(null);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full max-w-3xl rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-300 border border-emerald-900/10">
        
        {/* Header Elegante */}
        <div className="relative bg-gradient-to-r from-[#009660] to-[#007b4f] p-6 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-md z-20">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-md">🏆 LÍDERES SUPREMOS</h2>
            <p className="text-[#FFCE00] font-bold text-[10px] sm:text-xs mt-1 uppercase tracking-widest opacity-90">Honra e glória para os mestres</p>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 sm:relative sm:top-0 sm:right-0 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center font-black transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs de Filtro Moderninhas */}
        <div className="bg-white shadow-[0_10px_20px_rgba(0,0,0,0.03)] z-10 px-6 pt-5 pb-4 border-b-2 border-slate-100 flex flex-col gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] gap-1">
            <button onClick={() => handleModeChange('GERAL')} className={`flex-1 truncate py-3 sm:py-3.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterMode === 'GERAL' ? 'bg-[#009660] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>🌍 GERAL</button>
            <button onClick={() => handleModeChange('CATEGORY')} className={`flex-1 truncate py-3 sm:py-3.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterMode === 'CATEGORY' ? 'bg-[#009660] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>📚 NÍVEIS</button>
            <button onClick={() => handleModeChange('THEME')} className={`flex-1 truncate py-3 sm:py-3.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterMode === 'THEME' ? 'bg-[#009660] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>🎯 JOGOS</button>
            <button onClick={() => handleModeChange('CREATOR')} className={`flex-1 truncate py-3 sm:py-3.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterMode === 'CREATOR' ? 'bg-[#FFCE00] text-[#009660] shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>🛠️ AUTORES</button>
          </div>
          
          {filterMode === 'CATEGORY' && (
            <select onChange={(e) => setFilterId(e.target.value)} value={filterId || ''} className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl focus:outline-none focus:border-[#009660] font-black uppercase tracking-wider text-slate-700 text-xs transition-colors appearance-none cursor-pointer">
               <option value="" disabled>SELECIONE UM NÍVEL DE ENSINO...</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {filterMode === 'THEME' && (
            <select onChange={(e) => setFilterId(e.target.value)} value={filterId || ''} className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl focus:outline-none focus:border-[#009660] font-black uppercase tracking-wider text-slate-700 text-xs transition-colors appearance-none cursor-pointer">
               <option value="" disabled>SELECIONE UM JOGO ESPECÍFICO...</option>
               {themes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category?.name || 'Geral'})</option>)}
            </select>
          )}
        </div>

        {/* Dynamic List / Podium */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 relative scrollbar-hide">
          {(filterMode === 'CATEGORY' || filterMode === 'THEME') && !filterId ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <span className="text-6xl drop-shadow-xl mb-4 animate-bounce">🎯</span>
                <p className="font-black text-slate-500 uppercase tracking-widest text-sm text-center">Defina seu alvo</p>
                <p className="text-xs font-bold text-slate-400 text-center mt-2">Escolha uma opção no filtro acima.</p>
             </div>
          ) : loading ? (
             <div className="flex justify-center items-center py-24">
                 <div className="w-16 h-16 border-[6px] border-[#009660]/20 border-t-[#009660] rounded-full animate-spin"></div>
             </div>
          ) : leaderboard.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <span className="text-7xl block mb-6 grayscale">🏞️</span>
                <p className="font-black text-slate-500 uppercase tracking-widest text-base">Território Inexplorado</p>
                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">Seja o primeiro a conquistar o topo!</p>
             </div>
          ) : (
             <div className="fade-in duration-500">
               {/* Podium - Top 3 */}
               <Podium top3={leaderboard.slice(0, 3)} mode={filterMode} />
               
               {/* Listagem 4 em diante */}
               {leaderboard.length > 3 && (
                 <div className="space-y-3 pt-6 px-1 lg:px-10">
                   {leaderboard.slice(3).map((user, idx) => {
                     const realPos = idx + 4;
                     return (
                        <div key={user.id} className="group flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-[2rem] bg-white shadow-sm border border-slate-100 hover:border-[#009660]/30 hover:shadow-md transition-all">
                           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full font-black text-sm sm:text-base bg-slate-100 text-slate-500 flex items-center justify-center border-2 border-slate-200 group-hover:bg-[#009660] group-hover:text-white transition-colors shrink-0">
                             {realPos}
                           </div>
                           <div className="flex-1 overflow-hidden">
                               <h3 className="font-black text-slate-800 text-sm sm:text-base truncate uppercase">{user.name}</h3>
                               <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-widest truncate mt-0.5">{user.school || 'Sem vínculo'}</p>
                           </div>
                           <div className="text-right shrink-0">
                               <span className="block text-xl sm:text-2xl font-black text-[#009660] leading-none">{user.points}</span>
                               <span className="block text-[8px] uppercase font-black tracking-widest text-slate-400 mt-1">{filterMode === 'CREATOR' ? 'PARTIDAS' : 'PTS'}</span>
                           </div>
                        </div>
                     )
                   })}
                 </div>
               )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RankingBoard;
