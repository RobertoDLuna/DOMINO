import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config/api';
import AuthService from '../../../services/AuthService';

const MemoryReports = ({ onBack }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('Todos');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch(`${API_URL}/memory/reports`, {
          headers: {
            'Authorization': `Bearer ${AuthService.getToken()}`
          }
        });
        const data = await response.json();
        setReports(data.data || []);
      } catch (err) {
        console.error("Erro ao buscar relatórios", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const uniqueThemes = ['Todos', ...new Set(reports.map(r => r.theme?.name || 'Desconhecido'))];
  
  const filteredReports = selectedTheme === 'Todos' 
    ? reports 
    : reports.filter(r => (r.theme?.name || 'Desconhecido') === selectedTheme);

  return (
    <div className="flex h-screen bg-[#F0FDF4] w-full overflow-hidden">
      <main className="flex-1 p-6 sm:p-10 lg:p-12 flex flex-col max-w-7xl mx-auto w-full h-full">
        <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-12 shrink-0 justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-emerald-900 border-2 border-emerald-100 active:scale-95 transition-transform shrink-0 font-black text-xl"
              title="Voltar"
            >
              ←
            </button>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-emerald-900 uppercase italic tracking-tighter">Relatórios</h2>
              <p className="text-xs sm:text-sm font-medium text-emerald-900/70">Desempenho dos alunos no Jogo da Memória</p>
            </div>
          </div>
          
          {!loading && reports.length > 0 && (
            <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
              <label htmlFor="theme-filter" className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest mb-1 ml-1 sm:ml-0">
                Filtrar por Tema
              </label>
              <select
                id="theme-filter"
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="bg-white border-2 border-emerald-100 text-emerald-900 font-bold text-sm rounded-xl px-4 py-2 outline-none focus:border-emerald-300 shadow-sm transition-colors cursor-pointer w-full sm:w-auto min-w-[200px]"
              >
                {uniqueThemes.map(theme => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </div>
          )}
        </header>

        <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-100 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-auto flex-1 relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-emerald-50 border-b border-emerald-100">
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest bg-emerald-50">Aluno</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest bg-emerald-50">Tema</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest text-center bg-emerald-50">Erros</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest text-center bg-emerald-50">Maior Sequência de Erros</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest text-center bg-emerald-50">Tempo</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest text-center bg-emerald-50">Pontuação</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest text-right bg-emerald-50">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-emerald-900/50 font-medium">Carregando...</td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-emerald-900/50 font-medium">Nenhum registro encontrado.</td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="p-4 font-black text-emerald-900 text-sm">{report.userName}</td>
                      <td className="p-4 font-medium text-emerald-900/70 text-sm truncate max-w-[150px]">{report.theme?.name || 'Desconhecido'}</td>
                      <td className="p-4 font-black text-red-500 text-center text-sm">{report.errors}</td>
                      <td className="p-4 font-black text-red-400 text-center text-sm">{report.consecutiveErrors}</td>
                      <td className="p-4 font-black text-emerald-900 text-center text-sm">{formatTime(report.timeSpentSecs)}</td>
                      <td className="p-4 font-black text-[#FFCE00] text-center text-sm drop-shadow-sm">{report.finalScore}</td>
                      <td className="p-4 font-medium text-emerald-900/60 text-right text-xs">{formatDate(report.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MemoryReports;
