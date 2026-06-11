import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Image as ImageIcon, ArrowLeft, Settings, Clock, CheckCircle, Play, Upload, Loader, X } from 'lucide-react';
import QuizService from '../services/QuizService';
import { API_BASE_URL } from '../../../config/api';

export default function QuizEditorScreen({ user, onNavigate, quizId }) {
  const isNew = quizId === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingImageIndex, setUploadingImageIndex] = useState(null);
  const [uploadingAnswerIndex, setUploadingAnswerIndex] = useState(null); // formato: "qIndex-aIndex"
  
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    type: 'PEDAGOGICO',
    discipline: '',
    educStage: '',
    yearGrade: '',
    timePerQuestion: 30,
    isPublic: true,
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
            { answerText: '', isCorrect: true, imageUrl: '' },
            { answerText: '', isCorrect: false, imageUrl: '' },
            { answerText: '', isCorrect: false, imageUrl: '' },
            { answerText: '', isCorrect: false, imageUrl: '' },
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

  const handleImageUpload = async (qIndex, event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingImageIndex(qIndex);
    try {
      const data = await QuizService.uploadImage(file);
      const fullUrl = `${API_BASE_URL}${data.url}`;
      updateQuestion(qIndex, 'imageUrl', fullUrl);
    } catch (err) {
      setError(err.message || 'Erro ao fazer upload da imagem.');
    } finally {
      setUploadingImageIndex(null);
    }
  };

  const handleAnswerImageUpload = async (qIndex, aIndex, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const key = `${qIndex}-${aIndex}`;
    setUploadingAnswerIndex(key);
    try {
      const data = await QuizService.uploadImage(file);
      const fullUrl = `${API_BASE_URL}${data.url}`;
      updateAnswer(qIndex, aIndex, 'imageUrl', fullUrl);
    } catch (err) {
      setError(err.message || 'Erro ao fazer upload da imagem da alternativa.');
    } finally {
      setUploadingAnswerIndex(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F0FDF4] text-emerald-900 p-8 flex justify-center items-center font-black uppercase tracking-widest text-xl">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-[#1A1A1A] p-4 md:p-8 font-sans pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between bg-white p-4 rounded-[2rem] shadow-sm border-2 border-emerald-100 mb-6">
          <button onClick={() => onNavigate('HOME')} className="text-emerald-900 hover:text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl flex items-center gap-2 transition-colors font-black uppercase text-xs">
            <ArrowLeft size={16} /> Voltar
          </button>
          
          <div className="flex gap-3">
            {isOwner && (
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="px-6 py-3 bg-[#FFCE00] hover:brightness-105 text-[#009660] rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-[0_4px_0_#d1a900] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
              >
                <Save size={16} /> {saving ? 'SALVANDO...' : 'SALVAR QUIZ'}
              </button>
            )}
            
            {!isNew && (
              <button 
                onClick={handleHost} 
                disabled={saving}
                className="px-6 py-3 bg-[#009660] hover:brightness-110 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-[0_4px_0_#00764D] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
              >
                <Play size={16} className="fill-current" /> INICIAR QUIZ
              </button>
            )}
          </div>
        </div>

        {error && <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl font-bold">{error}</div>}

        {/* Basic Settings */}
        <div className="bg-white border-2 border-emerald-100 shadow-[0_10px_30px_rgba(0,150,96,0.1)] rounded-[2rem] p-6 md:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-[#FFCE00] rounded-full opacity-10" />
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3 text-[#009660]">
              <Settings size={28} />
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-emerald-900">Configurações do Quiz</h2>
            </div>
            {!isOwner && (
              <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-black border border-amber-200">
                Somente Leitura
              </span>
            )}
          </div>

          <div className="space-y-4 relative z-10">
            <div>
              <label className="block text-emerald-900/70 text-[10px] uppercase tracking-widest font-black mb-2">Título do Quiz</label>
              <input
                type="text"
                value={quizData.title}
                onChange={e => setQuizData({...quizData, title: e.target.value})}
                placeholder="EX: REVISÃO DE FRAÇÕES"
                disabled={!isOwner}
                className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-emerald-900 font-black focus:border-emerald-400 focus:bg-white outline-none disabled:opacity-50 transition-all uppercase placeholder:text-emerald-200"
              />
            </div>
            
            <div>
              <label className="block text-emerald-900/70 text-[10px] uppercase tracking-widest font-black mb-2">Descrição (Opcional)</label>
              <textarea
                value={quizData.description}
                onChange={e => setQuizData({...quizData, description: e.target.value})}
                rows="2"
                disabled={!isOwner}
                className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-emerald-900 font-medium focus:border-emerald-400 focus:bg-white outline-none disabled:opacity-50 transition-all placeholder:text-emerald-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-emerald-900/70 text-[10px] uppercase tracking-widest font-black mb-2">Tipo</label>
                <select
                  value={quizData.type}
                  onChange={e => setQuizData({...quizData, type: e.target.value})}
                  disabled={!isOwner}
                  className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-emerald-900 font-black uppercase focus:border-emerald-400 focus:bg-white outline-none disabled:opacity-50 transition-all"
                >
                  <option value="PEDAGOGICO">Pedagógico (BNCC)</option>
                  <option value="COMEMORATIVO">Comemorativo (Livre)</option>
                </select>
              </div>

              <div>
                <label className="block text-emerald-900/70 text-[10px] uppercase tracking-widest font-black mb-2">Disciplina</label>
                <input
                  type="text"
                  value={quizData.discipline}
                  onChange={e => setQuizData({...quizData, discipline: e.target.value})}
                  placeholder="EX: MATEMÁTICA"
                  disabled={!isOwner}
                  className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-emerald-900 font-black uppercase focus:border-emerald-400 focus:bg-white outline-none disabled:opacity-50 transition-all placeholder:text-emerald-200"
                />
              </div>

              <div>
                <label className="block text-emerald-900/70 text-[10px] uppercase tracking-widest font-black mb-2">Série / Ano</label>
                <input
                  type="text"
                  value={quizData.yearGrade}
                  onChange={e => setQuizData({...quizData, yearGrade: e.target.value})}
                  placeholder="EX: 5º ANO"
                  disabled={!isOwner}
                  className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-emerald-900 font-black uppercase focus:border-emerald-400 focus:bg-white outline-none disabled:opacity-50 transition-all placeholder:text-emerald-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-emerald-900/70 text-[10px] uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                <Clock size={14} /> TEMPO POR QUESTÃO (SEGUNDOS)
              </label>
              <input
                type="number"
                value={quizData.timePerQuestion}
                onChange={e => setQuizData({...quizData, timePerQuestion: parseInt(e.target.value) || 30})}
                min="10" max="120"
                disabled={!isOwner}
                className="w-full md:w-48 bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-emerald-900 font-black focus:border-emerald-400 focus:bg-white outline-none disabled:opacity-50 transition-all text-center"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-6 border-t-2 border-emerald-50 mt-6 relative z-10">
            <input 
              type="checkbox" 
              id="isPublic"
              checked={quizData.isPublic}
              onChange={e => setQuizData({...quizData, isPublic: e.target.checked})}
              disabled={!isOwner}
              className="w-6 h-6 accent-[#009660] cursor-pointer rounded"
            />
            <label htmlFor="isPublic" className="text-emerald-900 font-black uppercase text-xs tracking-widest cursor-pointer select-none">
              Tornar este quiz Público na Biblioteca
            </label>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase text-emerald-900">
              Questões ({quizData.questions.length})
            </h2>
            {isOwner && (
              <button onClick={addQuestion} className="px-5 py-3 bg-[#009660] text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-[0_4px_0_#00764D] hover:brightness-110 transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-2">
                <Plus size={16} strokeWidth={3} /> ADICIONAR QUESTÃO
              </button>
            )}
          </div>

          {quizData.questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white border-2 border-emerald-100 shadow-[0_10px_30px_rgba(0,150,96,0.05)] rounded-[2rem] p-6 relative group transition-all hover:border-emerald-300">
              {isOwner && (
                <button 
                  onClick={() => removeQuestion(qIndex)}
                  className="absolute top-6 right-6 w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Remover Questão"
                >
                  <Trash2 size={18} />
                </button>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className="bg-[#FFCE00] text-[#009660] w-12 h-12 rounded-[1rem] shadow-[0_4px_0_#d1a900] flex items-center justify-center font-black text-xl">
                  {qIndex + 1}
                </div>
              </div>

              <div className="space-y-6">
                {quizData.type === 'PEDAGOGICO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-emerald-900/70 text-[10px] uppercase tracking-widest font-black mb-2">Código BNCC</label>
                      <input
                        type="text"
                        value={q.bnccCode || ''}
                        onChange={e => updateQuestion(qIndex, 'bnccCode', e.target.value)}
                        placeholder="EX: EF05MA01"
                        disabled={!isOwner}
                        className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-xl p-3 text-sm text-emerald-900 font-black focus:border-emerald-400 focus:bg-white outline-none disabled:opacity-50 uppercase placeholder:text-emerald-200"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-emerald-900/70 text-[10px] uppercase tracking-widest font-black mb-2">Pergunta</label>
                  <textarea
                    value={q.questionText}
                    onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)}
                    rows="2"
                    placeholder="DIGITE A PERGUNTA AQUI..."
                    disabled={!isOwner}
                    className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-emerald-900 font-black focus:border-emerald-400 focus:bg-white outline-none disabled:opacity-50 uppercase placeholder:text-emerald-200 transition-all text-lg"
                  />
                </div>

                <div>
                  <label className="block text-emerald-900/70 text-[10px] uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                    <ImageIcon size={14} /> Imagem da Questão (Opcional)
                  </label>
                  
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    {isOwner && (
                      <div className="relative flex-shrink-0">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleImageUpload(qIndex, e)}
                          disabled={uploadingImageIndex === qIndex}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <button 
                          type="button"
                          disabled={uploadingImageIndex === qIndex}
                          className="h-full w-full sm:w-auto px-6 py-3 bg-[#009660] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-[0_4px_0_#00764D] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {uploadingImageIndex === qIndex ? <Loader className="animate-spin" size={16} /> : <><Upload size={16} /> FAZER UPLOAD DA IMAGEM</>}
                        </button>
                      </div>
                    )}
                    
                    {!isOwner && !q.imageUrl && (
                       <span className="text-xs text-gray-400 font-bold">Nenhuma imagem enviada</span>
                    )}
                  </div>
                  
                  {q.imageUrl && (
                    <div className="mt-4 p-2 bg-emerald-50 border-2 border-emerald-100 rounded-2xl inline-block relative group">
                      <img 
                        src={q.imageUrl} 
                        alt="Preview" 
                        className="h-32 object-contain rounded-xl"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/300x150?text=Erro+ao+carregar+imagem';
                        }}
                      />
                      {isOwner && (
                        <button
                          onClick={() => updateQuestion(qIndex, 'imageUrl', '')}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover Imagem"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Answers Grid */}
                <div className="mt-6 p-6 bg-emerald-50/50 rounded-2xl border-2 border-emerald-50">
                  <label className="block text-emerald-900/70 text-[10px] uppercase tracking-widest font-black mb-4">Alternativas (Marque a correta)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.answers.map((ans, aIndex) => (
                      <div key={aIndex} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${ans.isCorrect ? 'border-[#009660] bg-[#009660]/10 shadow-[0_4px_0_#009660]' : 'border-emerald-100 bg-white hover:border-emerald-300'}`}>
                        <button
                          onClick={() => isOwner && updateAnswer(qIndex, aIndex, 'isCorrect', true)}
                          disabled={!isOwner}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 flex-shrink-0 transition-all ${ans.isCorrect ? 'border-[#009660] bg-[#009660] text-white' : 'border-emerald-200 bg-emerald-50 text-emerald-200'} ${!isOwner ? 'cursor-default opacity-70' : 'hover:scale-110'}`}
                        >
                          {ans.isCorrect && <CheckCircle size={16} strokeWidth={3} />}
                        </button>
                        <div className="flex flex-col w-full gap-2">
                          <input
                            type="text"
                            value={ans.answerText}
                            onChange={e => updateAnswer(qIndex, aIndex, 'answerText', e.target.value)}
                            placeholder={`ALTERNATIVA ${aIndex + 1}`}
                            disabled={!isOwner}
                            className="w-full bg-transparent border-none outline-none text-emerald-900 font-black uppercase text-sm disabled:opacity-70 placeholder:text-emerald-200"
                          />
                          {ans.imageUrl ? (
                            <div className="relative inline-block self-start mt-1 group">
                              <img src={ans.imageUrl} className="h-16 object-contain rounded-lg border border-emerald-100 bg-white" />
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => updateAnswer(qIndex, aIndex, 'imageUrl', '')}
                                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              )}
                            </div>
                          ) : (
                            isOwner && (
                              <div className="relative self-start mt-1 cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleAnswerImageUpload(qIndex, aIndex, e)}
                                  disabled={uploadingAnswerIndex === `${qIndex}-${aIndex}`}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer file:cursor-pointer disabled:cursor-not-allowed"
                                />
                                <button type="button" className="text-[10px] font-bold text-[#009660] hover:underline flex items-center gap-1 cursor-pointer">
                                  {uploadingAnswerIndex === `${qIndex}-${aIndex}` ? (
                                    <Loader className="animate-spin" size={10} />
                                  ) : (
                                    <>
                                      <Upload size={10} /> ADICIONAR IMAGEM
                                    </>
                                  )}
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ))}

          {quizData.questions.length === 0 && (
            <div className="text-center py-20 bg-white border-2 border-dashed border-emerald-200 rounded-[2rem] text-emerald-900/40 font-black uppercase tracking-widest">
              <div className="text-4xl mb-4 opacity-50">📝</div>
              Nenhuma questão adicionada ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
