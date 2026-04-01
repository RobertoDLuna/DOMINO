import React, { useState, useEffect } from "react";
import { GameProvider } from "./context/GameContext";
import GameContainer from "./components/GameContainer";
import AuthScreen from "./components/AuthScreen";
import ChangePasswordScreen from "./components/ChangePasswordScreen";
import AdminDashboard from "./components/AdminDashboard";
import AuthService from "./services/AuthService";

function App() {
  const [user, setUser] = useState(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(() => {
    return window.location.pathname.startsWith('/admin');
  });

  useEffect(() => {
    const savedUser = AuthService.getCurrentUser();
    if (savedUser) setUser(savedUser);
    setLoading(false);
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
         <GameContainer user={user} isGuest={guestMode} />
      </GameProvider>
      
      {user?.role === 'ADMIN' && !showAdminPanel && (
        <button 
          onClick={() => toggleAdminPanel(true)}
          className="fixed top-6 right-6 z-[100] bg-white/90 hover:bg-white text-emerald-900 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_5px_20px_rgba(0,0,0,0.3)] border-2 border-[#FFCE00] backdrop-blur-md transition-all active:scale-95 flex items-center gap-2 group hover:shadow-[#FFCE00]/50"
        >
          <span>PAINEL ADMIN</span>
          <span className="text-xl group-hover:scale-110 transition-transform">🛡️</span>
        </button>
      )}

      {showAdminPanel && user?.role === 'ADMIN' && (
        <AdminDashboard onBack={() => toggleAdminPanel(false)} />
      )}
    </>
  );
}


export default App;

