import React, { useState, useEffect } from "react";
import { GameProvider } from "./context/GameContext";
import GameContainer from "./components/GameContainer";
import AuthScreen from "./components/AuthScreen";
import ChangePasswordScreen from "./components/ChangePasswordScreen";
import AdminDashboard from "./components/AdminDashboard";
import HomeScreen from "./components/HomeScreen";
import AuthService from "./services/AuthService";

function App() {
  const [user, setUser] = useState(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(() => {
    return window.location.pathname.startsWith('/admin');
  });
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

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
    setIsJoiningRoom(false);
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

  if (!user && !guestMode && !isJoiningRoom) {
    return (
      <AuthScreen 
        onAuthSuccess={handleAuthSuccess} 
        onGuestStart={() => setGuestMode(true)} 
        onJoinRoom={() => setIsJoiningRoom(true)}
      />
    );
  }

  if (user?.mustChangePassword) {
    return (
      <ChangePasswordScreen onPasswordChanged={handlePasswordChanged} />
    );
  }

  return (
    <>
      <GameProvider>
        {(selectedTheme || isJoiningRoom) ? (
          <GameContainer 
            user={user} 
            isGuest={guestMode || isJoiningRoom} 
            initialTheme={selectedTheme}
            onBack={() => { 
                setSelectedTheme(null); 
                setIsJoiningRoom(false); 
                if (!user) setGuestMode(false); // Retorna para a AuthScreen se for convidado
            }}
          />
        ) : (
          <HomeScreen 
            user={user} 
            onSelectTheme={setSelectedTheme} 
            onJoinRoom={() => setIsJoiningRoom(true)}
          />
        )}
      </GameProvider>

      
      {showAdminPanel && user?.role === 'ADMIN' && (
        <AdminDashboard onBack={() => toggleAdminPanel(false)} />
      )}
    </>
  );
}


export default App;

