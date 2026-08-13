import React, { useState } from 'react';
import MemoryMenu from './pages/MemoryMenu';
import MemoryGame from './pages/MemoryGame';
import MemoryReports from './pages/MemoryReports';

const MemoryAppRouter = ({ user, onBack }) => {
  const [currentScreen, setCurrentScreen] = useState('MENU');
  const [selectedTheme, setSelectedTheme] = useState(null);

  const handleStartGame = (theme) => {
    setSelectedTheme(theme);
    setCurrentScreen('GAME');
  };

  const handleFinishGame = () => {
    setSelectedTheme(null);
    setCurrentScreen('MENU');
  };

  if (currentScreen === 'REPORTS') {
    return <MemoryReports onBack={() => setCurrentScreen('MENU')} />;
  }

  if (currentScreen === 'GAME' && selectedTheme) {
    return <MemoryGame 
      user={user} 
      theme={selectedTheme} 
      onBack={handleFinishGame} 
    />;
  }

  return (
    <MemoryMenu 
      user={user} 
      onBack={onBack} 
      onStartGame={handleStartGame}
      onViewReports={() => setCurrentScreen('REPORTS')}
    />
  );
};

export default MemoryAppRouter;
