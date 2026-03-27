import React, { useEffect, useState } from 'react';
import waving from '../assets/avatar/waving.jpg';
import celebrating from '../assets/avatar/celebrating.png';
import rocking from '../assets/avatar/rocking.png';
import thinking from '../assets/avatar/thinking.png';
import smiling from '../assets/avatar/smiling.png';

/**
 * AvatarGuide Component
 * An interactive guide that reacts to the game state.
 * Positions in the bottom-right corner with speech bubbles.
 */
const AvatarGuide = ({ gameState, myTurn, isWinner, className = "" }) => {
  const [expression, setExpression] = useState(waving);
  const [message, setMessage] = useState("Olá! Vamos aprender a jogar dominó?");

  const winMessages = [
    "SENSACIONAL! Você é fera no Dominó! Campeão!",
    "Uau! Alguém avisa o comitê olímpico que temos um mestre aqui!",
    "Vitória merecida! Seu cérebro está tinindo hoje!",
    "DOMINOU TUDO! Literalmente. Parabéns!",
    "Sabia que você conseguiria! Inteligência pura!"
  ];

  const loseMessages = [
    "Foi quase! Mas o importante é que seu cérebro treinou bastante!",
    "Não chore pelo dominó caído. Na próxima você amassa!",
    "O adversário teve sorte, mas sua estratégia foi de mestre!",
    "Perder faz parte do aprendizado. Vamos tentar de novo?",
    "Até os melhores mestres têm seus dias de aprendizado. Próxima rodada?"
  ];

  useEffect(() => {
    switch (gameState) {
      case 'lobby':
        setExpression(waving);
        setMessage("Olá! Que tal começarmos criando uma sala ou entrando em uma?");
        break;
      case 'waiting':
        setExpression(thinking);
        setMessage("Sua sala já está pronta! Agora só falta chamar seus amiguinhos.");
        break;
      case 'playing':
        if (myTurn) {
          setExpression(smiling);
          setMessage("É a sua vez! Pense rápido e escolha a melhor peça!");
        } else {
          setExpression(thinking);
          setMessage("Shh! É a vez do seu adversário. Vamos observar a jogada.");
        }
        break;
      case 'finished':
        if (isWinner) {
          setExpression(celebrating);
          setMessage(winMessages[Math.floor(Math.random() * winMessages.length)]);
        } else {
          setExpression(smiling);
          setMessage(loseMessages[Math.floor(Math.random() * loseMessages.length)]);
        }
        break;
      default:
        setExpression(waving);
        setMessage("Olá! Prontos para um jogo educativo de dominó?");
    }
  }, [gameState, myTurn, isWinner]);

  return (
    <div className={`relative z-10 flex flex-col items-start sm:items-end gap-1 max-w-[200px] sm:max-w-[300px] pointer-events-none transition-all duration-700 ${className}`}>
      {/* Speech Bubble */}
      <div className="relative bg-white text-emerald-900 font-black p-2 sm:p-4 rounded-[1.2rem] rounded-bl-[0.2rem] sm:rounded-bl-[1.2rem] sm:rounded-br-[0.2rem] shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-2 border-emerald-50 mb-1 animate-bounce-slow">
        <p className="text-[10px] sm:text-base leading-snug sm:leading-tight">{message}</p>
        {/* Bubble Tail */}
        <div className="absolute -bottom-2 sm:-bottom-2 left-6 sm:left-auto sm:right-6 w-3 h-3 bg-white border-r-2 border-b-2 border-emerald-50 rotate-45 transform"></div>
      </div>

      {/* Avatar Image container with circular background */}
      <div className="relative group transition-transform duration-500 hover:scale-105 active:scale-95 origin-bottom scale-75 sm:scale-100">
         {/* Circular background for organic integration */}
         <div className="absolute inset-0 bg-white rounded-full shadow-2xl border-4 border-emerald-50 scale-110 -z-10 group-hover:bg-[#FFCE00]/10 transition-colors"></div>
         
         {/* Backdrop Glow */}
         <div className="absolute inset-x-0 -bottom-4 h-8 bg-emerald-900/10 blur-xl -z-10 rounded-full"></div>
         
         <img 
           src={expression} 
           alt="Avatar" 
           className="w-20 h-20 sm:w-40 sm:h-40 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.1)] rounded-full"
         />
      </div>
    </div>
  );
};

export default AvatarGuide;
