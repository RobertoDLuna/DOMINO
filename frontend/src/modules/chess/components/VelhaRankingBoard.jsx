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
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-gray-300 bg-gray-100 flex items-center justify-center text-xl sm:text-2xl shadow-lg relative z-10 mb-[-10px]">
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
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-yellow-400 bg-yellow-100 flex items-center justify-center text-2xl sm:text-4xl shadow-xl relative z-20 mb-[-15px]">
            👑
          </div>
          <div className="bg-gradient-to-t from-yellow-200 to-yellow-100 w-full rounded-t-xl pb-2 pt-6 px-1 text-center shadow-lg h-32 sm:h-40 flex flex-col justify-between relative z-10">
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
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-amber-600 bg-amber-100 flex items-center justify-center text-xl sm:text-2xl shadow-lg relative z-10 mb-[-10px]">
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-[#2c3e50] -z-10" />

        <div className="p-4 sm:p-6 pb-0 flex justify-between items-start text-white">
          <div>
            <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-yellow-400 drop-shadow-md">
              Hall da Fama
            </h2>
            <p className="text-xs sm:text-sm font-medium text-gray-200">Xadrez da Velha</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 sm:p-6 pb-2 justify-center">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'students'
                ? 'bg-yellow-400 text-yellow-900 shadow-md transform scale-105'
                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'
            }`}
          >
            <span>👤</span> Top Alunos
          </button>
          <button
            onClick={() => setActiveTab('schools')}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'schools'
                ? 'bg-yellow-400 text-yellow-900 shadow-md transform scale-105'
                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'
            }`}
          >
            <span>🏫</span> Top Escolas
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#2c3e50]" />
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center text-gray-500 py-10 font-medium">
              Nenhum dado encontrado para o ranking ainda.
            </div>
          ) : (
            <>
              {renderPodium()}
              
              <div className="space-y-2 mt-4">
                {currentData.slice(3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center p-3 sm:p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <span className="w-6 sm:w-8 text-center font-bold text-gray-400 text-sm sm:text-base">
                      {item.rank}º
                    </span>
                    <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm sm:text-base truncate">
                        {item.name}
                      </p>
                      {activeTab === 'students' && (
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                          {item.school} • W:{item.stats?.wins} L:{item.stats?.losses} D:{item.stats?.draws}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 sm:ml-4 bg-yellow-100 text-yellow-800 font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap">
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
