import React, { useState } from 'react';
import { TournamentListScreen } from './screens/TournamentListScreen';
import { TournamentDetailScreen } from './screens/TournamentDetailScreen';

const TournamentAppRouter = ({ user, onBack }) => {
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

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
