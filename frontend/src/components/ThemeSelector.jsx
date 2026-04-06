import React, { useState, useEffect } from 'react';
import { themes as defaultThemes } from '../config/themes';
import ThemeService from '../services/ThemeService';

const ThemeSelector = ({ selectedTheme, onSelect, onOpenCreator, canCreate }) => {
  const [dbThemes, setDbThemes] = useState([]);
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
    
    // Escutar evento de recarregamento se necessário
    const handleRefresh = () => fetchThemes();
    window.addEventListener('refreshThemes', handleRefresh);
    return () => window.removeEventListener('refreshThemes', handleRefresh);
  }, []);

  const handleDeleteTheme = async (e, theme) => {
    e.stopPropagation(); // Não selecionar o tema ao clicar na lixeira
    if (!confirm(`Tem certeza que deseja excluir o tema "${theme.name}"?`)) return;

    try {
      await ThemeService.deleteTheme(theme.id);
      fetchThemes(); // Recarregar a lista
    } catch (err) {
      alert(err.message);
    }
  };

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

  return (
    <div className="w-full mt-6 bg-white/10 backdrop-blur-md p-4 sm:p-6 rounded-3xl border-2 border-white/20 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-visible">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] opacity-80 ml-2">
          ESCOLHA A MATÉRIA DE HOJE:
        </h3>
        {canCreate && (
          <button 
            onClick={onOpenCreator}
            className="bg-[#FFCE00] hover:bg-[#ffe050] text-[#009660] font-black px-4 py-2 rounded-full text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2 border-b-4 border-yellow-600"
          >
            <span>➕</span> <span>CRIAR TEMA</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 p-4">
        {allThemes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            style={{ backgroundColor: !theme.isDefault ? theme.color : undefined }}
            className={`
              flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl transition-all relative group min-h-[100px]
              ${selectedTheme === theme.id 
                ? (theme.isDefault ? `${theme.color} scale-105 shadow-2xl border-b-4 ${theme.borderColor} ring-4 ring-white/50` : 'scale-105 shadow-2xl border-b-4 ring-4 ring-white/50')
                : 'bg-white/10 hover:bg-white/20 border-b-4 border-transparent active:scale-95'}
            `}
          >
            {/* Lixeira para temas customizados */}
            {canCreate && !theme.isDefault && (
              <div 
                onClick={(e) => handleDeleteTheme(e, theme)}
                className="absolute top-2 left-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transform -translate-x-4 -translate-y-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all z-20 hover:scale-110 hover:bg-red-600 border-2 border-white"
                title="Excluir Tema"
              >
                <span className="text-xs">🗑️</span>
              </div>
            )}
            <span className="text-3xl sm:text-4xl mb-1 group-hover:scale-110 transition-transform">
              {theme.emoji}
            </span>
            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-center leading-tight
              ${selectedTheme === theme.id ? 'text-white' : 'text-white/70'}
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
    </div>
  );
};

export default ThemeSelector;
