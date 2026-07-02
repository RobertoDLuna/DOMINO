import React, { useState, useEffect } from "react";
import { GameProvider } from "./context/GameContext";
import GameContainer from "./modules/domino/components/GameContainer";
import AuthScreen from "./core/auth/AuthScreen";
import ChangePasswordScreen from "./core/auth/ChangePasswordScreen";
import AdminDashboard from "./core/admin/AdminDashboard";
import DominoHomeScreen from "./modules/domino/screens/DominoHomeScreen";
import GameHub from "./core/hub/GameHub";
import ChessHomeScreen from "./modules/chess/screens/ChessHomeScreen";
import QuizAppRouter from "./modules/quiz/QuizAppRouter";
import TournamentAppRouter from "./modules/tournament/TournamentAppRouter";
import AuthService from "./services/AuthService";
import { useGameContext } from "./context/GameContext";
import ConfirmModal from "./shared/ui/ConfirmModal";

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
    const openTournaments = () => setActiveGame('tournaments');
    window.addEventListener('openAdminPanel', openAdmin);
    window.addEventListener('openTournaments', openTournaments);
    return () => {
      window.removeEventListener('openAdminPanel', openAdmin);
      window.removeEventListener('openTournaments', openTournaments);
    }
  }, []);

  // Força o scroll para o topo ao transicionar de telas (evita que a tela permaneça scrollada ao logar)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [user, guestMode, activeGame, selectedTheme, manualJoin, isInRoomSession]);

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

  const requestLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = () => {
    AuthService.logout();
    setUser(null);
    setGuestMode(false);
    setActiveGame(null);
    setSelectedTheme(null);
    setShowLogoutConfirm(false);
    window.location.reload();
  };

  const cancelLogout = () => setShowLogoutConfirm(false);

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
      ) : activeGame === 'xadrez' ? (
        <ChessHomeScreen
          user={user}
          onBack={() => setActiveGame(null)}
        />
      ) : activeGame === 'quiz' ? (
        <QuizAppRouter user={user} onBack={() => setActiveGame(null)} />
      ) : activeGame === 'tournaments' ? (
        <TournamentAppRouter user={user} onBack={() => setActiveGame(null)} />
      ) : (
        <GameHub
          user={user}
          onSelectGame={(gameId) => setActiveGame(gameId)}
          onLogout={requestLogout}
        />
      )}


      {showAdminPanel && user?.role === 'ADMIN' && (
        <AdminDashboard onBack={() => toggleAdminPanel(false)} />
      )}

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sair do Jogo"
        message="Deseja realmente sair da sua conta?"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
    </>
  );
}


export default App;

