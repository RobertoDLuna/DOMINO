import React, { useState, useEffect } from 'react';
import { themes as defaultThemes } from '../config/themes';
import ThemeService from '../services/ThemeService';
import ThemeCreator from './ThemeCreator';

const ThemeSelector = ({ selectedTheme, onSelect }) => {
  const [dbThemes, setDbThemes] = useState([]);
  const [showCreator, setShowCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchThemes = async () => {
    try {
      const themes = await ThemeService.getThemes(localStorage.getItem('dominoPlayerId'));
      setDbThemes(themes);
    } catch (err) {
      console.error("Erro ao buscar temas customizados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const allThemes = [
    ...defaultThemes.map(t => ({ ...t, isDefault: true })),
    ...dbThemes.map(t => ({ 
      id: t.id, 
      name: t.name, 
      emoji: '🎨', 
      description: t.description || 'Tema customizado 🎲',
      color: `bg-[${t.color}]`,
      borderColor: 'border-white/20',
      isDefault: false 
    }))
  ];

  const handleThemeCreated = (newTheme) => {
    fetchThemes();
    setShowCreator(false);
    onSelect(newTheme.id);
  };

  return (
    <div className="w-full mt-6 bg-white/10 backdrop-blur-md p-4 sm:p-6 rounded-[2.5rem] border-2 border-white/20 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-black text-sm sm:text-lg uppercase tracking-widest opacity-100 drop-shadow-sm leading-none ml-2">
          ESCOLHA A MATÉRIA DE HOJE:
        </h3>
        <button 
          onClick={() => setShowCreator(true)}
          className="bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] font-black p-3 sm:px-6 sm:py-3 rounded-full text-[10px] sm:text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2 border-2 border-white/20"
        >
          <span>➕</span> <span className="hidden sm:inline">Criar Novo Tema</span>
        </button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 overflow-y-auto max-h-[300px] scrollbar-hide pr-2">
        {allThemes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            style={{ backgroundColor: !theme.isDefault ? theme.color : undefined }}
            className={`
              flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl transition-all relative overflow-hidden group min-h-[100px]
              ${selectedTheme === theme.id 
                ? (theme.isDefault ? `${theme.color} scale-105 shadow-2xl border-b-4 ${theme.borderColor} ring-4 ring-white/50` : 'scale-105 shadow-2xl border-b-4 ring-4 ring-white/50')
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
            
            {!theme.isDefault && (
               <span className="absolute bottom-1 right-2 text-[8px] font-black uppercase text-white/40 tracking-widest">CUSTOM</span>
            )}

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
            "{allThemes.find(t => t.id === selectedTheme)?.description}"
          </p>
        </div>
      )}

      {showCreator && (
        <ThemeCreator 
          onThemeCreated={handleThemeCreated} 
          onClose={() => setShowCreator(false)} 
        />
      )}
    </div>
  );
};

export default ThemeSelector;
