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
      // Fetch public quizzes and my quizzes
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
      const quiz = await QuizService.getQuizByRoomCode(roomCode.toUpperCase());
      onNavigate('PLAY', { roomCode: roomCode.toUpperCase() });
    } catch (err) {
      setError(err.response?.data?.error || 'Código de sala inválido ou quiz não iniciado.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    onNavigate('EDITOR', { id: 'new' });
  };

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-[#1a1a3a] p-8 rounded-2xl shadow-2xl border border-[#2a2a5a] relative">
          <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="mt-4 md:mt-0 pl-0 md:pl-8">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#6c63ff] to-[#a855f7] mb-2">
              EduGames Quiz
            </h1>
            <p className="text-gray-400 text-lg">Aprenda, compita e divirta-se!</p>
          </div>
          
          {/* Join Room Form */}
          <form onSubmit={handleJoinQuiz} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Código da Sala"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-full sm:w-48 pl-10 pr-4 py-3 bg-[#0f0f23] border border-[#2a2a5a] rounded-xl text-xl font-bold text-center tracking-widest text-white focus:outline-none focus:border-[#6c63ff] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || roomCode.length < 5}
              className="px-6 py-3 bg-gradient-to-r from-[#6c63ff] to-[#a855f7] rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play size={20} /> Entrar
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-[#ff4757] text-white p-4 rounded-xl flex items-center gap-3">
            <span>{error}</span>
          </div>
        )}

        {/* Teacher Panel */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="text-[#6c63ff]" /> 
              Biblioteca de Quizzes
            </h2>
            {isTeacher && (
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-[#1a1a3a] border border-[#6c63ff] text-[#6c63ff] rounded-lg font-bold hover:bg-[#6c63ff] hover:text-white transition-colors flex items-center gap-2"
              >
                <Plus size={20} /> Criar Quiz
              </button>
            )}
          </div>

          {loading && <div className="text-center py-10">Carregando quizzes...</div>}
          
          {!loading && quizzes.length === 0 && (
            <div className="text-center py-10 bg-[#1a1a3a] rounded-2xl border border-[#2a2a5a]">
              <p className="text-gray-400 mb-4">Nenhum quiz encontrado.</p>
              {isTeacher && (
                <button onClick={handleCreateNew} className="text-[#6c63ff] hover:underline font-bold">
                  Crie o seu primeiro quiz
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-[#1a1a3a] border border-[#2a2a5a] rounded-2xl p-6 flex flex-col hover:border-[#6c63ff] transition-colors group relative overflow-hidden">
                
                {/* Decorative accent */}
                <div className={`absolute top-0 left-0 w-full h-2 ${quiz.type === 'PEDAGOGICO' ? 'bg-[#51cf66]' : 'bg-[#ffd43b]'}`}></div>

                <div className="mb-4 mt-2 flex justify-between items-start">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${quiz.type === 'PEDAGOGICO' ? 'bg-[#51cf66]/20 text-[#51cf66]' : 'bg-[#ffd43b]/20 text-[#ffd43b]'}`}>
                    {quiz.type}
                  </span>
                  <span className="text-xs text-gray-500">{quiz._count?.questions || 0} questões</span>
                </div>

                <h3 className="text-xl font-bold mb-2 text-white group-hover:text-[#6c63ff] transition-colors line-clamp-2">
                  {quiz.title}
                </h3>
                
                <p className="text-sm text-gray-400 mb-6 flex-grow line-clamp-2">
                  {quiz.description || "Sem descrição"}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                  <span>{quiz.discipline || 'Geral'} • {quiz.yearGrade || '-'}</span>
                </div>

                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => onNavigate(quiz.createdById === user?.id ? 'EDITOR' : 'SOLO', { id: quiz.id })}
                    className="flex-1 py-2 bg-[#2a2a5a] hover:bg-[#3a3a6a] rounded-lg text-center font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {quiz.createdById === user?.id ? 'Editar / Hospedar' : <><Play size={16} /> Jogar Agora</>}
                  </button>
                  {isTeacher && (
                    <button 
                      onClick={() => onNavigate('REPORT', { id: quiz.id })}
                      title="Relatórios"
                      className="p-2 bg-[#2a2a5a] hover:bg-[#3a3a6a] rounded-lg transition-colors flex items-center justify-center text-[#51cf66]"
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
