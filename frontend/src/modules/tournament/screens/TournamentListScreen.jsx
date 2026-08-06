import React, { useState, useEffect } from 'react';
import TournamentService from '../services/TournamentService';
import TournamentCreateModal from '../components/TournamentCreateModal';
import TournamentEditModal from '../components/TournamentEditModal';

export const TournamentListScreen = ({ user, onBack, onSelectTournament }) => {
  const [tournaments, setTournaments] = useState([]);
  const [filter, setFilter] = useState('OPEN'); // OPEN, IN_PROGRESS, FINISHED
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tournamentToEdit, setTournamentToEdit] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [filter]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const queryStatus = filter === 'FINISHED' ? 'FINISHED,CANCELLED' : filter;
      const data = await TournamentService.getTournaments({ status: queryStatus });
      setTournaments(data);
    } catch (error) {
      console.error("Erro ao carregar campeonatos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este campeonato? Esta ação não pode ser desfeita.')) return;
    try {
      setLoading(true);
      await TournamentService.deleteTournament(id);
      await loadTournaments();
    } catch (error) {
      alert(error.response?.data?.error || error.message || 'Erro ao excluir campeonato');
      setLoading(false);
    }
  };

  const gameIcons = {
    CHESS: '♟️',
    DOMINO: '🀄',
    QUIZ: '💡',
    PEAO: '🛡️',
    VELHA: '❌'
  };

  const getStatusBadge = (status) => {
    if (status === 'OPEN') return <span className="bg-[#009660] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap text-center">Inscrições Abertas</span>;
    if (status === 'IN_PROGRESS') return <span className="bg-[#FFCE00] text-emerald-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap text-center">Em Andamento</span>;
    if (status === 'FINISHED') return <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap text-center">Encerrado</span>;
    if (status === 'CANCELLED') return <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap text-center">Cancelado</span>;
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] p-4 lg:p-8">
      {/* Cabeçalho */}
      <div className="max-w-5xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-900 hover:bg-emerald-50 transition-colors shadow-sm border border-emerald-100"
          >
            ←
          </button>
          <div>
            <h1 className="text-3xl font-black text-emerald-900 uppercase italic tracking-tighter">Campeonatos</h1>
            <p className="text-sm font-black text-emerald-900/60 uppercase tracking-widest">Competições Oficiais</p>
          </div>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'PROFESSOR') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#009660] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-[#00764D] transition-colors shadow-lg active:scale-95 flex items-center gap-2"
          >
            <span>+</span> Criar Campeonato
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="max-w-5xl mx-auto mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['OPEN', 'IN_PROGRESS', 'FINISHED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shrink-0 transition-colors ${
              filter === f 
                ? 'bg-[#009660] text-white shadow-md' 
                : 'bg-white text-emerald-900/60 hover:bg-emerald-50 border border-emerald-100'
            }`}
          >
            {f === 'OPEN' ? 'Inscrições Abertas' : f === 'IN_PROGRESS' ? 'Em Andamento' : 'Encerrados'}
          </button>
        ))}
      </div>

      {/* Grade de Campeonatos */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20 text-emerald-900/40 font-black uppercase tracking-widest">
            Carregando campeonatos...
          </div>
        ) : tournaments.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-[2rem] border border-emerald-100">
            <span className="text-4xl mb-4 block">🏆</span>
            <p className="text-emerald-900/60 font-black uppercase tracking-widest">Nenhum campeonato encontrado</p>
          </div>
        ) : (
          tournaments.map(t => (
            <div key={t.id} className="bg-white rounded-[2rem] p-6 border border-emerald-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl">
                  {gameIcons[t.gameType] || '🎮'}
                </div>
                <div className="flex gap-2 items-center relative">
                  {getStatusBadge(t.status)}
                  {(user?.role === 'ADMIN' || (user?.role === 'PROFESSOR' && t.createdById === user?.id)) && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === t.id ? null : t.id);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-emerald-900/40 hover:text-emerald-900 hover:bg-emerald-50 rounded-xl transition-colors font-bold text-lg"
                      >
                        ⋮
                      </button>
                      
                      {activeMenuId === t.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-2xl shadow-xl border border-emerald-50 overflow-hidden z-20">
                          {t.status === 'OPEN' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                setTournamentToEdit(t);
                              }}
                              className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-900 hover:bg-emerald-50 transition-colors"
                            >
                              Editar
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              handleDelete(t.id);
                            }}
                            className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="text-xl font-black text-emerald-900 uppercase italic tracking-tighter mb-2 line-clamp-2">
                {t.name}
              </h3>
              
              <p className="text-xs font-bold text-emerald-900/60 uppercase tracking-widest mb-6">
                Organização: {t.createdBy?.fullName || 'Desconhecido'}
              </p>

              <div className="mt-auto">
                <div className="flex justify-between text-[10px] font-black text-emerald-900/60 uppercase tracking-widest mb-2">
                  <span>Participantes</span>
                  <span>{t._count.participants} / {t.maxPlayers}</span>
                </div>
                <div className="w-full bg-emerald-50 h-2 rounded-full mb-6 overflow-hidden">
                  <div 
                    className="h-full bg-[#009660] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (t._count.participants / t.maxPlayers) * 100)}%` }}
                  />
                </div>

                <button 
                  onClick={() => onSelectTournament(t.id)}
                  className={`w-full py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors active:scale-95 ${
                    t.status === 'OPEN' 
                      ? 'bg-[#FFCE00] text-emerald-900 hover:bg-[#e6ba00]' 
                      : t.status === 'CANCELLED' 
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-emerald-50 text-[#009660] hover:bg-emerald-100'
                  }`}
                >
                  {t.status === 'OPEN' ? 'Inscrever-se' : 'Ver Detalhes'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <TournamentCreateModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTournaments();
          }}
        />
      )}

      {tournamentToEdit && (
        <TournamentEditModal
          tournament={tournamentToEdit}
          onClose={() => setTournamentToEdit(null)}
          onSuccess={() => {
            setTournamentToEdit(null);
            loadTournaments();
          }}
        />
      )}
    </div>
  );
};
