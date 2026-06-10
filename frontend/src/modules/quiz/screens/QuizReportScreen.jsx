import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Trophy, Target, PieChart, Check, X, Minus, Grid } from 'lucide-react';
import QuizService from '../services/QuizService';

export default function QuizReportScreen({ onNavigate, quizId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('GERAL');

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

  if (loading) return <div className="min-h-screen bg-[#F0FDF4] text-emerald-900 font-black uppercase tracking-widest p-8 flex items-center justify-center">Carregando relatório...</div>;
  if (error) return <div className="min-h-screen bg-[#F0FDF4] text-red-500 font-black uppercase tracking-widest p-8 flex items-center justify-center">{error}</div>;
  if (!report) return null;

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-emerald-900 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2rem] border-2 border-emerald-100 shadow-sm">
          <div>
            <button onClick={() => onNavigate('HOME')} className="text-emerald-900/50 hover:text-emerald-900 flex items-center gap-2 transition-colors mb-4 font-black uppercase text-xs tracking-widest">
              <ArrowLeft size={16} /> Voltar para Biblioteca
            </button>
            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-[#009660]">
              Relatório: {report.quiz.title}
            </h1>
            <p className="text-emerald-900/50 mt-2 flex items-center gap-2 font-bold text-sm uppercase tracking-widest">
              <span className={`text-xs font-black px-3 py-1 rounded-xl ${report.quiz.type === 'PEDAGOGICO' ? 'bg-emerald-100 text-[#009660]' : 'bg-amber-100 text-amber-700'}`}>
                {report.quiz.type}
              </span>
              ID: {report.quiz.id.substring(0, 8)}
            </p>
          </div>
          <div className="bg-emerald-50 px-8 py-6 rounded-[2rem] border-2 border-emerald-100 flex items-center gap-6 shadow-inner">
            <Users className="text-[#009660]" size={40} />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-900/50">Total de Participantes</p>
              <p className="text-4xl font-black text-[#009660] leading-none mt-1">{report.totalParticipants}</p>
            </div>
          </div>
        </div>

        {report.totalParticipants === 0 ? (
          <div className="bg-white border-2 border-emerald-100 rounded-[3rem] p-16 text-center text-emerald-900/50 shadow-sm">
            <PieChart className="mx-auto mb-6 text-emerald-200" size={64} />
            <p className="text-xl font-black uppercase tracking-widest">Nenhum participante jogou este quiz ainda.</p>
          </div>
        ) : (
          <>
            {/* Tabs Navigation */}
            <div className="flex border-b-2 border-emerald-100 mb-8 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('GERAL')}
                className={`py-4 px-8 font-black uppercase text-sm tracking-widest flex items-center gap-3 border-b-4 transition-colors whitespace-nowrap ${
                  activeTab === 'GERAL' 
                    ? 'border-[#009660] text-[#009660] bg-emerald-50 rounded-t-2xl' 
                    : 'border-transparent text-emerald-900/50 hover:text-emerald-900 hover:bg-white rounded-t-2xl'
                }`}
              >
                <PieChart size={20} /> Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('MAPA')}
                className={`py-4 px-8 font-black uppercase text-sm tracking-widest flex items-center gap-3 border-b-4 transition-colors whitespace-nowrap ${
                  activeTab === 'MAPA' 
                    ? 'border-[#009660] text-[#009660] bg-emerald-50 rounded-t-2xl' 
                    : 'border-transparent text-emerald-900/50 hover:text-emerald-900 hover:bg-white rounded-t-2xl'
                }`}
              >
                <Grid size={20} /> Mapa de Habilidades
              </button>
            </div>

            {/* TAB: VISÃO GERAL */}
            {activeTab === 'GERAL' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Ranking */}
                <div className="lg:col-span-2 space-y-8">
              
              <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3 text-emerald-900">
                  <Trophy className="text-[#FFCE00]" size={32} /> Ranking Final
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-emerald-900/50 border-b-2 border-emerald-100 uppercase text-[10px] font-black tracking-widest">
                        <th className="pb-4 pl-4">#</th>
                        <th className="pb-4">Nome</th>
                        <th className="pb-4">Acertos</th>
                        <th className="pb-4">Pontos</th>
                        {report.quiz.type === 'PEDAGOGICO' && <th className="pb-4">Nível Estimado</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {report.ranking.map((r, i) => (
                        <tr key={i} className="border-b border-emerald-50 hover:bg-emerald-50/50 transition-colors group">
                          <td className={`py-5 pl-4 font-black text-xl ${i === 0 ? 'text-[#FFCE00]' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-emerald-900/30'}`}>
                            {i + 1}
                          </td>
                          <td className="py-5 font-black uppercase text-emerald-900 group-hover:text-[#009660] transition-colors">{r.userName}</td>
                          <td className="py-5 font-bold text-emerald-900/70">
                            <span className="text-[#009660] font-black">{r.correctAnswers}</span> / {r.totalQuestions} 
                            <span className="text-xs text-emerald-900/40 ml-2 font-black">({r.accuracy}%)</span>
                          </td>
                          <td className="py-5 font-black text-[#009660]">{r.points}</td>
                          {report.quiz.type === 'PEDAGOGICO' && (
                            <td className="py-5">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl
                                ${r.studentLevel === 'INICIANTE' ? 'bg-red-50 border-2 border-red-100 text-red-500' : 
                                  r.studentLevel === 'EM_CONSTRUCAO' ? 'bg-amber-50 border-2 border-amber-100 text-amber-600' : 
                                  r.studentLevel === 'PROFICIENTE' ? 'bg-emerald-50 border-2 border-emerald-100 text-[#009660]' : 
                                  'bg-blue-50 border-2 border-blue-100 text-blue-600'}`}>
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
              <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3 text-emerald-900">
                  <Target className="text-red-500" size={32} /> Análise por Questão <span className="text-[10px] font-black not-italic text-emerald-900/40 tracking-widest ml-2 bg-emerald-50 px-3 py-1 rounded-xl">(Mais difíceis primeiro)</span>
                </h2>
                <div className="space-y-8">
                  {report.questionStats.map((q, idx) => (
                    <div key={q.questionId} className="border-l-4 border-[#009660] pl-6 py-2">
                      <p className="font-black text-emerald-900 uppercase tracking-wide mb-2 text-lg leading-tight">{q.questionText}</p>
                      {q.bnccCode && <p className="text-[10px] font-black uppercase tracking-widest text-[#009660] mb-4 bg-emerald-50 inline-block px-3 py-1 rounded-xl">Habilidade: {q.bnccCode}</p>}
                      
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-full bg-emerald-50 h-3 rounded-full overflow-hidden border border-emerald-100">
                          <div 
                            className={`h-full ${q.accuracy > 70 ? 'bg-[#009660]' : q.accuracy > 40 ? 'bg-[#FFCE00]' : 'bg-red-500'}`} 
                            style={{ width: `${q.accuracy}%` }}
                          ></div>
                        </div>
                        <span className="font-black text-emerald-900 text-sm whitespace-nowrap">{q.accuracy}% Acerto</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {q.distractors.map((d, dIdx) => (
                          <div key={dIdx} className={`flex justify-between items-center p-3 rounded-2xl border-2 ${d.isCorrect ? 'bg-emerald-50 border-emerald-100 text-[#009660]' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                            <span className="truncate mr-3 font-bold uppercase text-[11px] tracking-wider">{d.answerText}</span>
                            <span className="font-black bg-white px-2 py-1 rounded-lg text-[10px] shadow-sm">{d.percentage}% <span className="opacity-50">({d.timesChosen})</span></span>
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
                <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-6 shadow-sm">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter mb-8 text-emerald-900">Diagnóstico da Turma</h3>
                  
                  <div className="space-y-5">
                    {[
                      { label: 'AVANÇADO', key: 'AVANCADO', color: 'bg-[#6c63ff]' },
                      { label: 'PROFICIENTE', key: 'PROFICIENTE', color: 'bg-[#009660]' },
                      { label: 'EM CONSTRUÇÃO', key: 'EM_CONSTRUCAO', color: 'bg-[#FFCE00]' },
                      { label: 'INICIANTE', key: 'INICIANTE', color: 'bg-red-500' },
                    ].map(level => {
                      const count = report.levelDistribution[level.key] || 0;
                      const pct = report.totalParticipants > 0 ? Math.round((count / report.totalParticipants) * 100) : 0;
                      
                      return (
                        <div key={level.key}>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="font-black uppercase tracking-widest text-emerald-900">{level.label}</span>
                            <span className="font-bold text-emerald-900/50">{count} alunos ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                            <div className={`h-full ${level.color}`} style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BNCC Accuracy per Skill */}
                {report.bnccStats.length > 0 && (
                  <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-6 shadow-sm">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2 text-emerald-900">
                      Acertos por Habilidade
                    </h3>
                    <p className="text-xs font-bold text-emerald-900/50 mb-6 uppercase tracking-widest">
                      Porcentagem de acertos por habilidade da BNCC
                    </p>
                    
                    <div className="space-y-4">
                      {report.bnccStats.map((b, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-black text-[#009660] uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                              {b.code}
                            </span>
                            <span className="font-black text-emerald-900">
                              {b.averageAccuracy}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${b.averageAccuracy > 70 ? 'bg-[#009660]' : b.averageAccuracy > 40 ? 'bg-[#FFCE00]' : 'bg-red-500'}`} 
                              style={{ width: `${b.averageAccuracy}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* BNCC Need help */}
                {report.bnccStats.filter(b => b.averageAccuracy < 50).length > 0 && (
                  <div className="bg-red-50 border-2 border-red-100 rounded-[2rem] p-6 shadow-sm">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2 text-red-600">Alerta BNCC</h3>
                    <p className="text-xs font-bold text-red-500/70 mb-6 uppercase tracking-widest">Habilidades com menor acerto</p>
                    
                    <div className="space-y-3">
                      {report.bnccStats.filter(b => b.averageAccuracy < 50).slice(0, 5).map((b, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-red-100 shadow-sm">
                          <span className="font-black text-red-600 uppercase tracking-widest text-xs">{b.code}</span>
                          <span className={`font-black text-sm ${b.averageAccuracy < 50 ? 'text-red-500' : 'text-emerald-900'}`}>
                            {b.averageAccuracy}%
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

            {/* TAB: MAPA DE HABILIDADES */}
            {activeTab === 'MAPA' && (
              <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-6 md:p-8 overflow-hidden flex flex-col shadow-sm">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3 text-emerald-900">
                  <Grid className="text-[#009660]" size={32} /> Mapa de Respostas <span className="text-[10px] font-black not-italic text-emerald-900/40 tracking-widest ml-2 bg-emerald-50 px-3 py-1 rounded-xl">(Matriz Aluno x Questão)</span>
                </h2>
                
                <div className="overflow-x-auto pb-4 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="p-4 border-b-2 border-emerald-100 sticky left-0 bg-white z-10 w-48 min-w-[200px] shadow-[4px_0_15px_-4px_rgba(0,150,96,0.1)]">
                          <span className="text-emerald-900/50 font-black uppercase text-[10px] tracking-widest">Participante</span>
                        </th>
                        {report.responseGrid.columns.map(col => (
                          <th key={col.questionId} className="p-4 border-b-2 border-emerald-100 min-w-[100px] text-center border-l-2 border-emerald-50">
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-black text-emerald-900 mb-2">Q{col.index}</span>
                              {col.bnccCode ? (
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#009660] bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg" title={col.bnccCode}>
                                  {col.bnccCode}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-gray-300">-</span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.responseGrid.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-emerald-50/50 transition-colors border-b border-emerald-50 group">
                          <td className="p-4 sticky left-0 bg-white group-hover:bg-emerald-50/50 transition-colors z-10 font-black uppercase text-sm text-emerald-900 shadow-[4px_0_15px_-4px_rgba(0,150,96,0.1)]">
                            {row.userName}
                          </td>
                          {row.responses.map(resp => (
                            <td key={resp.questionId} className="p-4 text-center border-l-2 border-emerald-50">
                              {resp.isCorrect === true && (
                                <div className="mx-auto w-10 h-10 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center text-[#009660] shadow-sm transform transition-transform group-hover:scale-110" title="Acertou">
                                  <Check size={20} strokeWidth={4} />
                                </div>
                              )}
                              {resp.isCorrect === false && (
                                <div className="mx-auto w-10 h-10 rounded-2xl bg-red-50 border-2 border-red-100 flex items-center justify-center text-red-500 shadow-sm transform transition-transform group-hover:scale-110" title="Errou">
                                  <X size={20} strokeWidth={4} />
                                </div>
                              )}
                              {resp.isCorrect === null && (
                                <div className="mx-auto w-10 h-10 flex items-center justify-center text-gray-300" title="Não respondeu">
                                  <Minus size={20} strokeWidth={4} />
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
