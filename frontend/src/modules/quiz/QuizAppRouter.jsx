import React, { useState } from 'react';
import QuizHomeScreen from './screens/QuizHomeScreen';
import QuizEditorScreen from './screens/QuizEditorScreen';
import QuizPlayScreen from './screens/QuizPlayScreen';
import QuizSoloScreen from './screens/QuizSoloScreen';
import QuizReportScreen from './screens/QuizReportScreen';

export default function QuizAppRouter({ user, onBack }) {
  const [currentScreen, setCurrentScreen] = useState('HOME'); // HOME, EDITOR, PLAY, REPORT, SOLO
  const [screenProps, setScreenProps] = useState({});

  const navigate = (screen, props = {}) => {
    setCurrentScreen(screen);
    setScreenProps(props);
  };

  const handleBack = () => {
    if (currentScreen === 'HOME') {
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
      return <QuizPlayScreen user={user} onNavigate={navigate} roomCode={screenProps.roomCode} />;
    case 'SOLO':
      return <QuizSoloScreen user={user} onNavigate={navigate} quizId={screenProps.id} />;
    case 'REPORT':
      return <QuizReportScreen user={user} onNavigate={navigate} quizId={screenProps.id} />;
    default:
      return <QuizHomeScreen user={user} onNavigate={navigate} onBack={handleBack} />;
  }
}
