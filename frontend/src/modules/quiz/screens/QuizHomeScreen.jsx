import React, { useState, useEffect } from 'react';
import { Play, Plus, BarChart2, Hash, BookOpen, ArrowLeft } from 'lucide-react';
import QuizService from '../services/QuizService';

export default function QuizHomeScreen({ user, onNavigate, onBack }) {
  const [quizzes, setQuizzes] = useState([]);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isTeacher = user?.role === 'PROFESSOR' || user?.role === 'ADMIN';

  useEffect(() => {
    loadQuizzes();
  }, [user]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await QuizService.listQuizzes();
      setQuizzes(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar quizzes.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQuiz = async (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    
    try {
      setLoading(true);
      await QuizService.getQuizByRoomCode(roomCode.toUpperCase());
      onNavigate('PLAY', { roomCode: roomCode.toUpperCase(), isHostRoom: false });
    } catch (err) {
      setError(err.message || 'Código de sala inválido ou quiz não iniciado.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    onNavigate('EDITOR', { id: 'new' });
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-[#1A1A1A] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,150,96,0.15)] border-2 border-emerald-100 relative animate-in fade-in zoom-in duration-500">
          <button onClick={onBack} className="absolute top-4 left-4 w-12 h-12 flex items-center justify-center bg-emerald-50 text-emerald-900 rounded-2xl hover:bg-emerald-100 transition-colors border-2 border-emerald-100" title="Voltar">
            <ArrowLeft size={24} />
          </button>
          
          <div className="mt-8 md:mt-0 md:pl-16 flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black text-[#009660] italic tracking-tighter uppercase mb-2">
              EduGames Quiz
            </h1>
            <p className="text-[10px] sm:text-xs font-black uppercase text-emerald-900/70 tracking-[0.2em]">Aprenda, compita e divirta-se!</p>
          </div>
          
          {/* Formulário de entrada na sala */}
          <form onSubmit={handleJoinQuiz} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-400" size={20} />
              <input
                type="text"
                placeholder="CÓDIGO DA SALA"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-full sm:w-56 pl-12 pr-4 py-4 bg-white border-2 border-emerald-100 rounded-[2rem] text-xl font-black text-center tracking-widest text-emerald-900 focus:outline-none focus:border-emerald-400 placeholder:text-emerald-200 shadow-sm transition-all uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading || roomCode.length < 5}
              className="px-8 py-4 bg-[#FFCE00] text-[#009660] rounded-[2rem] font-black uppercase tracking-widest shadow-[0_6px_0_#d1a900] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_#d1a900] flex items-center justify-center gap-2"
            >
              <Play size={20} className="fill-current" /> ENTRAR
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 font-bold">
            <span>{error}</span>
          </div>
        )}

        {/* Painel do professor */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase text-emerald-900 flex items-center gap-2">
              <BookOpen className="text-[#009660]" /> 
              Biblioteca de Quizzes
            </h2>
            {isTeacher && (
              <button
                onClick={handleCreateNew}
                className="px-6 py-4 bg-[#009660] text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-[0_6px_0_#00764D] hover:brightness-110 transition-all active:translate-y-1 active:shadow-none flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> CRIAR NOVO QUIZ
              </button>
            )}
          </div>

          {loading && <div className="text-center py-10 font-bold text-emerald-900/60 uppercase tracking-widest">Carregando quizzes...</div>}
          
          {!loading && quizzes.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-emerald-100 shadow-sm">
              <div className="text-6xl mb-6 grayscale opacity-50">🏜️</div>
              <p className="text-emerald-900/70 font-black uppercase tracking-widest mb-4">Nenhum quiz encontrado.</p>
              {isTeacher && (
                <button onClick={handleCreateNew} className="text-[#009660] hover:underline font-black uppercase text-sm">
                  Crie o seu primeiro quiz
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="group relative flex flex-col bg-white rounded-[2rem] border-2 border-emerald-100 p-6 text-left transition-all hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(0,150,96,0.15)] hover:border-emerald-300 active:scale-95 animate-in fade-in zoom-in duration-500 overflow-hidden">
                
                {/* Efeito visual de fundo */}
                <div
                  className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${quiz.type === 'PEDAGOGICO' ? 'bg-[#009660]' : 'bg-[#FFCE00]'}`}
                />

                <div className="mb-4 relative z-10 flex justify-between items-start">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${quiz.type === 'PEDAGOGICO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {quiz.type}
                  </span>
                  <span className="text-[10px] font-black text-emerald-900/50 uppercase tracking-widest">
                    {quiz._count?.questions || 0} questões
                  </span>
                </div>

                <h3 className="text-emerald-900 font-black text-xl leading-tight uppercase mb-2 truncate relative z-10">
                  {quiz.title}
                </h3>
                
                <p className="text-emerald-900/60 text-xs font-medium mb-6 line-clamp-2 h-8 relative z-10">
                  {quiz.description || "Sem descrição"}
                </p>

                <div className="flex items-center justify-between text-[10px] font-black text-emerald-900/70 uppercase tracking-widest mb-6 border-t border-emerald-50 pt-4 relative z-10">
                  <span>{quiz.discipline || 'Geral'}</span>
                  <span>{quiz.yearGrade || '-'}</span>
                </div>

                <div className="flex gap-2 mt-auto relative z-10">
                  <button 
                    onClick={() => onNavigate(quiz.createdById === user?.id ? 'EDITOR' : 'SOLO', { id: quiz.id })}
                    className="flex-1 py-3 bg-[#FFCE00] text-[#009660] rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-[0_4px_0_#d1a900] hover:brightness-105 transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
                  >
                    {quiz.createdById === user?.id ? 'EDITAR / HOSPEDAR' : <><Play size={14} className="fill-current" /> JOGAR AGORA</>}
                  </button>
                  {isTeacher && (
                    <button 
                      onClick={() => onNavigate('REPORT', { id: quiz.id })}
                      title="Relatórios"
                      className="w-12 flex-shrink-0 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-[1.5rem] transition-colors"
                    >
                      <BarChart2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
