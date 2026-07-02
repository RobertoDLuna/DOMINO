import React, { useState, useEffect } from 'react';
import TournamentService from '../services/TournamentService';
import { Podium } from '../../../shared/components/Podium';

export const TournamentRankingSection = () => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      setLoading(true);
      const data = await TournamentService.getRanking();
      setRanking(data);
    } catch (error) {
      console.error("Erro ao carregar ranking de campeonatos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-emerald-900/40 font-black uppercase tracking-widest">Carregando ranking...</div>;

  if (ranking.length === 0) return (
    <div className="py-12 text-center">
      <span className="text-4xl mb-4 block">🏆</span>
      <p className="text-emerald-900/60 font-black uppercase tracking-widest">O ranking oficial ainda não possui dados.</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Pódio dos 3 melhores */}
      <Podium top3={ranking.slice(0, 3)} />

      {/* Tabela do restante do ranking */}
      {ranking.length > 3 && (
        <div className="bg-white rounded-[2rem] border border-emerald-100 overflow-hidden shadow-sm mt-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/50">
                  <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100">Pos</th>
                  <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100">Competidor</th>
                  <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100 text-center">Pontos</th>
                  <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100 text-center hidden md:table-cell">Títulos 🥇</th>
                  <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100 text-center hidden md:table-cell">Pódios 🥈🥉</th>
                  <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100 text-center hidden sm:table-cell">Participações</th>
                </tr>
              </thead>
              <tbody>
                {ranking.slice(3).map((player, idx) => (
                  <tr key={player.id} className="border-b border-emerald-50 last:border-0 hover:bg-emerald-50/30 transition-colors">
                    <td className="p-4 text-sm font-black text-emerald-900/60 w-12">{idx + 4}º</td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-emerald-900 truncate max-w-[150px] sm:max-w-xs">{player.userName}</p>
                      <p className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest truncate max-w-[150px] sm:max-w-xs">
                        {player.schoolName || 'Sem Escola'}
                      </p>
                    </td>
                    <td className="p-4 text-sm font-black text-[#009660] text-center bg-emerald-50/50">{player.totalPoints}</td>
                    <td className="p-4 text-xs font-bold text-emerald-900/80 text-center hidden md:table-cell">{player.championships}</td>
                    <td className="p-4 text-xs font-bold text-emerald-900/80 text-center hidden md:table-cell">{player.podiums}</td>
                    <td className="p-4 text-xs font-medium text-emerald-900/60 text-center hidden sm:table-cell">{player.participated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
