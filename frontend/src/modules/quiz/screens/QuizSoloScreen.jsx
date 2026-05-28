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
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center text-white p-4">
        <div className="bg-[#1a1a3a] p-8 rounded-2xl border border-[#ff4757] text-center max-w-md w-full">
          <XCircle className="mx-auto text-[#ff4757] mb-4" size={48} />
          <h2 className="text-2xl font-bold mb-4">Ops!</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button onClick={() => onNavigate('HOME')} className="px-6 py-2 bg-[#ff4757] rounded-lg font-bold">Voltar</button>
        </div>
      </div>
    );
  }

  if (phase === 'LOADING' || !quizData) {
    return <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center text-white">Carregando...</div>;
  }

  // --- RENDER QUESTION & FEEDBACK ---
  if (phase === 'QUESTION' || phase === 'FEEDBACK') {
    const question = quizData.questions[currentQuestionIndex];
    const colors = ['bg-[#ff6b6b]', 'bg-[#339af0]', 'bg-[#51cf66]', 'bg-[#ffd43b]'];

    return (
      <div className="min-h-screen bg-[#0f0f23] flex flex-col text-white p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <span className="text-gray-400 font-bold">Questão {currentQuestionIndex + 1} de {quizData.questions.length}</span>
          <div className={`flex items-center gap-2 text-2xl font-black ${timeLeft <= 5 ? 'text-[#ff6b6b] animate-ping' : 'text-white'}`}>
            <Clock /> {phase === 'FEEDBACK' ? 0 : timeLeft}
          </div>
          <span className="bg-[#2a2a5a] px-4 py-2 rounded-lg font-bold text-[#ffd43b]">
            Score: {myScore}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 leading-tight">
            {question.questionText}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {question.answers.map((ans, idx) => {
              let isSelected = selectedAnswer === ans.id;
              let btnClass = colors[idx % 4];
              
              if (phase === 'FEEDBACK') {
                if (ans.isCorrect) {
                  btnClass = 'bg-[#51cf66] ring-4 ring-white scale-105 z-10'; // Correct answer highlights
                } else if (isSelected && !ans.isCorrect) {
                  btnClass = 'bg-[#ff6b6b] opacity-50'; // Wrong answer selected dims
                } else {
                  btnClass = `${colors[idx % 4]} opacity-30`; // Others dim
                }
              }

              return (
                <button
                  key={ans.id}
                  onClick={() => phase === 'QUESTION' && handleSubmitAnswer(ans.id)}
                  disabled={phase !== 'QUESTION'}
                  className={`${btnClass} text-white text-xl md:text-2xl font-bold p-8 rounded-2xl shadow-lg transform transition-all ${phase === 'QUESTION' ? 'hover:scale-[1.02] active:scale-95' : ''} disabled:cursor-default relative overflow-hidden flex items-center justify-center min-h-[120px]`}
                >
                  {isSelected && phase === 'QUESTION' && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <CheckCircle size={48} className="text-white opacity-50" />
                    </div>
                  )}
                  {phase === 'FEEDBACK' && ans.isCorrect && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle size={32} className="text-white" />
                    </div>
                  )}
                  {phase === 'FEEDBACK' && isSelected && !ans.isCorrect && (
                    <div className="absolute top-2 right-2">
                      <XCircle size={32} className="text-white" />
                    </div>
                  )}
                  <span className="relative z-10">{ans.answerText}</span>
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
      <div className="min-h-screen bg-[#0f0f23] flex flex-col items-center justify-center text-white p-4">
        <Trophy size={80} className="text-[#ffd43b] mb-6" />
        <h1 className="text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#ffd43b] to-[#f59f00]">
          FIM DE JOGO
        </h1>
        <p className="text-xl text-gray-400 mb-12">Você completou o quiz {quizData.title}!</p>
        
        <div className="bg-[#1a1a3a] p-8 rounded-2xl border border-[#2a2a5a] text-center w-full max-w-md shadow-2xl">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#0f0f23] p-4 rounded-xl border border-[#2a2a5a]">
              <p className="text-gray-400 text-sm mb-1">Pontuação Final</p>
              <p className="text-3xl font-mono text-[#ffd43b] font-black">{myScore}</p>
            </div>
            <div className="bg-[#0f0f23] p-4 rounded-xl border border-[#2a2a5a]">
              <p className="text-gray-400 text-sm mb-1">Acertos</p>
              <p className="text-3xl font-mono text-[#51cf66] font-black">{correctAnswersCount} / {quizData.questions.length}</p>
            </div>
          </div>

          {finalStats && (
            <div className="bg-[#0f0f23] p-4 rounded-xl border border-[#2a2a5a] mb-8 flex justify-center items-center gap-4">
              <Trophy className="text-[#6c63ff]" size={32} />
              <div className="text-left">
                <p className="text-gray-400 text-sm">Seu Ranking Global</p>
                <p className="text-2xl font-bold">
                  <span className="text-[#6c63ff] font-black">#{finalStats.rank}</span> 
                  <span className="text-gray-500 text-lg"> de {finalStats.totalPlayers} jogadores</span>
                </p>
              </div>
            </div>
          )}
          
          <button onClick={() => onNavigate('HOME')} className="w-full py-4 bg-[#6c63ff] hover:bg-[#5a52d5] rounded-xl font-bold text-xl transition-colors">
            Voltar à Biblioteca
          </button>
        </div>
      </div>
    );
  }

  return null;
}
