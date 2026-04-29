import React, { useState, useEffect } from 'react';
import { API_URL } from '../config/api';

const TrophySVG = ({ fill = '#FFE066', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 4h28v22c0 9-6.5 14-14 14S10 35 10 26V4z" fill={fill} opacity="0.95"/>
    <path d="M10 8H5a5 5 0 0 0 5 5V8z" fill={fill} opacity="0.65"/>
    <path d="M38 8h5a5 5 0 0 1-5 5V8z" fill={fill} opacity="0.65"/>
    <rect x="20" y="40" width="8" height="6" rx="1" fill={fill} opacity="0.8"/>
    <rect x="14" y="46" width="20" height="4" rx="2" fill={fill}/>
    <path d="M24 13l2 5h5.5l-4.5 3.2 1.7 5.3L24 23l-4.7 3.5 1.7-5.3L16.5 18H22z" fill="white" opacity="0.85"/>
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

const Podium = ({ top3, mode, className = 'mt-20 sm:mt-24 mb-4' }) => {
  if (!top3 || top3.length === 0) return null;
  const reordered = [];
  if (top3.length > 1) reordered.push({ ...top3[1], pos: 2 });
  if (top3.length > 0) reordered.push({ ...top3[0], pos: 1 });
  if (top3.length > 2) reordered.push({ ...top3[2], pos: 3 });

  const label = 'PTS';

  const getDisplayName = (name) => {
    if (!name) return 'Anônimo';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };

  return (
    <div className={`flex items-end gap-2 sm:gap-3 pb-2 w-full justify-center ${className}`}>
      {reordered.map((u) => {
        const cfg = PODIUM_CONFIG[u.pos];
        const isFirst = u.pos === 1;

        return (
          <div key={u.id} className={`flex flex-col items-center relative pt-12 sm:pt-16`} style={{ zIndex: 30 - u.pos }}>
            <style dangerouslySetInnerHTML={{__html: `
              .podium-bar-${u.pos} { width: ${cfg.barWMobile}px; height: ${cfg.barHMobile}px; } 
              @media (min-width: 640px) { .podium-bar-${u.pos} { width: ${cfg.barWDesktop}px; height: ${cfg.barHDesktop}px; } }
            `}}></style>

            <div className="relative flex items-center justify-center z-20"
              style={{ width: cfg.dSize, height: cfg.dSize, marginBottom: -15 }}>
              
              <div className="absolute bottom-full mb-1 sm:mb-2 w-full flex justify-center z-40 pointer-events-none">
                 {u.pos === 1 && <span className="animate-bounce inline-block text-[45px] sm:text-[55px]" style={{filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.3))'}}>👑</span>}
              </div>
              <div className="absolute inset-0 shadow-[0_6px_20px_rgba(0,0,0,0.28)]"
                style={{ background: cfg.outerDiamond, transform: 'rotate(45deg)', borderRadius: 10 }}/>
              <div className="absolute"
                style={{
                  inset: 6, borderRadius: 8, transform: 'rotate(45deg)',
                  background: `linear-gradient(145deg, ${cfg.innerGrad[0]}, ${cfg.innerGrad[1]})`
                }}/>
              <div className="relative z-10 drop-shadow-md flex items-center justify-center">
                <TrophySVG fill={cfg.cupFill} size={cfg.tSize}/>
              </div>
            </div>

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
                  fontSize: isFirst ? 14 : 11,
                  textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                {getDisplayName(u.name)}
              </span>
              <span className="block text-center font-black leading-none text-white"
                style={{ fontSize: isFirst ? 38 : 30, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                {u.points}
              </span>
              <span className="block text-center font-black uppercase text-white/80 mt-1 text-[10px]">
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ChessRankingBoard = ({ onClose }) => {
  const [data, setData] = useState({ students: [], schools: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('STUDENTS'); // STUDENTS or SCHOOLS

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('domino_token');
        const response = await fetch(`${API_URL}/chess/ranking`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Erro ao buscar ranking de xadrez:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, []);

  const list = tab === 'STUDENTS' ? data.students : data.schools;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-[#1a1a1a] w-full lg:max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-full sm:h-auto max-h-[90vh] rounded-[2rem] border border-white/10 relative">
        
        {/* Header Tema Xadrez (Dark/Gold) */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#000000] p-6 flex items-center justify-between border-b border-white/10 shrink-0 relative">
          <div className="flex items-center gap-4">
             <span className="text-4xl">♟️</span>
             <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter">Ranking de Xadrez</h2>
                <p className="text-[#f1c40f] font-bold text-[10px] sm:text-xs mt-1 uppercase tracking-widest opacity-80">Mestres das 64 casas</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-black transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tabs de Filtro */}
        <div className="bg-[#222] p-4 flex gap-2 border-b border-white/5">
           <button 
             onClick={() => setTab('STUDENTS')}
             className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${tab === 'STUDENTS' ? 'bg-[#f1c40f] text-black shadow-[0_0_20px_rgba(241,196,15,0.3)]' : 'text-gray-500 hover:text-gray-300 bg-white/5'}`}
           >
             👥 Alunos
           </button>
           <button 
             onClick={() => setTab('SCHOOLS')}
             className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${tab === 'SCHOOLS' ? 'bg-[#f1c40f] text-black shadow-[0_0_20px_rgba(241,196,15,0.3)]' : 'text-gray-500 hover:text-gray-300 bg-white/5'}`}
           >
             🏫 Escolas
           </button>
        </div>

        {/* Listagem */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-10 scrollbar-hide bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
          {loading ? (
             <div className="flex justify-center items-center py-24">
                 <div className="w-12 h-12 border-4 border-white/10 border-t-[#f1c40f] rounded-full animate-spin"></div>
             </div>
          ) : list.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-30 text-white">
                <span className="text-7xl mb-6">🏜️</span>
                <p className="font-black uppercase tracking-widest text-lg">Sem dados ainda</p>
                <p className="text-xs mt-2 font-bold uppercase tracking-widest">Jogue uma partida PVP para iniciar o ranking!</p>
             </div>
          ) : (
             <div className="fade-in duration-500">
               <Podium top3={list.slice(0, 3)} />
               
               <div className="mt-8 flex flex-col gap-3">
                 {list.slice(3).map((item, idx) => (
                    <div key={item.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all">
                       <div className="w-10 h-10 rounded-full font-black text-sm text-[#f1c40f] bg-black/40 flex items-center justify-center border border-white/10 shrink-0">
                         {item.rank}º
                       </div>
                       <div className="flex-1 overflow-hidden">
                           <h3 className="font-bold text-white text-sm sm:text-base truncate uppercase tracking-tight">{item.name}</h3>
                           <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest truncate">{item.school || 'Sem Escola'}</p>
                       </div>
                       <div className="text-right shrink-0">
                           <span className="block text-xl font-black text-[#f1c40f] leading-none">{item.points}</span>
                           <span className="block text-[8px] uppercase font-black tracking-widest text-gray-500 mt-1">Pontos</span>
                       </div>
                    </div>
                 ))}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChessRankingBoard;
