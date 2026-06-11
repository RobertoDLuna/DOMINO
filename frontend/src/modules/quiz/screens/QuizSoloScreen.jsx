import React, { useState, useEffect } from 'react';
import { Clock, Trophy, CheckCircle, XCircle, Play } from 'lucide-react';
import QuizService from '../services/QuizService';

export default function QuizSoloScreen({ user, onNavigate, quizId }) {
  const [phase, setPhase] = useState('LOADING'); // LOADING, QUESTION, FEEDBACK, FINISH
  const [quizData, setQuizData] = useState(null);
  const [error, setError] = useState('');

  // Game state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  const [sessionId, setSessionId] = useState(null);
  const [finalStats, setFinalStats] = useState(null);

  useEffect(() => {
    loadQuizData();
  }, [quizId]);

  // Timer effect
  useEffect(() => {
    if (phase === 'QUESTION' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'QUESTION' && timeLeft === 0 && !selectedAnswer) {
      // Auto-submit empty if time runs out
      handleSubmitAnswer(null);
    }
  }, [timeLeft, phase, selectedAnswer]);

  const loadQuizData = async () => {
    try {
      setPhase('LOADING');
      const data = await QuizService.getQuiz(quizId);
      const session = await QuizService.createSession(quizId, user?.fullName || 'Visitante');
      
      setSessionId(session.id);
      setQuizData(data);
      setCurrentQuestionIndex(0);
      setTimeLeft(data.timePerQuestion || 30);
      setPhase('QUESTION');
    } catch (err) {
      setError('Erro ao carregar o quiz.');
      setPhase('ERROR');
    }
  };

  const handleSubmitAnswer = async (answerId) => {
    if (selectedAnswer !== null) return; // already answered
    setSelectedAnswer(answerId);
    setPhase('FEEDBACK');
    
    const question = quizData.questions[currentQuestionIndex];
    const timeTaken = (quizData.timePerQuestion || 30) - timeLeft;

    try {
      const result = await QuizService.submitAnswer(sessionId, question.id, answerId, timeTaken);
      setMyScore(prev => prev + result.pointsEarned);
      if (result.isCorrect) {
        setCorrectAnswersCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("Erro ao enviar resposta:", err);
    }
    
    // Auto proceed to next question after 3 seconds
    setTimeout(() => {
      handleNextQuestion();
    }, 3000);
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex + 1 < quizData.questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(quizData.timePerQuestion || 30);
      setSelectedAnswer(null);
      setPhase('QUESTION');
    } else {
      try {
        const finalSession = await QuizService.finalizeSession(sessionId);
        setFinalStats(finalSession);
      } catch (err) {
        console.error("Erro ao finalizar sessão:", err);
      }
      setPhase('FINISH');
    }
  };

  if (phase === 'ERROR') {
    return (
      <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] border-2 border-emerald-100 text-center max-w-md w-full shadow-lg">
          <XCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-emerald-900 mb-4">Ops!</h2>
          <p className="text-emerald-900/70 font-medium mb-8">{error}</p>
          <button onClick={() => onNavigate('HOME')} className="w-full px-6 py-4 bg-red-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-[0_4px_0_#b91c1c] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all">VOLTAR</button>
        </div>
      </div>
    );
  }

  if (phase === 'LOADING' || !quizData) {
    return <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center font-black uppercase tracking-widest text-xl text-emerald-900">Carregando...</div>;
  }

  // --- RENDER QUESTION & FEEDBACK ---
  if (phase === 'QUESTION' || phase === 'FEEDBACK') {
    const question = quizData.questions[currentQuestionIndex];
    const colors = [
      'bg-[#FFCE00] text-[#009660] shadow-[0_6px_0_#d1a900]', 
      'bg-[#009660] text-white shadow-[0_6px_0_#00764D]', 
      'bg-[#FF6B6B] text-white shadow-[0_6px_0_#c92a2a]', 
      'bg-[#339AF0] text-white shadow-[0_6px_0_#1864ab]'
    ];

    return (
      <div className="min-h-screen bg-[#F0FDF4] flex flex-col p-4 md:p-8 relative">
        <div className="fixed top-4 left-4 z-50">
          <button onClick={() => onNavigate('HOME')} className="flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-100 hover:bg-red-500 text-red-500 hover:text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-sm hover:shadow-md">
            <XCircle size={16} />
            <span className="hidden md:inline">SAIR DO QUIZ</span>
          </button>
        </div>

        <div className="flex justify-between items-center mb-8 mt-16 md:mt-0 md:pl-40">
          <span className="text-emerald-900/50 font-black uppercase text-xs tracking-widest">
            QUESTÃO {currentQuestionIndex + 1} DE {quizData.questions.length}
          </span>
          <div className={`flex items-center gap-2 text-3xl font-black ${timeLeft <= 5 && phase !== 'FEEDBACK' ? 'text-red-500 animate-ping' : 'text-emerald-900'}`}>
            <Clock size={32} /> {phase === 'FEEDBACK' ? 0 : timeLeft}
          </div>
          <span className="bg-white border-2 border-emerald-100 px-4 py-2 rounded-2xl font-black uppercase text-xs text-emerald-900 tracking-widest shadow-sm">
            SCORE: {myScore}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
          <div className="bg-white border-2 border-emerald-100 rounded-[3rem] shadow-sm p-8 md:p-12 w-full mb-8 relative">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-center leading-tight text-emerald-900">
              {question.questionText}
            </h2>
            {question.imageUrl && (
              <img src={question.imageUrl} alt="Imagem da questão" className="mt-8 mx-auto h-48 object-contain rounded-2xl border-2 border-emerald-50" crossOrigin="anonymous" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
            {question.answers.map((ans, idx) => {
              let isSelected = selectedAnswer === ans.id;
              let baseClass = colors[idx % 4];
              let activeClass = '';
              
              if (phase === 'FEEDBACK') {
                if (ans.isCorrect) {
                  activeClass = 'ring-8 ring-emerald-400/50 scale-[1.02] z-10'; // Correct answer highlights
                } else if (isSelected && !ans.isCorrect) {
                  activeClass = 'opacity-50 grayscale-[50%]'; // Wrong answer selected dims
                } else {
                  activeClass = 'opacity-30'; // Others dim
                }
              }

              return (
                <button
                  key={ans.id}
                  onClick={() => phase === 'QUESTION' && handleSubmitAnswer(ans.id)}
                  disabled={phase !== 'QUESTION'}
                  className={`${baseClass} ${activeClass} text-xl md:text-2xl font-black uppercase p-4 md:p-6 rounded-[2rem] transform transition-all ${phase === 'QUESTION' ? 'active:translate-y-1 active:shadow-none hover:scale-[1.02]' : ''} disabled:cursor-default relative overflow-hidden flex flex-col items-center justify-center gap-3 min-h-[160px]`}
                >
                  {isSelected && phase === 'QUESTION' && (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[1px] z-20">
                      <CheckCircle size={56} className="text-white opacity-80" strokeWidth={3} />
                    </div>
                  )}
                  {phase === 'FEEDBACK' && ans.isCorrect && (
                    <div className="absolute top-4 right-4 bg-white/20 rounded-full p-1 backdrop-blur-sm z-20">
                      <CheckCircle size={32} className="text-white drop-shadow-md" strokeWidth={3} />
                    </div>
                  )}
                  {phase === 'FEEDBACK' && isSelected && !ans.isCorrect && (
                    <div className="absolute top-4 right-4 bg-white/20 rounded-full p-1 backdrop-blur-sm z-20">
                      <XCircle size={32} className="text-white drop-shadow-md" strokeWidth={3} />
                    </div>
                  )}
                  {ans.imageUrl && (
                    <img src={ans.imageUrl} alt={ans.answerText} className="h-24 md:h-28 object-contain rounded-xl bg-white/20 p-1.5 border border-white/10" crossOrigin="anonymous" />
                  )}
                  <span className="relative z-10 tracking-wide text-center text-base md:text-lg">{ans.answerText}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER FINISH ---
  if (phase === 'FINISH') {
    return (
      <div className="min-h-screen bg-[#F0FDF4] flex flex-col items-center justify-center p-4">
        <Trophy size={100} className="text-[#FFCE00] mb-6 drop-shadow-xl animate-bounce-slow" />
        <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-2 text-[#009660]">
          FIM DE JOGO!
        </h1>
        <p className="text-sm font-black uppercase tracking-widest text-emerald-900/50 mb-12">Você completou o quiz {quizData.title}</p>
        
        <div className="bg-white p-8 md:p-10 rounded-[3rem] border-2 border-emerald-100 text-center w-full max-w-md shadow-sm mb-8">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-50 p-4 rounded-[2rem] border-2 border-emerald-100">
              <p className="text-emerald-900/50 text-[10px] font-black uppercase tracking-widest mb-1">Pontuação Final</p>
              <p className="text-3xl text-[#FFCE00] font-black">{myScore}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-[2rem] border-2 border-emerald-100">
              <p className="text-emerald-900/50 text-[10px] font-black uppercase tracking-widest mb-1">Acertos</p>
              <p className="text-3xl text-[#009660] font-black">{correctAnswersCount} / {quizData.questions.length}</p>
            </div>
          </div>

          {finalStats && (
            <div className="bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-200 mb-8 flex justify-center items-center gap-4">
              <Trophy className="text-amber-500" size={40} />
              <div className="text-left">
                <p className="text-amber-700/60 text-[10px] font-black uppercase tracking-widest">Seu Ranking Global</p>
                <p className="text-2xl font-black text-amber-700">
                  #{finalStats.rank}
                  <span className="text-amber-700/50 text-sm ml-2">de {finalStats.totalPlayers}</span>
                </p>
              </div>
            </div>
          )}
          
          <button onClick={() => onNavigate('HOME')} className="w-full py-5 bg-[#009660] text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-[0_6px_0_#00764D] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all">
            VOLTAR À BIBLIOTECA
          </button>
        </div>
      </div>
    );
  }

  return null;
}
