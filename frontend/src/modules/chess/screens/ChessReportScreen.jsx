import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, History, Medal, Loader, Clock, User, PieChart } from 'lucide-react';
import ChessReportService from '../services/ChessReportService';

export default function ChessReportScreen({ onNavigate, user }) {
  const [activeTab, setActiveTab] = useState('GERAL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [playerStats, setPlayerStats] = useState(null);
  const [globalRanking, setGlobalRanking] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch both player stats and global ranking concurrently
      const [statsRes, rankingRes] = await Promise.all([
        ChessReportService.getPlayerStats(user.id),
        ChessReportService.getGlobalRanking()
      ]);
      
      setPlayerStats(statsRes);
      setGlobalRanking(rankingRes.students || []);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar estatísticas do xadrez.');
    } finally {
      setLoading(false);
    }
  };

  const getOutcomeColor = (outcome) => {
    if (outcome === 'WIN') return 'text-[#009660] bg-emerald-50 border-emerald-200';
    if (outcome === 'LOSS') return 'text-red-500 bg-red-50 border-red-200';
    return 'text-amber-500 bg-amber-50 border-amber-200';
  };

  const getOutcomeText = (outcome) => {
    if (outcome === 'WIN') return 'VITÓRIA';
    if (outcome === 'LOSS') return 'DERROTA';
    return 'EMPATE';
  };

  const renderProgressBar = (label, count, total, colorClass) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="font-black uppercase tracking-widest text-emerald-900">{label}</span>
          <span className="font-bold text-emerald-900/50">{count} ({pct}%)</span>
        </div>
        <div className="w-full bg-emerald-50 h-4 rounded-full overflow-hidden border border-emerald-100">
          <div className={`h-full ${colorClass} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] flex justify-center items-center">
        <div className="flex flex-col items-center gap-4 text-emerald-900">
          <Loader className="animate-spin" size={48} />
          <p className="font-black uppercase tracking-widest">Carregando Estatísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] p-8 flex flex-col items-center justify-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-[2rem] border-2 border-red-200 font-bold max-w-md text-center">
          {error}
        </div>
        <button onClick={() => onNavigate('LOBBY')} className="mt-6 px-6 py-3 bg-[#009660] text-white rounded-[1.5rem] font-black uppercase text-xs">
          Voltar ao Lobby
        </button>
      </div>
    );
  }

  const { stats, history } = playerStats;
  const totalGames = stats.wins + stats.losses + stats.draws;

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-[#1A1A1A] p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between bg-white p-4 rounded-[2rem] shadow-sm border-2 border-emerald-100 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-[#FFCE00] rounded-full opacity-10" />
          
          <button onClick={() => onNavigate('LOBBY')} className="relative z-10 text-emerald-900 hover:text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl flex items-center gap-2 transition-colors font-black uppercase text-xs">
            <ArrowLeft size={16} /> Voltar
          </button>
          
          <div className="flex items-center gap-3 relative z-10">
            <Trophy className="text-[#009660]" size={28} />
            <h1 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-emerald-900">
              Estatísticas do Xadrez
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto custom-scrollbar gap-2 mb-8 bg-white p-2 rounded-[2rem] border-2 border-emerald-100 shadow-sm">
          {[
            { id: 'GERAL', icon: Target, label: 'Visão Geral' },
            { id: 'HISTORICO', icon: History, label: 'Histórico' },
            { id: 'RANKING', icon: Medal, label: 'Ranking Global' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] md:text-xs transition-all flex justify-center items-center gap-2 whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-[#009660] text-white shadow-[0_4px_0_#00764D]' 
                  : 'bg-transparent text-emerald-900/50 hover:bg-emerald-50 hover:text-emerald-900'}`}
            >
              <tab.icon size={16} /> <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          
          {/* TAB: VISÃO GERAL */}
          {activeTab === 'GERAL' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="col-span-1 md:col-span-1 space-y-6">
                <div className="bg-[#009660] text-white rounded-[2rem] p-8 shadow-[0_10px_30px_rgba(0,150,96,0.2)] text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-white rounded-full opacity-10" />
                  <User size={48} className="mx-auto mb-4 opacity-80" />
                  <h2 className="text-2xl font-black tracking-tighter uppercase mb-2">{stats.userName}</h2>
                  <div className="bg-white/20 inline-block px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest">
                    {stats.points} Pontos
                  </div>
                </div>

                <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-emerald-900 uppercase tracking-widest text-sm">Resumo de Partidas</h3>
                    <div className="bg-emerald-50 text-[#009660] font-black px-3 py-1 rounded-xl text-lg">
                      {totalGames}
                    </div>
                  </div>
                  <p className="text-xs text-emerald-900/50 font-bold uppercase mb-6">Total de jogos disputados</p>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 bg-white border-2 border-emerald-100 rounded-[2rem] p-8 shadow-sm">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-emerald-900 mb-8 flex items-center gap-3">
                  <PieChart className="text-[#009660]" size={28} /> Distribuição de Resultados
                </h3>

                {totalGames === 0 ? (
                  <div className="text-center py-12 text-emerald-900/40 font-bold uppercase tracking-widest border-2 border-dashed border-emerald-100 rounded-3xl">
                    Nenhuma partida jogada ainda
                  </div>
                ) : (
                  <div className="space-y-6">
                    {renderProgressBar('Vitórias', stats.wins, totalGames, 'bg-[#009660]')}
                    {renderProgressBar('Empates', stats.draws, totalGames, 'bg-[#FFCE00]')}
                    {renderProgressBar('Derrotas', stats.losses, totalGames, 'bg-red-500')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: HISTÓRICO */}
          {activeTab === 'HISTORICO' && (
            <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-emerald-900 mb-8 flex items-center gap-3">
                <History className="text-[#009660]" size={28} /> Partidas Recentes
              </h2>

              {history.length === 0 ? (
                <div className="text-center py-12 text-emerald-900/40 font-bold uppercase tracking-widest border-2 border-dashed border-emerald-100 rounded-3xl">
                  Nenhum histórico encontrado
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((game) => (
                    <div key={game.id} className="flex flex-col sm:flex-row items-center justify-between p-4 md:p-6 bg-emerald-50 rounded-3xl border border-emerald-100 gap-4">
                      
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`px-4 py-2 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 ${getOutcomeColor(game.outcome)}`}>
                          {getOutcomeText(game.outcome)}
                        </div>
                        <div>
                          <p className="font-black text-emerald-900 uppercase text-sm md:text-base">
                            vs {game.opponentName}
                          </p>
                          <p className="text-[10px] font-bold text-emerald-900/50 uppercase tracking-widest">
                            Jogando de {game.color} • {new Date(game.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-center">
                          <p className="text-[10px] font-black uppercase text-emerald-900/50 tracking-widest">Lances</p>
                          <p className="font-black text-emerald-900 text-lg">{game.numMoves}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black uppercase text-emerald-900/50 tracking-widest">Duração</p>
                          <p className="font-black text-emerald-900 text-lg">{game.durationMins}m</p>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: RANKING GLOBAL */}
          {activeTab === 'RANKING' && (
            <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-emerald-900 mb-8 flex items-center gap-3">
                <Medal className="text-[#FFCE00]" size={28} /> Top Jogadores
              </h2>

              <div className="overflow-x-auto pb-4 custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="p-4 border-b-2 border-emerald-100"><span className="text-emerald-900/50 font-black uppercase text-[10px] tracking-widest">Pos</span></th>
                      <th className="p-4 border-b-2 border-emerald-100"><span className="text-emerald-900/50 font-black uppercase text-[10px] tracking-widest">Jogador</span></th>
                      <th className="p-4 border-b-2 border-emerald-100"><span className="text-emerald-900/50 font-black uppercase text-[10px] tracking-widest">V / E / D</span></th>
                      <th className="p-4 border-b-2 border-emerald-100 text-right"><span className="text-emerald-900/50 font-black uppercase text-[10px] tracking-widest">Pontos</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalRanking.map((player, index) => (
                      <tr key={player.id} className="border-b border-emerald-50 hover:bg-emerald-50 transition-colors group">
                        <td className="p-4">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm
                            ${index === 0 ? 'bg-[#FFCE00] text-amber-900 shadow-md' : 
                              index === 1 ? 'bg-gray-300 text-gray-800' : 
                              index === 2 ? 'bg-amber-600 text-white' : 'bg-emerald-100 text-emerald-900'}`}
                          >
                            {index + 1}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-black text-emerald-900 uppercase text-sm group-hover:text-[#009660] transition-colors">{player.name}</p>
                          <p className="text-[10px] font-bold text-emerald-900/50 uppercase tracking-widest">{player.school}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-xs font-black">
                            <span className="text-[#009660]">{player.stats.wins}</span> / 
                            <span className="text-[#FFCE00]">{player.stats.draws}</span> / 
                            <span className="text-red-500">{player.stats.losses}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-black text-[#009660] text-lg bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                            {player.points}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {globalRanking.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-emerald-900/50 font-bold uppercase tracking-widest">
                          Nenhum jogador pontuou ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
