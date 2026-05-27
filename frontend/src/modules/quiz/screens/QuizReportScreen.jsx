import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Trophy, Target, PieChart } from 'lucide-react';
import QuizService from '../services/QuizService';

export default function QuizReportScreen({ onNavigate, quizId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReport();
  }, [quizId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await QuizService.getQuizReport(quizId);
      setReport(data);
    } catch (err) {
      setError('Erro ao carregar relatório do quiz.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f0f23] text-white p-8">Carregando relatório...</div>;
  if (error) return <div className="min-h-screen bg-[#0f0f23] text-white p-8">{error}</div>;
  if (!report) return null;

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <button onClick={() => onNavigate('HOME')} className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors mb-4">
              <ArrowLeft size={20} /> Voltar para Biblioteca
            </button>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#6c63ff] to-[#a855f7]">
              Relatório: {report.quiz.title}
            </h1>
            <p className="text-gray-400 mt-1 flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${report.quiz.type === 'PEDAGOGICO' ? 'bg-[#51cf66]/20 text-[#51cf66]' : 'bg-[#ffd43b]/20 text-[#ffd43b]'}`}>
                {report.quiz.type}
              </span>
              ID: {report.quiz.id.substring(0, 8)}
            </p>
          </div>
          <div className="bg-[#1a1a3a] px-6 py-4 rounded-xl border border-[#2a2a5a] flex items-center gap-4">
            <Users className="text-[#6c63ff]" size={32} />
            <div>
              <p className="text-sm text-gray-400">Total de Participantes</p>
              <p className="text-2xl font-black">{report.totalParticipants}</p>
            </div>
          </div>
        </div>

        {report.totalParticipants === 0 ? (
          <div className="bg-[#1a1a3a] border border-[#2a2a5a] rounded-2xl p-12 text-center text-gray-400">
            <PieChart className="mx-auto mb-4 text-[#6c63ff] opacity-50" size={48} />
            <p className="text-xl">Nenhum participante jogou este quiz ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Ranking */}
            <div className="lg:col-span-2 space-y-8">
              
              <div className="bg-[#1a1a3a] border border-[#2a2a5a] rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Trophy className="text-[#ffd43b]" /> Ranking Final
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-400 border-b border-[#2a2a5a]">
                        <th className="pb-3 pl-2">#</th>
                        <th className="pb-3">Nome</th>
                        <th className="pb-3">Acertos</th>
                        <th className="pb-3">Pontos</th>
                        {report.quiz.type === 'PEDAGOGICO' && <th className="pb-3">Nível Estimado</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {report.ranking.map((r, i) => (
                        <tr key={i} className="border-b border-[#2a2a5a]/50 hover:bg-[#2a2a5a]/30 transition-colors">
                          <td className={`py-4 pl-2 font-bold ${i === 0 ? 'text-[#ffd43b]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                            {i + 1}
                          </td>
                          <td className="py-4 font-semibold">{r.userName}</td>
                          <td className="py-4">
                            <span className="text-[#51cf66]">{r.correctAnswers}</span> / {r.totalQuestions} 
                            <span className="text-xs text-gray-500 ml-2">({r.accuracy}%)</span>
                          </td>
                          <td className="py-4 font-mono font-bold text-[#6c63ff]">{r.points}</td>
                          {report.quiz.type === 'PEDAGOGICO' && (
                            <td className="py-4">
                              <span className={`text-xs font-bold px-2 py-1 rounded-lg
                                ${r.studentLevel === 'INICIANTE' ? 'bg-[#ff4757]/20 text-[#ff4757]' : 
                                  r.studentLevel === 'EM_CONSTRUCAO' ? 'bg-[#ffd43b]/20 text-[#ffd43b]' : 
                                  r.studentLevel === 'PROFICIENTE' ? 'bg-[#51cf66]/20 text-[#51cf66]' : 
                                  'bg-[#6c63ff]/20 text-[#6c63ff]'}`}>
                                {r.studentLevel ? r.studentLevel.replace('_', ' ') : '-'}
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Questions Stats */}
              <div className="bg-[#1a1a3a] border border-[#2a2a5a] rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Target className="text-[#ff6b6b]" /> Análise por Questão (Mais difíceis primeiro)
                </h2>
                <div className="space-y-6">
                  {report.questionStats.map((q, idx) => (
                    <div key={q.questionId} className="border-l-4 border-[#6c63ff] pl-4 py-2">
                      <p className="font-bold mb-1">{q.questionText}</p>
                      {q.bnccCode && <p className="text-xs text-[#51cf66] mb-3">Habilidade: {q.bnccCode}</p>}
                      
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-full bg-[#2a2a5a] h-4 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${q.accuracy > 70 ? 'bg-[#51cf66]' : q.accuracy > 40 ? 'bg-[#ffd43b]' : 'bg-[#ff4757]'}`} 
                            style={{ width: `${q.accuracy}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-sm">{q.accuracy}% Acerto</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {q.distractors.map((d, dIdx) => (
                          <div key={dIdx} className={`flex justify-between p-2 rounded ${d.isCorrect ? 'bg-[#51cf66]/10 text-[#51cf66]' : 'bg-[#2a2a5a]/50 text-gray-400'}`}>
                            <span className="truncate mr-2">{d.answerText}</span>
                            <span className="font-mono">{d.percentage}% ({d.timesChosen})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: Diagnostics */}
            {report.quiz.type === 'PEDAGOGICO' && (
              <div className="space-y-8">
                
                {/* Level Distribution */}
                <div className="bg-[#1a1a3a] border border-[#2a2a5a] rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-6">Diagnóstico Geral da Turma</h3>
                  
                  <div className="space-y-4">
                    {[
                      { label: 'AVANÇADO', key: 'AVANCADO', color: 'bg-[#6c63ff]' },
                      { label: 'PROFICIENTE', key: 'PROFICIENTE', color: 'bg-[#51cf66]' },
                      { label: 'EM CONSTRUÇÃO', key: 'EM_CONSTRUCAO', color: 'bg-[#ffd43b]' },
                      { label: 'INICIANTE', key: 'INICIANTE', color: 'bg-[#ff4757]' },
                    ].map(level => {
                      const count = report.levelDistribution[level.key] || 0;
                      const pct = report.totalParticipants > 0 ? Math.round((count / report.totalParticipants) * 100) : 0;
                      
                      return (
                        <div key={level.key}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-bold text-gray-300">{level.label}</span>
                            <span className="text-gray-500">{count} alunos ({pct}%)</span>
                          </div>
                          <div className="w-full bg-[#2a2a5a] h-2 rounded-full overflow-hidden">
                            <div className={`h-full ${level.color}`} style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BNCC Need help */}
                {report.bnccStats.length > 0 && (
                  <div className="bg-[#1a1a3a] border border-[#2a2a5a] rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4">Habilidades BNCC (Críticas)</h3>
                    <p className="text-sm text-gray-400 mb-6">Habilidades com menor taxa média de acerto e que precisam de intervenção.</p>
                    
                    <div className="space-y-4">
                      {report.bnccStats.slice(0, 5).map((b, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-[#2a2a5a]/50 rounded-lg">
                          <span className="font-bold text-[#51cf66]">{b.code}</span>
                          <span className={`font-mono text-sm ${b.averageAccuracy < 50 ? 'text-[#ff4757]' : 'text-white'}`}>
                            {b.averageAccuracy}% acerto
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
