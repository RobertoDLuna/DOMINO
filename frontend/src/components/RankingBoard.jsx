import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const RankingBoard = ({ onClose }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/ranking`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data);
        }
      } catch (error) {
        console.error("Erro ao buscar ranking:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, []);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-emerald-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="relative bg-emerald-500 p-8 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">🏆 Ranking Global</h2>
            <p className="text-emerald-100 font-medium text-sm mt-1">Os melhores jogadores de Dominó</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-emerald-400 hover:bg-emerald-300 text-white flex items-center justify-center font-black transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
          {loading ? (
             <div className="flex justify-center py-10">
                 <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : leaderboard.length === 0 ? (
             <div className="text-center py-20 opacity-50">
                <span className="text-6xl block mb-4">🏜️</span>
                <p className="font-black text-slate-500 uppercase tracking-widest">Nenhum ranking ainda.</p>
             </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((user, idx) => (
                <div 
                  key={user.id} 
                  className={`flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border-2 ${idx === 0 ? 'border-amber-400 bg-amber-50' : idx === 1 ? 'border-zinc-300 bg-zinc-50' : idx === 2 ? 'border-orange-300 bg-orange-50' : 'border-transparent'}`}
                >
                  {/* Posição */}
                  <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-black text-xl shrink-0 ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-zinc-300 text-zinc-700' : idx === 2 ? 'bg-orange-300 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                    {idx + 1}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-black text-slate-800 text-lg truncate uppercase">{user.name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{user.school}</p>
                  </div>
                  
                  {/* Pontos */}
                  <div className="text-right shrink-0">
                     <span className="block text-2xl font-black text-emerald-600">{user.points}</span>
                     <span className="block text-[10px] font-black text-emerald-900/40 uppercase tracking-widest">PTS</span>
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
