import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Image as ImageIcon, ArrowLeft, Settings, Clock, CheckCircle, Play } from 'lucide-react';
import QuizService from '../services/QuizService';

export default function QuizEditorScreen({ user, onNavigate, quizId }) {
  const isNew = quizId === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    type: 'PEDAGOGICO',
    discipline: '',
    educStage: '',
    yearGrade: '',
    timePerQuestion: 30,
    isPublic: false,
    questions: []
  });

  const isOwner = isNew || (quizData?.createdById && quizData.createdById === user?.id);

  useEffect(() => {
    if (!isNew) {
      loadQuiz();
    }
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const data = await QuizService.getQuiz(quizId);
      setQuizData(data);
    } catch (err) {
      setError('Erro ao carregar quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!quizData.title) {
      setError('O título é obrigatório.');
      return;
    }
    if (quizData.questions.length === 0) {
      setError('Adicione pelo menos uma questão.');
      return;
    }

    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i];
      if (!q.questionText) return setError(`Questão ${i + 1} sem texto.`);
      if (q.answers.length < 2) return setError(`Questão ${i + 1} precisa de pelo menos 2 alternativas.`);
      const hasCorrect = q.answers.some(a => a.isCorrect);
      if (!hasCorrect) return setError(`Questão ${i + 1} não tem resposta correta marcada.`);
    }

    try {
      setSaving(true);
      if (isNew) {
        await QuizService.createQuiz(quizData);
        onNavigate('HOME');
      } else {
        await QuizService.updateQuiz(quizId, quizData);
        onNavigate('HOME');
      }
    } catch (err) {
      setError('Erro ao salvar quiz.');
    } finally {
      setSaving(false);
    }
  };

  const handleHost = async () => {
    try {
      setSaving(true);
      const data = await QuizService.startQuiz(quizId, 'LIVE');
      onNavigate('PLAY', { roomCode: data.roomCode });
    } catch (err) {
      setError('Erro ao iniciar o quiz.');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    setQuizData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionText: '',
          imageUrl: '',
          bnccCode: '',
          bnccSkill: '',
          answers: [
            { answerText: '', isCorrect: true },
            { answerText: '', isCorrect: false },
            { answerText: '', isCorrect: false },
            { answerText: '', isCorrect: false },
          ]
        }
      ]
    }));
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...quizData.questions];
    newQuestions[index][field] = value;
    setQuizData({ ...quizData, questions: newQuestions });
  };

  const removeQuestion = (index) => {
    const newQuestions = [...quizData.questions];
    newQuestions.splice(index, 1);
    setQuizData({ ...quizData, questions: newQuestions });
  };

  const updateAnswer = (qIndex, aIndex, field, value) => {
    const newQuestions = [...quizData.questions];
    
    if (field === 'isCorrect' && value === true) {
      newQuestions[qIndex].answers.forEach((a, i) => {
        a.isCorrect = (i === aIndex);
      });
    } else {
      newQuestions[qIndex].answers[aIndex][field] = value;
    }
    
    setQuizData({ ...quizData, questions: newQuestions });
  };

  if (loading) return <div className="min-h-screen bg-[#0f0f23] text-white p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white p-4 md:p-8 font-sans pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => onNavigate('HOME')} className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft size={20} /> Voltar
          </button>
          
          <div className="flex gap-3">
            {isOwner && (
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="px-6 py-2 bg-[#2a2a5a] hover:bg-[#3a3a6a] text-white rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save size={20} /> {saving ? 'Salvando...' : 'Salvar Quiz'}
              </button>
            )}
            
            {!isNew && (
              <button 
                onClick={handleHost} 
                disabled={saving}
                className="px-6 py-2 bg-[#51cf66] hover:bg-[#40c057] text-[#0f0f23] rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Play size={20} /> Iniciar Quiz
              </button>
            )}
          </div>
        </div>

        {error && <div className="bg-[#ff4757] text-white p-4 rounded-xl">{error}</div>}

        {/* Basic Settings */}
        <div className="bg-[#1a1a3a] border border-[#2a2a5a] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-[#6c63ff]">
              <Settings size={24} />
              <h2 className="text-2xl font-bold text-white">Configurações do Quiz</h2>
            </div>
            {!isOwner && (
              <span className="bg-[#ffd43b]/20 text-[#ffd43b] px-3 py-1 rounded-full text-sm font-bold border border-[#ffd43b]/50">
                Modo Leitura (Apenas o criador pode editar)
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2">Título do Quiz</label>
              <input
                type="text"
                value={quizData.title}
                onChange={e => setQuizData({...quizData, title: e.target.value})}
                placeholder="Ex: Revisão de Frações"
                disabled={!isOwner}
                className="w-full bg-[#0f0f23] border border-[#2a2a5a] rounded-lg p-3 text-white focus:border-[#6c63ff] outline-none disabled:opacity-50"
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2">Descrição (Opcional)</label>
              <textarea
                value={quizData.description}
                onChange={e => setQuizData({...quizData, description: e.target.value})}
                rows="2"
                disabled={!isOwner}
                className="w-full bg-[#0f0f23] border border-[#2a2a5a] rounded-lg p-3 text-white focus:border-[#6c63ff] outline-none disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Tipo</label>
                <select
                  value={quizData.type}
                  onChange={e => setQuizData({...quizData, type: e.target.value})}
                  disabled={!isOwner}
                  className="w-full bg-[#0f0f23] border border-[#2a2a5a] rounded-lg p-3 text-white focus:border-[#6c63ff] outline-none disabled:opacity-50"
                >
                  <option value="PEDAGOGICO">Pedagógico (BNCC)</option>
                  <option value="COMEMORATIVO">Comemorativo (Livre)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Disciplina</label>
                <input
                  type="text"
                  value={quizData.discipline}
                  onChange={e => setQuizData({...quizData, discipline: e.target.value})}
                  placeholder="Ex: Matemática"
                  disabled={!isOwner}
                  className="w-full bg-[#0f0f23] border border-[#2a2a5a] rounded-lg p-3 text-white focus:border-[#6c63ff] outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Série / Ano</label>
                <input
                  type="text"
                  value={quizData.yearGrade}
                  onChange={e => setQuizData({...quizData, yearGrade: e.target.value})}
                  placeholder="Ex: 5º Ano"
                  disabled={!isOwner}
                  className="w-full bg-[#0f0f23] border border-[#2a2a5a] rounded-lg p-3 text-white focus:border-[#6c63ff] outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2 flex items-center gap-2">
                <Clock size={16} /> Tempo por Questão (segundos)
              </label>
              <input
                type="number"
                value={quizData.timePerQuestion}
                onChange={e => setQuizData({...quizData, timePerQuestion: parseInt(e.target.value) || 30})}
                min="10" max="120"
                disabled={!isOwner}
                className="w-full md:w-48 bg-[#0f0f23] border border-[#2a2a5a] rounded-lg p-3 text-white focus:border-[#6c63ff] outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center justify-between">
            Questões ({quizData.questions.length})
            {isOwner && (
              <button onClick={addQuestion} className="px-4 py-2 bg-[#1a1a3a] border border-[#2a2a5a] rounded-lg text-sm font-bold hover:border-[#6c63ff] hover:text-[#6c63ff] transition-colors flex items-center gap-2">
                <Plus size={16} /> Adicionar
              </button>
            )}
          </h2>

          {quizData.questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-[#1a1a3a] border border-[#2a2a5a] rounded-2xl p-6 relative group">
              {isOwner && (
                <button 
                  onClick={() => removeQuestion(qIndex)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-[#ff4757] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={20} />
                </button>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className="bg-[#2a2a5a] w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  {qIndex + 1}
                </div>
              </div>

              <div className="space-y-4">
                {quizData.type === 'PEDAGOGICO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-xs font-bold mb-1">Código BNCC</label>
                      <input
                        type="text"
                        value={q.bnccCode || ''}
                        onChange={e => updateQuestion(qIndex, 'bnccCode', e.target.value)}
                        placeholder="Ex: EF05MA01"
                        disabled={!isOwner}
                        className="w-full bg-[#0f0f23] border border-[#2a2a5a] rounded-lg p-2 text-sm text-white focus:border-[#6c63ff] outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-gray-400 text-sm font-bold mb-2">Pergunta</label>
                  <textarea
                    value={q.questionText}
                    onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)}
                    rows="2"
                    placeholder="Digite a pergunta aqui..."
                    disabled={!isOwner}
                    className="w-full bg-[#0f0f23] border border-[#2a2a5a] rounded-lg p-3 text-white focus:border-[#6c63ff] outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-bold mb-2 flex items-center gap-2">
                    <ImageIcon size={16} /> URL da Imagem (Opcional)
                  </label>
                  <input
                    type="text"
                    value={q.imageUrl || ''}
                    onChange={e => updateQuestion(qIndex, 'imageUrl', e.target.value)}
                    placeholder="https://..."
                    disabled={!isOwner}
                    className="w-full bg-[#0f0f23] border border-[#2a2a5a] rounded-lg p-3 text-sm text-white focus:border-[#6c63ff] outline-none disabled:opacity-50"
                  />
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="Preview" className="mt-2 h-24 object-contain rounded border border-[#2a2a5a]" />
                  )}
                </div>

                {/* Answers Grid */}
                <div className="mt-6">
                  <label className="block text-gray-400 text-sm font-bold mb-3">Alternativas (Marque a correta)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.answers.map((ans, aIndex) => (
                      <div key={aIndex} className={`flex items-center gap-2 p-2 rounded-lg border ${ans.isCorrect ? 'border-[#51cf66] bg-[#51cf66]/10' : 'border-[#2a2a5a] bg-[#0f0f23]'}`}>
                        <button
                          onClick={() => isOwner && updateAnswer(qIndex, aIndex, 'isCorrect', true)}
                          disabled={!isOwner}
                          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${ans.isCorrect ? 'border-[#51cf66] bg-[#51cf66] text-[#0f0f23]' : 'border-gray-500'} ${!isOwner ? 'cursor-default opacity-70' : ''}`}
                        >
                          {ans.isCorrect && <CheckCircle size={14} />}
                        </button>
                        <input
                          type="text"
                          value={ans.answerText}
                          onChange={e => updateAnswer(qIndex, aIndex, 'answerText', e.target.value)}
                          placeholder={`Alternativa ${aIndex + 1}`}
                          disabled={!isOwner}
                          className="w-full bg-transparent border-none outline-none text-white text-sm disabled:opacity-70"
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ))}

          {quizData.questions.length === 0 && (
            <div className="text-center p-12 border-2 border-dashed border-[#2a2a5a] rounded-2xl text-gray-500">
              Nenhuma questão adicionada ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
