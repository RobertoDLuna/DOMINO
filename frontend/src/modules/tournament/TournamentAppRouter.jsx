import React, { useState } from 'react';
import { TournamentListScreen } from './screens/TournamentListScreen';
import { TournamentDetailScreen } from './screens/TournamentDetailScreen';

const TournamentAppRouter = ({ user, onBack }) => {
  const [selectedTournamentId, setSelectedTournamentId] = useState(() => sessionStorage.getItem('edugames_tourney_selectedId') || null);

  React.useEffect(() => {
    if (selectedTournamentId) sessionStorage.setItem('edugames_tourney_selectedId', selectedTournamentId);
    else sessionStorage.removeItem('edugames_tourney_selectedId');
  }, [selectedTournamentId]);

  if (selectedTournamentId) {
    return (
      <TournamentDetailScreen 
        tournamentId={selectedTournamentId}
        user={user}
        onBack={() => setSelectedTournamentId(null)}
      />
    );
  }

  return (
    <TournamentListScreen 
      user={user}
      onBack={onBack}
      onSelectTournament={setSelectedTournamentId}
    />
  );
};

export default TournamentAppRouter;
