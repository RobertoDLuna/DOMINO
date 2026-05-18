import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config/api';

export default function VelhaRankingBoard({ onClose }) {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('domino_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resStudents, resSchools] = await Promise.all([
        fetch(`${API_URL}/velha/ranking/students`, { headers }),
        fetch(`${API_URL}/velha/ranking/schools`, { headers })
      ]);

      const studentsData = await resStudents.json();
      const schoolsData = await resSchools.json();

      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
    } catch (err) {
      console.error('Erro ao buscar ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentData = activeTab === 'students' ? students : schools;

  const renderPodium = () => {
    if (currentData.length < 3) return null;
    return (
      <div className="flex justify-center items-end gap-2 sm:gap-4 mb-8 pt-8 px-2">
        {/* Segundo Lugar */}
        <div className="flex flex-col items-center flex-1 max-w-[100px]">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-gray-300 bg-gray-100 flex items-center justify-center text-xl sm:text-2xl shadow-lg mb-[-10px] relative z-10">
            🥈
          </div>
          <div className="bg-gradient-to-t from-gray-200 to-gray-100 w-full rounded-t-xl pb-2 pt-4 px-1 text-center shadow-md h-24 sm:h-32 flex flex-col justify-between">
            <span className="font-bold text-gray-700 text-[10px] sm:text-xs truncate w-full px-1">
              {currentData[1]?.name || '---'}
            </span>
            <span className="text-gray-600 font-black text-xs sm:text-sm">
              {currentData[1]?.points || 0} pts
            </span>
          </div>
        </div>

        {/* Primeiro Lugar */}
        <div className="flex flex-col items-center flex-1 max-w-[110px]">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#FFCE00] bg-yellow-50 flex items-center justify-center text-2xl sm:text-4xl shadow-xl mb-[-15px] relative z-20">
            👑
          </div>
          <div className="bg-gradient-to-t from-yellow-200 to-yellow-50 w-full rounded-t-xl pb-2 pt-6 px-1 text-center shadow-lg h-32 sm:h-40 flex flex-col justify-between relative z-10">
            <span className="font-bold text-yellow-900 text-[10px] sm:text-xs truncate w-full px-1">
              {currentData[0]?.name || '---'}
            </span>
            <span className="text-yellow-800 font-black text-sm sm:text-base">
              {currentData[0]?.points || 0} pts
            </span>
          </div>
        </div>

        {/* Terceiro Lugar */}
        <div className="flex flex-col items-center flex-1 max-w-[100px]">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-amber-500 bg-amber-50 flex items-center justify-center text-xl sm:text-2xl shadow-lg mb-[-10px] relative z-10">
            🥉
          </div>
          <div className="bg-gradient-to-t from-amber-200 to-amber-100 w-full rounded-t-xl pb-2 pt-4 px-1 text-center shadow-md h-20 sm:h-24 flex flex-col justify-between">
            <span className="font-bold text-amber-900 text-[10px] sm:text-xs truncate w-full px-1">
              {currentData[2]?.name || '---'}
            </span>
            <span className="text-amber-800 font-black text-xs sm:text-sm">
              {currentData[2]?.points || 0} pts
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    // Overlay — clique fora fecha
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Modal — clique dentro não propaga */}
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com gradiente verde — sem z-index negativo */}
        <div className="bg-gradient-to-r from-[#009660] to-[#007b4f] p-4 sm:p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-[#FFCE00] drop-shadow-sm">
              Hall da Fama
            </h2>
            <p className="text-xs sm:text-sm font-medium text-white/80 mt-0.5">Xadrez da Velha</p>
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
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === 'students'
                ? 'bg-[#009660] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-600 bg-slate-50'
            }`}
          >
            👤 Top Alunos
          </button>
          <button
            onClick={() => setActiveTab('schools')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === 'schools'
                ? 'bg-[#009660] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-600 bg-slate-50'
            }`}
          >
            🏫 Top Escolas
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#009660]/20 border-t-[#009660]" />
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center text-slate-400 py-10 font-medium">
              <span className="text-5xl block mb-4">🏜️</span>
              Nenhum dado encontrado para o ranking ainda.
            </div>
          ) : (
            <>
              {renderPodium()}

              <div className="space-y-2 mt-4">
                {currentData.slice(3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center p-3 sm:p-4 bg-white rounded-2xl border-2 border-slate-100 hover:border-[#009660]/30 transition-all shadow-sm"
                  >
                    <span className="w-8 text-center font-black text-slate-400 text-sm">
                      {item.rank}º
                    </span>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="font-bold text-slate-700 text-sm truncate">{item.name}</p>
                      {activeTab === 'students' && (
                        <p className="text-[10px] text-slate-400 truncate">
                          {item.school} • V:{item.stats?.wins} D:{item.stats?.losses} E:{item.stats?.draws}
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
