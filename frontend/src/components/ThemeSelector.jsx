import React from 'react';
import { themes } from '../config/themes';

const ThemeSelector = ({ selectedTheme, onSelect }) => {
  return (
    <div className="w-full mt-6 bg-white/10 backdrop-blur-md p-4 sm:p-6 rounded-[2.5rem] border-2 border-white/20 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-white font-black text-sm sm:text-lg uppercase tracking-widest text-center mb-4 opacity-100 drop-shadow-sm">
        ESCOLHA A MATÉRIA DE HOJE:
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            className={`
              flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl transition-all relative overflow-hidden group
              ${selectedTheme === theme.id 
                ? `${theme.color} scale-105 shadow-2xl border-b-4 ${theme.borderColor} ring-4 ring-white/50` 
                : 'bg-white/10 hover:bg-white/20 border-b-4 border-transparent active:scale-95'}
            `}
          >
            <span className="text-3xl sm:text-4xl mb-2 group-hover:scale-125 transition-transform duration-300">
              {theme.emoji}
            </span>
            <span className={`text-[10px] sm:text-xs font-black uppercase tracking-tight text-center leading-tight
              ${selectedTheme === theme.id ? 'text-white' : 'text-white/80'}
            `}>
              {theme.name}
            </span>
            
            {selectedTheme === theme.id && (
              <div className="absolute top-1 right-1 sm:top-2 sm:right-2 text-white animate-pulse">
                ✨
              </div>
            )}
          </button>
        ))}
      </div>
      
      {selectedTheme && (
        <div className="mt-4 text-center animate-in fade-in slide-in-from-top-2">
          <p className="text-white font-bold text-xs sm:text-sm italic opacity-80">
            "{themes.find(t => t.id === selectedTheme)?.description}"
          </p>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
