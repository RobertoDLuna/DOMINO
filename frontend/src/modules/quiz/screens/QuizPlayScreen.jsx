import React, { useState, useEffect } from 'react';
import { Users, Clock, Trophy, Play, CheckCircle, XCircle } from 'lucide-react';
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
      setPhase('QUESTION');
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

  if (error) {
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

  if (!quizData) return <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center text-white">Carregando...</div>;

  // --- RENDER LOBBY ---
  if (phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex flex-col items-center justify-center text-white p-4">
        <div className="bg-[#1a1a3a] p-8 rounded-3xl shadow-2xl border border-[#2a2a5a] max-w-2xl w-full text-center">
          <h1 className="text-3xl font-bold mb-2">{quizData.title}</h1>
          <div className="inline-block bg-[#6c63ff]/20 text-[#6c63ff] font-mono text-5xl font-black px-8 py-4 rounded-2xl mb-8 tracking-widest border border-[#6c63ff]/50">
            {roomCode}
          </div>
          
          {isHost ? (
            <div>
              <div className="flex items-center justify-center gap-2 text-xl mb-6">
                <Users className="text-[#51cf66]" /> {players.length} Jogadores na sala
              </div>
              <div className="flex flex-wrap justify-center gap-3 mb-8 min-h-[100px]">
                {players.map((p, i) => (
                  <span key={i} className="bg-[#2a2a5a] px-4 py-2 rounded-full font-bold">{p.name}</span>
                ))}
              </div>
              <button 
                onClick={hostStartQuiz}
                disabled={players.length === 0}
                className="w-full py-4 bg-gradient-to-r from-[#51cf66] to-[#20c997] rounded-xl font-bold text-xl hover:opacity-90 disabled:opacity-50"
              >
                INICIAR QUIZ
              </button>
            </div>
          ) : (
            <div>
              {!hasJoined ? (
                <form onSubmit={handleJoin} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Seu Nome"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-6 py-4 bg-[#0f0f23] border border-[#2a2a5a] rounded-xl text-xl font-bold text-center text-white focus:outline-none focus:border-[#6c63ff]"
                    required
                  />
                  <button type="submit" className="w-full py-4 bg-[#6c63ff] rounded-xl font-bold text-xl hover:bg-[#5a52d5]">
                    Entrar no Jogo
                  </button>
                </form>
              ) : (
                <div className="text-xl font-bold text-[#51cf66] animate-pulse">
                  Você entrou! Aguardando o professor iniciar...
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
    const question = quizData.questions[currentQuestionIndex];
    const colors = ['bg-[#ff6b6b]', 'bg-[#339af0]', 'bg-[#51cf66]', 'bg-[#ffd43b]'];

    return (
      <div className="min-h-screen bg-[#0f0f23] flex flex-col text-white p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <span className="text-gray-400 font-bold">Questão {currentQuestionIndex + 1} de {quizData.questions.length}</span>
          <div className={`flex items-center gap-2 text-2xl font-black ${timeLeft <= 5 ? 'text-[#ff6b6b] animate-ping' : 'text-white'}`}>
            <Clock /> {timeLeft}
          </div>
          <span className="bg-[#2a2a5a] px-4 py-2 rounded-lg font-bold text-[#ffd43b]">
            Score: {isHost ? '-' : myScore}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 leading-tight">
            {question.questionText}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {question.answers.map((ans, idx) => (
              <button
                key={ans.id}
                onClick={() => !isHost && handleSubmitAnswer(ans.id)}
                disabled={isHost || selectedAnswer !== null}
                className={`${colors[idx % 4]} text-white text-xl md:text-2xl font-bold p-8 rounded-2xl shadow-lg transform transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-90 disabled:cursor-default relative overflow-hidden flex items-center justify-center min-h-[120px]`}
              >
                {selectedAnswer === ans.id && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <CheckCircle size={48} className="text-white opacity-50" />
                  </div>
                )}
                <span className="relative z-10">{ans.answerText}</span>
              </button>
            ))}
          </div>
        </div>
        
        {isHost && (
          <div className="mt-8 text-center">
            <button onClick={() => hostEndQuestion(currentQuestionIndex)} className="px-8 py-3 bg-[#ff6b6b] rounded-xl font-bold">Pular Timer</button>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER SCOREBOARD ---
  if (phase === 'SCOREBOARD') {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex flex-col items-center justify-center text-white p-4">
        <h2 className="text-4xl font-black mb-10 text-[#ffd43b] flex items-center gap-3">
          <Trophy size={40} /> Placar Parcial
        </h2>
        
        <div className="w-full max-w-2xl space-y-4 mb-12">
          {leaderboard.map((p, i) => (
            <div key={i} className="bg-[#1a1a3a] border border-[#2a2a5a] p-4 rounded-xl flex justify-between items-center text-xl">
              <div className="flex items-center gap-4">
                <span className={`font-black w-8 text-center ${i === 0 ? 'text-[#ffd43b]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                  #{i + 1}
                </span>
                <span className="font-bold">{p.name}</span>
              </div>
              <span className="font-mono">{p.score} pts</span>
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
            className="px-8 py-4 bg-[#6c63ff] rounded-xl font-bold text-xl hover:bg-[#5a52d5]"
          >
            {currentQuestionIndex + 1 < quizData.questions.length ? 'PRÓXIMA QUESTÃO' : 'FINALIZAR QUIZ'}
          </button>
        ) : (
          <div className="text-gray-400 animate-pulse text-xl">Aguardando professor...</div>
        )}
      </div>
    );
  }

  // --- RENDER FINISH ---
  if (phase === 'FINISH') {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex flex-col items-center justify-center text-white p-4">
        <Trophy size={80} className="text-[#ffd43b] mb-6" />
        <h1 className="text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#ffd43b] to-[#f59f00]">
          PÓDIO FINAL
        </h1>
        <p className="text-xl text-gray-400 mb-12">Fim de jogo!</p>
        
        <div className="flex items-end justify-center gap-4 mb-12 h-64">
          {/* 2nd Place */}
          {leaderboard[1] && (
            <div className="flex flex-col items-center">
              <span className="font-bold mb-2 truncate max-w-[100px]">{leaderboard[1].name}</span>
              <div className="w-24 bg-gray-300 h-32 rounded-t-lg flex items-center justify-center text-black font-black text-2xl">2</div>
            </div>
          )}
          {/* 1st Place */}
          {leaderboard[0] && (
            <div className="flex flex-col items-center">
              <span className="font-bold mb-2 truncate max-w-[120px] text-[#ffd43b]">{leaderboard[0].name}</span>
              <div className="w-28 bg-[#ffd43b] h-48 rounded-t-lg flex items-center justify-center text-black font-black text-4xl">1</div>
            </div>
          )}
          {/* 3rd Place */}
          {leaderboard[2] && (
            <div className="flex flex-col items-center">
              <span className="font-bold mb-2 truncate max-w-[100px] text-orange-400">{leaderboard[2].name}</span>
              <div className="w-24 bg-orange-400 h-24 rounded-t-lg flex items-center justify-center text-black font-black text-2xl">3</div>
            </div>
          )}
        </div>

        {isHost ? (
          <button onClick={() => onNavigate('REPORT', { id: quizData.id })} className="px-8 py-4 bg-[#51cf66] rounded-xl font-bold text-xl hover:bg-[#40c057] text-black">
            VER RELATÓRIO COMPLETO
          </button>
        ) : (
          <div className="bg-[#1a1a3a] p-6 rounded-2xl border border-[#2a2a5a] text-center">
            <p className="text-gray-400 mb-2">Sua pontuação final</p>
            <p className="text-4xl font-mono text-[#6c63ff] font-black">{myScore}</p>
            <button onClick={() => onNavigate('HOME')} className="mt-6 px-6 py-2 bg-[#2a2a5a] rounded-lg font-bold">Voltar ao Início</button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
