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

  if (!user && !guestMode) {
    return (
      <AuthScreen 
        onAuthSuccess={handleAuthSuccess} 
        onGuestStart={() => setGuestMode(true)} 
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
        {selectedTheme ? (
          <GameContainer 
            user={user} 
            isGuest={guestMode} 
            initialTheme={selectedTheme}
            onBack={() => setSelectedTheme(null)}
          />
        ) : (
          <HomeScreen 
            user={user} 
            onSelectTheme={setSelectedTheme} 
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

