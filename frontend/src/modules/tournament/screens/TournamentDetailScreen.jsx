import React, { useState, useEffect } from 'react';
import TournamentService from '../services/TournamentService';
import TournamentBracket from '../components/TournamentBracket';
import TournamentRoundRobin from '../components/TournamentRoundRobin';

export const TournamentDetailScreen = ({ tournamentId, user, onBack }) => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('INFO'); // INFO, PARTICIPANTS, MATCHES
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTournament();
  }, [tournamentId]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const data = await TournamentService.getTournamentById(tournamentId);
      setTournament(data);
      // Auto-select Matches tab if in progress
      if (data.status === 'IN_PROGRESS' || data.status === 'FINISHED') {
        setActiveTab('MATCHES');
      }
    } catch (err) {
      setError("Erro ao carregar os detalhes do campeonato.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      setIsSubmitting(true);
      await TournamentService.joinTournament(tournamentId);
      await loadTournament();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao se inscrever.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeave = async () => {
    try {
      setIsSubmitting(true);
      await TournamentService.leaveTournament(tournamentId);
      await loadTournament();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao cancelar inscrição.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async () => {
    if (!window.confirm("Deseja iniciar o campeonato agora? O sorteio das partidas será feito automaticamente.")) return;
    try {
      setIsSubmitting(true);
      await TournamentService.startTournament(tournamentId);
      await loadTournament();
      setActiveTab('MATCHES');
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao iniciar campeonato.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F0FDF4] p-8 flex justify-center items-center font-black text-emerald-900/40 uppercase tracking-widest">Carregando detalhes...</div>;
  if (error || !tournament) return <div className="min-h-screen bg-[#F0FDF4] p-8 flex flex-col justify-center items-center font-black text-red-500 uppercase tracking-widest gap-4"><p>{error}</p><button onClick={onBack} className="bg-white px-6 py-2 rounded-xl text-emerald-900 border border-emerald-100">Voltar</button></div>;

  const isCreator = user?.role === 'ADMIN' || (user?.role === 'PROFESSOR' && tournament.createdById === user.id);
  const isParticipant = tournament.participants.some(p => p.userId === user?.id);
  const isFull = tournament.participants.length >= tournament.maxPlayers;

  return (
    <div className="min-h-screen bg-[#F0FDF4] p-4 lg:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8 bg-[#009660] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#FFCE00] rounded-full blur-3xl opacity-20" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="flex items-start gap-6">
            <button 
              onClick={onBack}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors backdrop-blur-sm shrink-0"
            >
              ←
            </button>
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="bg-[#FFCE00] text-emerald-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {tournament.gameType}
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {tournament.format === 'ELIMINATION' ? 'Eliminatórias' : 'Todos contra Todos'}
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  tournament.status === 'OPEN' ? 'bg-white text-[#009660]' : 
                  tournament.status === 'IN_PROGRESS' ? 'bg-[#FFCE00] text-emerald-900' : 
                  'bg-white/20 text-white'
                }`}>
                  {tournament.status === 'OPEN' ? 'Inscrições Abertas' : 
                   tournament.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Encerrado'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-2">
                {tournament.name}
              </h1>
              <p className="text-white/80 font-medium text-sm md:text-base max-w-2xl">
                {tournament.description || 'Nenhuma descrição fornecida.'}
              </p>
            </div>
          </div>

          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm min-w-[200px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Participantes</p>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-black leading-none">{tournament.participants.length}</span>
              <span className="text-sm font-bold text-white/60 mb-1">/ {tournament.maxPlayers}</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FFCE00] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (tournament.participants.length / tournament.maxPlayers) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center relative z-10">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/80 flex gap-6">
            <span>📅 Início: {new Date(tournament.startsAt).toLocaleDateString()}</span>
            <span>🏁 Fim: {new Date(tournament.endsAt).toLocaleDateString()}</span>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            {tournament.status === 'OPEN' && user && (
              isParticipant ? (
                <button 
                  onClick={handleLeave}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none bg-red-500/20 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-500/40 transition-colors disabled:opacity-50"
                >
                  Cancelar Inscrição
                </button>
              ) : (
                <button 
                  onClick={handleJoin}
                  disabled={isSubmitting || isFull}
                  className="flex-1 sm:flex-none bg-[#FFCE00] text-emerald-900 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#e6ba00] transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isFull ? 'Lotado' : 'Inscrever-se Agora'}
                </button>
              )
            )}
            
            {!user && tournament.status === 'OPEN' && (
              <button 
                onClick={() => alert("Você precisa fazer login para se inscrever.")}
                className="flex-1 sm:flex-none bg-[#FFCE00] text-emerald-900 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#e6ba00] transition-colors shadow-lg active:scale-95"
              >
                Login para Inscrever-se
              </button>
            )}

            {isCreator && tournament.status === 'OPEN' && tournament.participants.length >= 4 && (
              <button 
                onClick={handleStart}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none bg-white text-[#009660] px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-50 transition-colors shadow-lg active:scale-95 disabled:opacity-50"
              >
                Iniciar Campeonato
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-5xl mx-auto mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveTab('INFO')}
          className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shrink-0 transition-colors ${activeTab === 'INFO' ? 'bg-[#009660] text-white shadow-md' : 'bg-white text-emerald-900/60 hover:bg-emerald-50 border border-emerald-100'}`}
        >
          Informações
        </button>
        <button
          onClick={() => setActiveTab('PARTICIPANTS')}
          className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shrink-0 transition-colors ${activeTab === 'PARTICIPANTS' ? 'bg-[#009660] text-white shadow-md' : 'bg-white text-emerald-900/60 hover:bg-emerald-50 border border-emerald-100'}`}
        >
          Participantes ({tournament.participants.length})
        </button>
        {(tournament.status === 'IN_PROGRESS' || tournament.status === 'FINISHED') && (
          <button
            onClick={() => setActiveTab('MATCHES')}
            className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shrink-0 transition-colors ${activeTab === 'MATCHES' ? 'bg-[#009660] text-white shadow-md' : 'bg-white text-emerald-900/60 hover:bg-emerald-50 border border-emerald-100'}`}
          >
            {tournament.format === 'ELIMINATION' ? 'Chaveamento' : 'Tabela de Partidas'}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto">
        
        {activeTab === 'INFO' && (
          <div className="bg-white rounded-[2rem] p-8 border border-emerald-100 shadow-sm">
            <h3 className="text-xl font-black text-emerald-900 uppercase italic tracking-tighter mb-6">Regras e Detalhes</h3>
            <div className="prose prose-emerald max-w-none text-emerald-900/80">
              <p>{tournament.description || 'Sem detalhes adicionais fornecidos pelo organizador.'}</p>
            </div>
            <div className="mt-8 pt-8 border-t border-emerald-50 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest mb-1">Organizador</p>
                <p className="font-bold text-emerald-900">{tournament.createdBy?.fullName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest mb-1">Escola</p>
                <p className="font-bold text-emerald-900">{tournament.createdBy?.school?.name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest mb-1">Criado em</p>
                <p className="font-bold text-emerald-900">{new Date(tournament.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest mb-1">ID do Torneio</p>
                <p className="font-bold text-emerald-900 font-mono text-xs">{tournament.id.split('-')[0]}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PARTICIPANTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournament.participants.length === 0 ? (
              <div className="col-span-full py-12 text-center text-emerald-900/40 font-black uppercase tracking-widest">
                Nenhum participante inscrito ainda.
              </div>
            ) : (
              tournament.participants.map((p, idx) => (
                <div key={p.userId} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-900 font-black text-sm">
                    {idx + 1}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-emerald-900 truncate">{p.userName}</p>
                    <p className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest truncate">{p.schoolName || 'Sem Escola'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'MATCHES' && (
          <div className="bg-white rounded-[2rem] p-6 border border-emerald-100 shadow-sm">
            {tournament.format === 'ELIMINATION' ? (
              <TournamentBracket matches={tournament.matches} tournament={tournament} user={user} />
            ) : (
              <TournamentRoundRobin matches={tournament.matches} participants={tournament.participants} tournament={tournament} user={user} />
            )}
          </div>
        )}

      </div>
    </div>
  );
};
