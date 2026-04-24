import React, { useState, useEffect } from "react";
import { GameProvider } from "./context/GameContext";
import GameContainer from "./components/GameContainer";
import AuthScreen from "./components/AuthScreen";
import ChangePasswordScreen from "./components/ChangePasswordScreen";
import AdminDashboard from "./components/AdminDashboard";
import DominoHomeScreen from "./components/DominoHomeScreen";
import GameHub from "./components/GameHub";
import AuthService from "./services/AuthService";
import { useGameContext } from "./context/GameContext";

function App() {
  const { room, gameState, leaveRoom } = useGameContext();
  const [user, setUser] = useState(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(() => {
    return window.location.pathname.startsWith('/admin');
  });
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  // Checks if we should be in a game screen even if context hasn't updated yet
  const [manualJoin, setManualJoin] = useState(false);
  const isInRoomSession = !!room || !!localStorage.getItem('domino_current_room') || manualJoin;

  useEffect(() => {
    const savedUser = AuthService.getCurrentUser();
    if (savedUser) setUser(savedUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    const openAdmin = () => toggleAdminPanel(true);
    window.addEventListener('openAdminPanel', openAdmin);
    return () => window.removeEventListener('openAdminPanel', openAdmin);
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setGuestMode(false);
    setManualJoin(false);
  };

  const handlePasswordChanged = (userData) => {
    setUser(userData);
  };

  const toggleAdminPanel = (show) => {
    setShowAdminPanel(show);
    if (show) {
      window.history.pushState({}, '', '/admin');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  if (loading) return null;

  if (!user && !guestMode && !isInRoomSession) {
    return (
      <AuthScreen 
        onAuthSuccess={handleAuthSuccess} 
        onGuestStart={() => setGuestMode(true)} 
        onJoinRoom={() => setManualJoin(true)}
      />
    );
  }

  if (user?.mustChangePassword) {
    return (
      <ChangePasswordScreen onPasswordChanged={handlePasswordChanged} />
    );
  }

  const handleLogout = () => {
    if (confirm('Deseja realmente sair?')) {
      AuthService.logout();
      setUser(null);
      setGuestMode(false);
      setActiveGame(null);
      setSelectedTheme(null);
      window.location.reload();
    }
  };

  return (
    <>
      {(selectedTheme || isInRoomSession) ? (
        <GameContainer 
          user={user} 
          isGuest={guestMode || (isInRoomSession && !user)} 
          initialTheme={selectedTheme}
          onBack={() => { 
              setSelectedTheme(null); 
              setManualJoin(false);
              leaveRoom(); 
              if (!user) setGuestMode(false); 
          }}
        />
      ) : activeGame === 'domino' ? (
        <DominoHomeScreen 
          user={user} 
          onSelectTheme={setSelectedTheme} 
          onJoinRoom={() => setManualJoin(true)}
          onBack={() => setActiveGame(null)}
        />
      ) : (
        <GameHub 
          user={user} 
          onSelectGame={(gameId) => setActiveGame(gameId)}
          onLogout={handleLogout}
        />
      )}

      
      {showAdminPanel && user?.role === 'ADMIN' && (
        <AdminDashboard onBack={() => toggleAdminPanel(false)} />
      )}
    </>
  );
}


export default App;

