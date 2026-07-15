import React, { useState } from 'react';
import QuizHomeScreen from './screens/QuizHomeScreen';
import QuizEditorScreen from './screens/QuizEditorScreen';
import QuizPlayScreen from './screens/QuizPlayScreen';
import QuizSoloScreen from './screens/QuizSoloScreen';
import QuizReportScreen from './screens/QuizReportScreen';

export default function QuizAppRouter({ user, onBack }) {
  const [currentScreen, setCurrentScreen] = useState(() => sessionStorage.getItem('edugames_quiz_currentScreen') || 'HOME'); // HOME, EDITOR, PLAY, REPORT, SOLO
  const [screenProps, setScreenProps] = useState(() => {
    const saved = sessionStorage.getItem('edugames_quiz_screenProps');
    return saved ? JSON.parse(saved) : {};
  });

  const navigate = (screen, props = {}) => {
    setCurrentScreen(screen);
    setScreenProps(props);
    sessionStorage.setItem('edugames_quiz_currentScreen', screen);
    sessionStorage.setItem('edugames_quiz_screenProps', JSON.stringify(props));
  };

  const handleBack = () => {
    if (currentScreen === 'HOME') {
      sessionStorage.removeItem('edugames_quiz_currentScreen');
      sessionStorage.removeItem('edugames_quiz_screenProps');
      onBack();
    } else {
      navigate('HOME');
    }
  };

  switch (currentScreen) {
    case 'HOME':
      return <QuizHomeScreen user={user} onNavigate={navigate} onBack={handleBack} />;
    case 'EDITOR':
      return <QuizEditorScreen user={user} onNavigate={navigate} quizId={screenProps.id} />;
    case 'PLAY':
      return <QuizPlayScreen user={user} onNavigate={navigate} roomCode={screenProps.roomCode} isHostRoom={screenProps.isHostRoom} />;
    case 'SOLO':
      return <QuizSoloScreen user={user} onNavigate={navigate} quizId={screenProps.id} />;
    case 'REPORT':
      return <QuizReportScreen user={user} onNavigate={navigate} quizId={screenProps.id} />;
    default:
      return <QuizHomeScreen user={user} onNavigate={navigate} onBack={handleBack} />;
  }
}
