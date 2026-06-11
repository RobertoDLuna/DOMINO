import React, { useState, useEffect } from 'react';
import { Users, Clock, Trophy, Play, CheckCircle, XCircle, LogOut } from 'lucide-react';
import QuizService from '../services/QuizService';

export default function QuizPlayScreen({ user, onNavigate, roomCode }) {
  
  const [phase, setPhase] = useState('LOBBY'); // LOBBY, QUESTION, SCOREBOARD, FINISH
  const [quizData, setQuizData] = useState(null);
  const [error, setError] = useState('');
  
  // Player state
  const [playerName, setPlayerName] = useState(user?.fullName || '');
  const [hasJoined, setHasJoined] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  // Game state
  const [players, setPlayers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [correctAnswerId, setCorrectAnswerId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myScore, setMyScore] = useState(0);
  
  const isHost = user?.role === 'PROFESSOR' || user?.role === 'ADMIN'; // Simplify for now. Actually, should check if user is the creator, but anyone can host public ones.

  useEffect(() => {
    loadQuizData();
    return () => {
      QuizService.disconnectSocket();
    };
  }, [roomCode]);

  // Timer effect
  useEffect(() => {
    if (phase === 'QUESTION' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'QUESTION' && timeLeft === 0 && !isHost && !selectedAnswer) {
      // Auto-submit empty if time runs out
      handleSubmitAnswer(null);
    }
  }, [timeLeft, phase, isHost]);

  const loadQuizData = async () => {
    try {
      const data = await QuizService.getQuizByRoomCode(roomCode);
      setQuizData(data);
      
      if (isHost) {
        setupHostSocket();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar sala.');
    }
  };

  const setupHostSocket = () => {
    QuizService.hostJoin(roomCode);
    
    QuizService.on('quiz:roomState', (state) => {
      if (state && state.players) {
        setPlayers(state.players);
      }
    });

    QuizService.on('quiz:playerJoined', (player) => {
      setPlayers(prev => [...prev, player]);
    });
    
    QuizService.on('quiz:playerLeft', (player) => {
      setPlayers(prev => prev.filter(p => p.socketId !== player.socketId));
    });

    QuizService.on('quiz:playerAnswered', (playerUpdate) => {
      setPlayers(prev => prev.map(p => p.socketId === playerUpdate.socketId ? { ...p, score: playerUpdate.score } : p));
    });
  };

  const setupPlayerSocket = () => {
    QuizService.on('quiz:started', () => {
      // Apenas um log ou mudança de estado leve. A fase muda de fato no questionStarted
      console.log('Quiz foi iniciado pelo professor.');
    });

    QuizService.on('quiz:questionStarted', ({ questionIndex, durationSecs }) => {
      setCurrentQuestionIndex(questionIndex);
      setTimeLeft(durationSecs);
      setSelectedAnswer(null);
      setCorrectAnswerId(null);
      setPhase('QUESTION');
    });

    QuizService.on('quiz:questionEnded', ({ correctAnswerId, leaderboard }) => {
      setCorrectAnswerId(correctAnswerId);
      setLeaderboard(leaderboard);
      setPhase('SCOREBOARD');
    });

    QuizService.on('quiz:finished', ({ finalLeaderboard }) => {
      setLeaderboard(finalLeaderboard);
      setPhase('FINISH');
    });
  };

  const handleJoin = async (e) => {
    e?.preventDefault();
    if (!playerName.trim()) return;

    try {
      const session = await QuizService.createSession(quizData.id, playerName);
      setSessionId(session.id);
      setHasJoined(true);
      
      QuizService.playerJoin(roomCode, playerName);
      setupPlayerSocket();
    } catch (err) {
      setError('Erro ao entrar na sessão.');
    }
  };

  const handleSubmitAnswer = async (answerId) => {
    if (selectedAnswer !== null) return; // already answered
    setSelectedAnswer(answerId);
    
    const timeTaken = quizData.timePerQuestion - timeLeft;
    try {
      const result = await QuizService.submitAnswer(sessionId, quizData.questions[currentQuestionIndex].id, answerId, timeTaken);
      setMyScore(prev => prev + result.pointsEarned);
      QuizService.playerSubmitAnswer(roomCode, result.isCorrect, result.pointsEarned);
    } catch (err) {
      console.error(err);
    }
  };

  // --- HOST CONTROLS ---
  const hostStartQuiz = () => {
    QuizService.hostStart(roomCode);
    hostNextQuestion(0);
  };

  const hostNextQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setTimeLeft(quizData.timePerQuestion);
    setPhase('QUESTION');
    QuizService.hostNextQuestion(roomCode, index, quizData.timePerQuestion);
    
    // Auto-end question when time is up
    setTimeout(() => {
      hostEndQuestion(index);
    }, quizData.timePerQuestion * 1000);
  };

  const hostEndQuestion = (index) => {
    // In real app, we need to fetch the correct answer id for this question
    // For now, let's assume the host has the full quiz data with isCorrect
    // We didn't send `isCorrect` to the player via getQuizByRoomCode, but we need it here for the host.
    // Assuming we fetch full details if host. Let's just use a dummy logic for now to show the flow.
    
    // Calculate leaderboard
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score).slice(0, 5);
    setLeaderboard(sortedPlayers);
    setPhase('SCOREBOARD');
    
    // We emit null for correct answer id if we don't have it easily here, but we should fix it in a complete version.
    QuizService.hostEndQuestion(roomCode, null, sortedPlayers);
  };

  const hostFinishQuiz = async () => {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    QuizService.hostFinish(roomCode, sortedPlayers);
    setPhase('FINISH');
    await QuizService.finishQuiz(quizData.id);
  };

  const handleExit = async () => {
    if (isHost) {
      if (window.confirm("Tem certeza que deseja encerrar o Quiz para todos? O jogo será finalizado imediatamente.")) {
        await hostFinishQuiz();
        onNavigate('HOME');
      }
    } else {
      if (window.confirm("Tem certeza que deseja abandonar o jogo?")) {
        onNavigate('HOME');
      }
    }
  };

  const renderExitButton = () => {
    // Não mostra o botão de sair na tela final, pois lá já tem o botão de Voltar.
    if (phase === 'FINISH') return null;
    
    return (
      <button 
        onClick={handleExit}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-100 hover:bg-red-500 text-red-500 hover:text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-sm hover:shadow-md"
      >
        <LogOut size={16} />
        <span className="hidden md:inline">{isHost ? 'ENCERRAR QUIZ' : 'SAIR DO JOGO'}</span>
      </button>
    );
  };

  if (error) {
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

  if (!quizData) return <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center font-black uppercase tracking-widest text-xl text-emerald-900">Carregando...</div>;

  // --- RENDER LOBBY ---
  if (phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#F0FDF4] flex flex-col items-center justify-center p-4">
        {renderExitButton()}
        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-[0_20px_50px_rgba(0,150,96,0.15)] border-2 border-emerald-100 max-w-2xl w-full text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 -mr-20 -mt-20 bg-[#FFCE00] rounded-full opacity-10" />
          
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-emerald-900 mb-4 relative z-10">{quizData.title}</h1>
          
          <div className="inline-block bg-amber-100 text-amber-700 font-mono text-5xl md:text-6xl font-black px-10 py-6 rounded-[2rem] mb-10 tracking-[0.2em] border-2 border-amber-200 relative z-10 shadow-sm">
            {roomCode}
          </div>
          
          {isHost ? (
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest text-emerald-900/70 mb-6">
                <Users className="text-[#009660]" size={20} /> {players.length} JOGADORES NA SALA
              </div>
              <div className="flex flex-wrap justify-center gap-3 mb-10 min-h-[100px]">
                {players.map((p, i) => (
                  <span key={i} className="bg-emerald-50 border-2 border-emerald-100 text-emerald-900 px-5 py-2 rounded-[1.5rem] font-black uppercase text-xs shadow-sm">
                    {p.name}
                  </span>
                ))}
              </div>
              <button 
                onClick={hostStartQuiz}
                disabled={players.length === 0}
                className="w-full py-5 bg-[#FFCE00] text-[#009660] rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-[0_6px_0_#d1a900] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_#d1a900]"
              >
                INICIAR QUIZ! 🚀
              </button>
            </div>
          ) : (
            <div className="relative z-10">
              {!hasJoined ? (
                <form onSubmit={handleJoin} className="space-y-4">
                  <input
                    type="text"
                    placeholder="DIGITE SEU NOME"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-6 py-5 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] text-xl font-black uppercase text-center text-emerald-900 focus:outline-none focus:border-emerald-400 placeholder:text-emerald-200 transition-all"
                    required
                  />
                  <button type="submit" className="w-full py-5 bg-[#009660] text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-[0_6px_0_#00764D] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all">
                    ENTRAR NO JOGO
                  </button>
                </form>
              ) : (
                <div className="text-lg font-black text-[#009660] uppercase tracking-widest animate-pulse border-2 border-emerald-100 bg-emerald-50 rounded-[2rem] p-6">
                  VOCÊ ENTROU! AGUARDANDO O PROFESSOR INICIAR...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER QUESTION ---
  if (phase === 'QUESTION') {
    const question = quizData?.questions?.[currentQuestionIndex];
    
    // Safety guard
    if (!question) {
      return (
        <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center p-4">
          <div className="animate-pulse text-2xl font-black italic uppercase tracking-tighter text-[#009660]">Preparando questão...</div>
        </div>
      );
    }

    const colors = [
      'bg-[#FFCE00] text-[#009660] shadow-[0_6px_0_#d1a900]', 
      'bg-[#009660] text-white shadow-[0_6px_0_#00764D]', 
      'bg-[#FF6B6B] text-white shadow-[0_6px_0_#c92a2a]', 
      'bg-[#339AF0] text-white shadow-[0_6px_0_#1864ab]'
    ];

    return (
      <div className="min-h-screen bg-[#F0FDF4] flex flex-col p-4 md:p-8 relative">
        {renderExitButton()}
        
        <div className="flex justify-between items-center mb-8 mt-16 md:mt-0 md:pl-20">
          <span className="text-emerald-900/50 font-black uppercase text-xs tracking-widest">
            QUESTÃO {currentQuestionIndex + 1} DE {quizData.questions.length}
          </span>
          <div className={`flex items-center gap-2 text-3xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-ping' : 'text-emerald-900'}`}>
            <Clock size={32} /> {timeLeft}
          </div>
          <span className="bg-white border-2 border-emerald-100 px-4 py-2 rounded-2xl font-black uppercase text-xs text-emerald-900 tracking-widest shadow-sm">
            SCORE: {isHost ? '-' : myScore}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
          <div className="bg-white border-2 border-emerald-100 rounded-[3rem] shadow-sm p-8 md:p-12 w-full mb-8 relative">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-center leading-tight text-emerald-900">
              {question.questionText}
            </h2>
            {question.imageUrl && (
              <img src={question.imageUrl} alt="Imagem da questão" className="mt-8 mx-auto h-48 object-contain rounded-2xl border-2 border-emerald-50" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
            {question.answers.map((ans, idx) => (
              <button
                key={ans.id}
                onClick={() => !isHost && handleSubmitAnswer(ans.id)}
                disabled={isHost || selectedAnswer !== null}
                className={`${colors[idx % 4]} text-xl md:text-2xl font-black uppercase p-4 md:p-6 rounded-[2rem] transform transition-all active:translate-y-1 active:shadow-none disabled:opacity-90 disabled:cursor-default disabled:active:translate-y-0 relative overflow-hidden flex flex-col items-center justify-center gap-3 min-h-[160px]`}
              >
                {selectedAnswer === ans.id && (
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[1px] z-20">
                    <CheckCircle size={56} className="text-white opacity-80" strokeWidth={3} />
                  </div>
                )}
                {ans.imageUrl && (
                  <img src={ans.imageUrl} alt={ans.answerText} className="h-24 md:h-28 object-contain rounded-xl bg-white/20 p-1.5 border border-white/10" />
                )}
                <span className="relative z-10 tracking-wide text-center text-base md:text-lg">{ans.answerText}</span>
              </button>
            ))}
          </div>
        </div>
        
        {isHost && (
          <div className="mt-8 flex justify-center">
            <button onClick={() => hostEndQuestion(currentQuestionIndex)} className="px-8 py-4 bg-red-100 text-red-600 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-red-200 transition-colors">
              Pular Tempo
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER SCOREBOARD ---
  if (phase === 'SCOREBOARD') {
    return (
      <div className="min-h-screen bg-[#F0FDF4] flex flex-col items-center justify-center p-4">
        {renderExitButton()}
        <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-10 text-emerald-900 flex items-center gap-3">
          <Trophy size={48} className="text-[#FFCE00]" /> PLACAR PARCIAL
        </h2>
        
        <div className="w-full max-w-2xl space-y-4 mb-12">
          {leaderboard.map((p, i) => (
            <div key={i} className="bg-white border-2 border-emerald-100 shadow-sm p-4 md:p-6 rounded-[2rem] flex justify-between items-center text-xl transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <span className={`font-black w-10 text-center text-2xl ${i === 0 ? 'text-[#FFCE00]' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-emerald-900/40'}`}>
                  #{i + 1}
                </span>
                <span className="font-black uppercase text-emerald-900 text-lg md:text-xl">{p.name}</span>
              </div>
              <span className="font-black text-[#009660] bg-emerald-50 px-4 py-2 rounded-xl text-sm tracking-widest">{p.score} PTS</span>
            </div>
          ))}
        </div>

        {isHost ? (
          <button 
            onClick={() => {
              if (currentQuestionIndex + 1 < quizData.questions.length) {
                hostNextQuestion(currentQuestionIndex + 1);
              } else {
                hostFinishQuiz();
              }
            }}
            className="px-10 py-5 bg-[#009660] text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-[0_6px_0_#00764D] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
          >
            {currentQuestionIndex + 1 < quizData.questions.length ? 'PRÓXIMA QUESTÃO ➔' : 'FINALIZAR QUIZ 🏆'}
          </button>
        ) : (
          <div className="text-emerald-900/50 font-black uppercase tracking-widest animate-pulse text-sm">AGUARDANDO O PROFESSOR...</div>
        )}
      </div>
    );
  }

  // --- RENDER FINISH ---
  if (phase === 'FINISH') {
    return (
      <div className="min-h-screen bg-[#F0FDF4] flex flex-col items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Confetti simulation would go here */}
        </div>

        <Trophy size={100} className="text-[#FFCE00] mb-6 drop-shadow-xl animate-bounce-slow" />
        <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-2 text-[#009660]">
          PÓDIO FINAL!
        </h1>
        <p className="text-sm font-black uppercase tracking-widest text-emerald-900/50 mb-12">O jogo acabou!</p>
        
        <div className="flex items-end justify-center gap-2 md:gap-6 mb-16 h-64 w-full max-w-3xl">
          {/* 2nd Place */}
          {leaderboard[1] && (
            <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-100 flex-1 max-w-[120px]">
              <span className="font-black uppercase text-gray-500 mb-3 truncate w-full text-center px-2">{leaderboard[1].name}</span>
              <div className="w-full bg-gray-200 h-32 rounded-t-[2rem] flex flex-col items-center justify-start pt-4 border-2 border-b-0 border-gray-300 shadow-lg">
                <span className="text-gray-400 font-black text-4xl">2</span>
                <span className="text-[10px] font-black text-gray-400 uppercase mt-2">{leaderboard[1].score} pts</span>
              </div>
            </div>
          )}
          {/* 1st Place */}
          {leaderboard[0] && (
            <div className="flex flex-col items-center animate-in slide-in-from-bottom-16 duration-700 z-10 flex-1 max-w-[140px]">
              <span className="font-black uppercase text-[#FFCE00] mb-3 truncate w-full text-center px-2 text-xl drop-shadow-sm">{leaderboard[0].name}</span>
              <div className="w-full bg-[#FFCE00] h-48 rounded-t-[2rem] flex flex-col items-center justify-start pt-6 border-2 border-b-0 border-amber-300 shadow-xl">
                <span className="text-amber-700 font-black text-5xl">1</span>
                <span className="text-[11px] font-black text-amber-700 uppercase mt-2">{leaderboard[0].score} pts</span>
              </div>
            </div>
          )}
          {/* 3rd Place */}
          {leaderboard[2] && (
            <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-700 delay-200 flex-1 max-w-[120px]">
              <span className="font-black uppercase text-orange-400 mb-3 truncate w-full text-center px-2">{leaderboard[2].name}</span>
              <div className="w-full bg-orange-100 h-24 rounded-t-[2rem] flex flex-col items-center justify-start pt-3 border-2 border-b-0 border-orange-200 shadow-md">
                <span className="text-orange-400 font-black text-3xl">3</span>
                <span className="text-[9px] font-black text-orange-400 uppercase mt-1">{leaderboard[2].score} pts</span>
              </div>
            </div>
          )}
        </div>

        {isHost ? (
          <button onClick={() => onNavigate('REPORT', { id: quizData.id })} className="px-10 py-5 bg-[#009660] text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-[0_6px_0_#00764D] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center gap-3">
            VER RELATÓRIO COMPLETO
          </button>
        ) : (
          <div className="w-full max-w-sm">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-[2rem] border-2 border-emerald-100 text-center shadow-sm">
                <p className="text-emerald-900/50 text-[10px] font-black uppercase tracking-widest mb-1">Pontuação</p>
                <p className="text-2xl text-[#009660] font-black">{myScore}</p>
              </div>
              <div className="bg-white p-4 rounded-[2rem] border-2 border-emerald-100 text-center shadow-sm">
                <p className="text-emerald-900/50 text-[10px] font-black uppercase tracking-widest mb-1">Ranking</p>
                <p className="text-2xl text-[#FFCE00] font-black">
                  #{leaderboard.findIndex(p => p.name === playerName) + 1}
                  <span className="text-[10px] text-emerald-900/30 ml-1">de {leaderboard.length}</span>
                </p>
              </div>
            </div>
            <button onClick={() => onNavigate('HOME')} className="w-full px-8 py-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition-colors rounded-[2rem] font-black uppercase text-xs tracking-widest">Voltar ao Início</button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
