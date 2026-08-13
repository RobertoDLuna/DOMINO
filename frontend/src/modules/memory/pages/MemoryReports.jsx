import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config/api';
import AuthService from '../../../services/AuthService';

const MemoryReports = ({ onBack }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex min-h-screen bg-[#F0FDF4] w-full">
      <main className="flex-1 p-6 sm:p-10 lg:p-12 overflow-y-auto h-screen max-w-7xl mx-auto">
        <header className="flex items-center gap-4 mb-12">
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
        </header>

        <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50 border-b border-emerald-100">
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest">Aluno</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest">Tema</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest text-center">Erros</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest text-center">Maior Sequência de Erros</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest text-center">Tempo</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest text-center">Pontuação</th>
                  <th className="p-4 text-[10px] font-black uppercase text-emerald-900/60 tracking-widest text-right">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-emerald-900/50 font-medium">Carregando...</td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-emerald-900/50 font-medium">Nenhum registro encontrado.</td>
                  </tr>
                ) : (
                  reports.map((report) => (
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
