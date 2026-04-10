import React, { useState, useEffect } from 'react';

import { API_URL } from '../config/api';
import { themes as defaultThemes } from '../config/themes';

const TrophySVG = ({ fill = '#FFE066', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 4h28v22c0 9-6.5 14-14 14S10 35 10 26V4z" fill={fill} opacity="0.95"/>
    <path d="M10 8H5a5 5 0 0 0 5 5V8z" fill={fill} opacity="0.65"/>
    <path d="M38 8h5a5 5 0 0 1-5 5V8z" fill={fill} opacity="0.65"/>
    <rect x="20" y="40" width="8" height="6" rx="1" fill={fill} opacity="0.8"/>
    <rect x="14" y="46" width="20" height="4" rx="2" fill={fill}/>
    <path d="M24 13l2 5h5.5l-4.5 3.2 1.7 5.3L24 23l-4.7 3.5 1.7-5.3L16.5 18H22z" fill="white" opacity="0.85"/>
    <path d="M15 9 Q17 15 15 22" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
  </svg>
);

const SparkSVG = ({ fill = '#FFD700', size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={fill}><path d="M10 0L11.8 8.2L20 10L11.8 11.8L10 20L8.2 11.8L0 10L8.2 8.2Z"/></svg>
);

const PODIUM_CONFIG = {
  1: { outerDiamond: '#8B6508', innerGrad: ['#FFD700','#FFC200'], cupFill: '#FFF8C0', spark: '#FFE566', barBg: '#FFCE00', barTop: '#9A6B00', barHMobile: 140, barHDesktop: 160, barWMobile: 90, barWDesktop: 120, tSize: 32, dSize: 64 },
  2: { outerDiamond: '#4A4A4A', innerGrad: ['#D4D4D4','#A0A0A0'], cupFill: '#EFEFEF', spark: '#C8C8C8', barBg: '#BABABA', barTop: '#5A5A5A', barHMobile: 110, barHDesktop: 130, barWMobile: 80, barWDesktop: 100, tSize: 26, dSize: 50 },
  3: { outerDiamond: '#5C2D0E', innerGrad: ['#C87832','#9A5020'], cupFill: '#FFDAAA', spark: '#D08838', barBg: '#E07828', barTop: '#6A3010', barHMobile: 80, barHDesktop: 100, barWMobile: 70, barWDesktop: 90, tSize: 20, dSize: 40 },
};

export const Podium = ({ top3, mode, align = 'center', className = 'mt-20 sm:mt-24 mb-4', isWidget = false }) => {
  if (!top3 || top3.length === 0) return null;
  const reordered = [];
  if (top3.length > 1) reordered.push({ ...top3[1], pos: 2 });
  if (top3.length > 0) reordered.push({ ...top3[0], pos: 1 });
  if (top3.length > 2) reordered.push({ ...top3[2], pos: 3 });

  const label = mode === 'CREATOR' ? 'PARTIDAS' : 'PTS';

  const getDisplayName = (name) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };

  return (
    <div className={`flex items-end gap-2 sm:gap-3 pb-2 w-full ${className} ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
      {reordered.map((u) => {
        const cfg = PODIUM_CONFIG[u.pos];
        const isFirst = u.pos === 1;
        const dSize = isWidget ? cfg.dSize * 0.85 : cfg.dSize;
        const tSize = isWidget ? cfg.tSize * 0.85 : cfg.tSize;

        return (
          <div key={u.id ?? u.name} className={`flex flex-col items-center relative podium-col-wrapper ${isWidget ? 'pt-8' : 'pt-12 sm:pt-16'}`} style={{ zIndex: 30 - u.pos }}>
            <style dangerouslySetInnerHTML={{__html: `
              .podium-bar-${u.pos} { width: ${isWidget ? cfg.barWMobile * 0.85 : cfg.barWMobile}px; height: ${isWidget ? cfg.barHMobile * 0.85 : cfg.barHMobile}px; } 
              @media (min-width: 640px) { .podium-bar-${u.pos} { width: ${isWidget ? cfg.barWDesktop * 0.85 : cfg.barWDesktop}px; height: ${isWidget ? cfg.barHDesktop * 0.85 : cfg.barHDesktop}px; } }
            `}}></style>

            <div className="relative flex items-center justify-center z-20"
              style={{ width: dSize, height: dSize, marginBottom: isWidget ? -8 : -15 }}>
              
              <div className="absolute bottom-full mb-1 sm:mb-2 w-full flex justify-center z-40 pointer-events-none">
                 {u.pos === 1 && <span className="animate-bounce inline-block" style={{fontSize: isWidget ? 45 : 55, filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.3))'}}>👑</span>}
                 {u.pos === 2 && <span className="animate-bounce inline-block" style={{fontSize: isWidget ? 35 : 45, filter: 'grayscale(100%) brightness(1.3) drop-shadow(0 5px 8px rgba(0,0,0,0.2))'}}>👑</span>}
                 {u.pos === 3 && <span className="animate-bounce inline-block" style={{fontSize: isWidget ? 32 : 40, filter: 'sepia(1) hue-rotate(-50deg) saturate(3) brightness(0.8) drop-shadow(0 5px 8px rgba(0,0,0,0.2))'}}>👑</span>}
              </div>
              {/* Losango externo */ }
              {/* Losango externo */}
              <div className="absolute inset-0 shadow-[0_6px_20px_rgba(0,0,0,0.28)]"
                style={{ background: cfg.outerDiamond, transform: 'rotate(45deg)', borderRadius: isWidget ? 6 : 10 }}/>
              <div className="absolute"
                style={{
                  inset: isWidget ? 4 : 6, borderRadius: isWidget ? 5 : 8, transform: 'rotate(45deg)',
                  background: `linear-gradient(145deg, ${cfg.innerGrad[0]}, ${cfg.innerGrad[1]})`
                }}/>
              {/* Troféu */}
              <div className="relative z-10 drop-shadow-md flex items-center justify-center">
                <TrophySVG fill={cfg.cupFill} size={tSize}/>
              </div>
              {!isWidget && (
                 <>
                   <div className="absolute -top-2 -right-1"><SparkSVG fill={cfg.spark} size={isFirst ? 12 : 9}/></div>
                   <div className="absolute top-1 left-0 opacity-55"><SparkSVG fill={cfg.spark} size={isFirst ? 8 : 6}/></div>
                   <div className="absolute -bottom-1 -right-3 opacity-40"><SparkSVG fill={cfg.spark} size={8}/></div>
                 </>
              )}
            </div>

            {/* Barra do Pódio */ }
            <div className={`flex flex-col items-center justify-center z-10 overflow-hidden podium-bar-${u.pos}`}
              style={{
                background: cfg.barBg,
                borderTop: `6px solid ${cfg.barTop}`,
                borderRadius: '12px 12px 0 0',
                paddingTop: 10,
                paddingBottom: 4,
                paddingLeft: 4,
                paddingRight: 4,
                boxShadow: 'inset 0 -8px 18px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.15)',
              }}>
              <span className="block text-center font-black uppercase w-full text-white overflow-hidden mb-1"
                style={{
                  fontSize: isWidget ? (isFirst ? 12 : 10) : (isFirst ? 14 : 11),
                  letterSpacing: '0px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                {getDisplayName(u.name)}
              </span>
              <span className="block text-center font-black leading-none text-white"
                style={{ fontSize: isWidget ? (isFirst ? 32 : 25) : (isFirst ? 38 : 30), textShadow: '0 2px 8px rgba(0,0,0,0.3)', letterSpacing: '0px' }}>
                {u.points}
              </span>
              <span className="block text-center font-black uppercase text-white/80 mt-1" style={{ fontSize: isWidget ? 9 : 10, letterSpacing: '0px' }}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
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
        
        if (themeRes.ok) {
          const dbThemes = await themeRes.json();
          // Mescla temas padrões com os do banco e remove duplicatas por ID
          const merged = [
            ...defaultThemes.map(t => ({ 
              id: t.id, 
              name: t.name, 
              isSystem: true,
              category: { name: 'Padrão' } 
            })),
            ...dbThemes
          ];
          
          // Deduplica pelo ID (o Map mantém a última ocorrência, então o DB sobrescreve o Mock)
          const uniqueThemes = Array.from(new Map(merged.map(t => [t.id, t])).values());
          setThemes(uniqueThemes);
        }
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
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full lg:max-w-5xl xl:max-w-6xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-full sm:h-auto max-h-[100vh] sm:max-h-[90vh] rounded-2xl sm:rounded-[3rem] animate-in zoom-in-95 duration-300 border border-emerald-900/10">
        
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
                 <div className="pt-6 px-2 lg:px-8 flex flex-col gap-3">
                   {/* 4 e 5: Cartões em cinza "medalha honrosa" */}
                   {leaderboard.slice(3, 5).map((user, idx) => {
                     const realPos = idx + 4;
                     return (
                        <div key={user.id} className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-slate-100/80 border-2 border-slate-200 shadow-sm opacity-90 transition-all hover:opacity-100">
                           <div className="w-10 h-10 rounded-full font-black text-sm text-slate-500 bg-white shadow-inner flex items-center justify-center border border-slate-300 shrink-0">
                             {realPos}º
                           </div>
                           <div className="flex-1 overflow-hidden">
                               <h3 className="font-black text-slate-600 text-sm sm:text-base truncate uppercase">{user.name}</h3>
                               <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-widest truncate mt-0.5">{user.school || 'Sem vínculo'}</p>
                           </div>
                           <div className="text-right shrink-0">
                               <span className="block text-xl sm:text-2xl font-black text-slate-500 leading-none">{user.points}</span>
                               <span className="block text-[8px] uppercase font-black tracking-widest text-slate-400 mt-1">{filterMode === 'CREATOR' ? 'PARTIDAS' : 'PTS'}</span>
                           </div>
                        </div>
                     )
                   })}

                   {/* Posição 6 em diante - Lista Simples Textual */}
                   {leaderboard.length > 5 && (
                     <div className="mt-4 pt-4 border-t border-slate-200 px-2 flex flex-col gap-2">
                       {leaderboard.slice(5).map((user, idx) => {
                         const realPos = idx + 6;
                         return (
                           <div key={user.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-2 rounded-lg">
                             <div className="flex items-center gap-3 overflow-hidden">
                               <span className="font-bold text-slate-400 text-sm w-6 text-right shrink-0">{realPos}º</span>
                               <span className="font-bold text-slate-700 text-xs sm:text-sm truncate uppercase">{user.name}</span>
                             </div>
                             <div className="flex items-baseline gap-1 shrink-0">
                               <span className="font-black text-slate-600 text-sm sm:text-base">{user.points}</span>
                               <span className="text-[9px] font-bold text-slate-400 uppercase">{filterMode === 'CREATOR' ? 'partidas' : 'pts'}</span>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
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
