import React, { useState, useEffect, useRef } from 'react';
import MemoryCard from '../components/MemoryCard';
import { API_URL } from '../../../config/api';
import AuthService from '../../../services/AuthService';
import ConfirmModal from '../../../shared/ui/ConfirmModal';

const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const MemoryGame = ({ user, theme, onBack }) => {
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Game Metrics
  const [errors, setErrors] = useState(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [maxConsecutiveErrors, setMaxConsecutiveErrors] = useState(0);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  
  // Timer
  const [timeSpent, setTimeSpent] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  const timerRef = useRef(null);

  const totalPairs = Math.min(theme.symbols?.length || 0, 6);

  useEffect(() => {
    if (totalPairs === 0) return;
    
    // Preparar cartas (2 de cada símbolo)
    const symbolsToUse = theme.symbols.slice(0, totalPairs);
    const initialCards = [];
    symbolsToUse.forEach((url, idx) => {
      initialCards.push({ id: `a-${idx}`, symbolUrl: url, pairId: idx, isFlipped: false, isMatched: false });
      initialCards.push({ id: `b-${idx}`, symbolUrl: url, pairId: idx, isFlipped: false, isMatched: false });
    });

    setCards(shuffleArray(initialCards));

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [theme, totalPairs]);

  useEffect(() => {
    if (matchedPairs > 0 && matchedPairs === totalPairs && !isFinished) {
      handleGameFinish();
    }
  }, [matchedPairs, totalPairs, isFinished]);

  const handleGameFinish = async () => {
    setIsFinished(true);
    clearInterval(timerRef.current);
    
    try {
      const payload = {
        themeId: theme.id,
        totalPairs,
        pairsFound: matchedPairs,
        errors,
        consecutiveErrors: maxConsecutiveErrors,
        maxCombo,
        timeSpentSecs: timeSpent
      };

      const response = await fetch(`${API_URL}/memory/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setFinalResult(data.data);
    } catch (error) {
      console.error("Erro ao salvar partida", error);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCardClick = (index) => {
    if (isLocked || cards[index].isMatched || cards[index].isFlipped) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);

    if (newFlippedIndices.length === 2) {
      setIsLocked(true);
      const [firstIndex, secondIndex] = newFlippedIndices;

      if (newCards[firstIndex].pairId === newCards[secondIndex].pairId) {
        // MATCH!
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstIndex].isMatched = true;
          matchedCards[secondIndex].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          setMatchedPairs(prev => prev + 1);
          setIsLocked(false);
          
          // Combos e Erros
          const newCombo = currentCombo + 1;
          setCurrentCombo(newCombo);
          if (newCombo > maxCombo) setMaxCombo(newCombo);
          setConsecutiveErrors(0);
        }, 600);
      } else {
        // ERROR!
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstIndex].isFlipped = false;
          resetCards[secondIndex].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
          setIsLocked(false);
          
          // Penalidades
          setErrors(prev => prev + 1);
          const newConsErrors = consecutiveErrors + 1;
          setConsecutiveErrors(newConsErrors);
          if (newConsErrors > maxConsecutiveErrors) setMaxConsecutiveErrors(newConsErrors);
          setCurrentCombo(0);
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex flex-col relative">
      {/* Header */}
      <header className="p-4 sm:p-6 flex justify-between items-center bg-white shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="w-10 h-10 flex items-center justify-center bg-pink-50 rounded-xl text-pink-600 font-black hover:bg-pink-100 transition-colors"
          >
            ✕
          </button>
          <div>
            <h1 className="text-xl font-black text-pink-900 uppercase italic leading-none">{theme.name}</h1>
            <p className="text-[10px] font-black uppercase text-pink-900/50 tracking-widest mt-1">Super Memória</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] font-black uppercase text-pink-900/50">Tempo</span>
            <span className="text-lg font-black text-pink-900">{formatTime(timeSpent)}</span>
          </div>
          <div className="w-px h-8 bg-pink-100 hidden sm:block"></div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-black uppercase text-pink-900/50">Combo Atual</span>
            <span className={`text-lg font-black ${currentCombo > 1 ? 'text-emerald-500 animate-pulse' : 'text-pink-900'}`}>
              x{currentCombo}
            </span>
          </div>
        </div>
      </header>

      {/* Main Board */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-3 sm:gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-[3rem] shadow-sm">
          {cards.map((card, index) => (
            <MemoryCard 
              key={`${card.id}-${index}`} 
              card={card} 
              onClick={() => handleCardClick(index)} 
            />
          ))}
        </div>
      </main>

      {/* Footer Info (Mobile) */}
      <footer className="sm:hidden p-4 bg-white flex justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-pink-900/50">Tempo</span>
          <span className="text-lg font-black text-pink-900">{formatTime(timeSpent)}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] font-black uppercase text-pink-900/50">Erros</span>
          <span className="text-lg font-black text-red-500">{errors}</span>
        </div>
      </footer>

      {/* Result Modal */}
      {isFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pink-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl text-center animate-in zoom-in-95">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-black text-pink-900 uppercase italic tracking-tighter mb-2">Concluído!</h2>
            
            <div className="bg-pink-50 p-6 rounded-[2rem] my-6 space-y-4">
              <div className="flex justify-between items-center border-b border-pink-100 pb-2">
                <span className="text-xs font-black uppercase text-pink-900/60">Tempo Final:</span>
                <span className="font-black text-pink-900">{formatTime(timeSpent)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-pink-100 pb-2">
                <span className="text-xs font-black uppercase text-pink-900/60">Total de Erros:</span>
                <span className="font-black text-red-500">{errors}</span>
              </div>
              <div className="flex justify-between items-center border-b border-pink-100 pb-2">
                <span className="text-xs font-black uppercase text-pink-900/60">Maior Combo:</span>
                <span className="font-black text-emerald-500">x{maxCombo}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black uppercase text-pink-900">Pontuação:</span>
                <span className="text-3xl font-black text-[#FFCE00] drop-shadow-sm">
                  {finalResult ? finalResult.finalScore : '...'}
                </span>
              </div>
            </div>

            <button
              onClick={onBack}
              className="w-full bg-[#FFCE00] text-pink-900 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-[0_6px_0_#d1a900] hover:scale-105 transition-transform active:translate-y-1 active:shadow-none"
            >
              VOLTAR AO MENU
            </button>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      <ConfirmModal
        isOpen={showExitConfirm}
        title="Abandonar Jogo"
        message="Se você sair agora, seu progresso não será salvo. Tem certeza?"
        onConfirm={onBack}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
};

export default MemoryGame;
