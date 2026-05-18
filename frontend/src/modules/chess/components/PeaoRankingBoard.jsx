import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config/api';

export default function PeaoRankingBoard({ onClose }) {
  const [activeTab, setActiveTab] = useState('students');
  const [students,  setStudents]  = useState([]);
  const [schools,   setSchools]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { fetchRanking(); }, []);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('domino_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [rS, rSc] = await Promise.all([
        fetch(`${API_URL}/peao/ranking/students`, { headers }),
        fetch(`${API_URL}/peao/ranking/schools`,  { headers }),
      ]);
      const sd = await rS.json();
      const sc = await rSc.json();
      setStudents(Array.isArray(sd) ? sd : []);
      setSchools( Array.isArray(sc) ? sc : []);
    } catch (err) {
      console.error('Erro ao buscar ranking de peões:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentData = activeTab === 'students' ? students : schools;

  const podiumColors = [
    { border: '#FFCE00', bg: 'from-yellow-200 to-yellow-50', text: 'text-yellow-900', emoji: '👑', h: 'h-40', nameColor: 'text-yellow-900', ptsColor: 'text-yellow-800' },
    { border: '#94a3b8', bg: 'from-slate-200 to-slate-100', text: 'text-slate-700', emoji: '🥈', h: 'h-32', nameColor: 'text-slate-600', ptsColor: 'text-slate-500' },
    { border: '#b45309', bg: 'from-amber-200 to-amber-100', text: 'text-amber-900', emoji: '🥉', h: 'h-24', nameColor: 'text-amber-900', ptsColor: 'text-amber-700' },
  ];
  const PODIUM_ORDER = [1, 0, 2]; // 2º, 1º, 3º (visual clássico do pódio)

  const renderPodium = () => {
    if (currentData.length < 3) return null;
    return (
      <div className="flex justify-center items-end gap-3 mb-8 pt-6 px-2">
        {PODIUM_ORDER.map((dataIdx) => {
          const item = currentData[dataIdx];
          const c    = podiumColors[dataIdx];
          const isFirst = dataIdx === 0;
          return (
            <div key={dataIdx} className="flex flex-col items-center flex-1 max-w-[110px]">
              <div
                className={`rounded-full border-4 flex items-center justify-center shadow-xl mb-[-12px] relative z-20 text-2xl ${isFirst ? 'w-20 h-20 text-4xl' : 'w-14 h-14'}`}
                style={{ borderColor: c.border, background: '#fff8' }}
              >
                {c.emoji}
              </div>
              <div className={`bg-gradient-to-t ${c.bg} w-full rounded-t-xl pb-2 pt-6 px-1 text-center shadow-md ${c.h} flex flex-col justify-between relative z-10`}>
                <span className={`font-bold text-[10px] sm:text-xs truncate w-full px-1 ${c.nameColor}`}>
                  {item?.name || '---'}
                </span>
                <span className={`font-black text-xs sm:text-sm ${c.ptsColor}`}>
                  {item?.points || 0} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#009660] to-[#007b4f] p-4 sm:p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-[#FFCE00] drop-shadow-sm">
              Hall da Fama
            </h2>
            <p className="text-xs sm:text-sm font-medium text-white/80 mt-0.5">♙ Batalha dos Peões</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar ranking"
            className="w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white font-black text-lg transition-all active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white px-4 sm:px-6 pt-4 pb-3 border-b border-slate-100 flex gap-2">
          {[['students', '👤 Top Alunos'], ['schools', '🏫 Top Escolas']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === key ? 'bg-[#009660] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#009660]/20 border-t-[#009660]" />
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center text-slate-400 py-10 font-medium">
              <span className="text-5xl block mb-4">♙</span>
              Nenhum duelo registrado ainda.<br />
              <span className="text-xs">Jogue no modo PVP para pontuar!</span>
            </div>
          ) : (
            <>
              {renderPodium()}
              <div className="space-y-2 mt-2">
                {currentData.slice(3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center p-3 sm:p-4 bg-white rounded-2xl border-2 border-slate-100 hover:border-[#009660]/30 transition-all shadow-sm"
                  >
                    <span className="w-8 text-center font-black text-slate-400 text-sm">{item.rank}º</span>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="font-bold text-slate-700 text-sm truncate">{item.name}</p>
                      {activeTab === 'students' && (
                        <p className="text-[10px] text-slate-400 truncate">
                          {item.school} • V:{item.stats?.wins} D:{item.stats?.losses}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 bg-emerald-50 text-[#009660] font-black px-3 py-1 rounded-lg text-xs whitespace-nowrap">
                      {item.points} pts
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
