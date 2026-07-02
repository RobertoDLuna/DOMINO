import React from 'react';

const TournamentRoundRobin = ({ matches, participants, tournament, user }) => {

  // Calculate standings
  const standingsMap = {};
  participants.forEach(p => {
    standingsMap[p.userId] = {
      userId: p.userId,
      name: p.userName,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0
    };
  });

  matches.forEach(m => {
    if (m.status === 'FINISHED' && m.player1Id && m.player2Id) {
      if (!standingsMap[m.player1Id]) return;
      if (!standingsMap[m.player2Id]) return;

      standingsMap[m.player1Id].played += 1;
      standingsMap[m.player2Id].played += 1;

      if (m.winnerId === m.player1Id) {
        standingsMap[m.player1Id].won += 1;
        standingsMap[m.player1Id].points += 3;
        standingsMap[m.player2Id].lost += 1;
      } else if (m.winnerId === m.player2Id) {
        standingsMap[m.player2Id].won += 1;
        standingsMap[m.player2Id].points += 3;
        standingsMap[m.player1Id].lost += 1;
      } else {
        // Empate
        standingsMap[m.player1Id].drawn += 1;
        standingsMap[m.player1Id].points += 1;
        standingsMap[m.player2Id].drawn += 1;
        standingsMap[m.player2Id].points += 1;
      }
    }
  });

  const standings = Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.won - a.won; // Tiebreaker: vitorias
  });

  const handleEnterRoom = (match) => {
    if (!match.gameRoomCode) return;
    window.dispatchEvent(new CustomEvent('joinTournamentRoom', { 
      detail: { 
        roomCode: match.gameRoomCode, 
        gameType: tournament.gameType 
      } 
    }));
  };

  const isUserInMatch = (match) => {
    return user && (match.player1Id === user.id || match.player2Id === user.id);
  };

  const rounds = {};
  matches.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });

  return (
    <div className="space-y-8">
      {/* Tabela de Classificação */}
      <div className="bg-white rounded-3xl border border-emerald-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-50/50">
                <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100">#</th>
                <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100">Jogador</th>
                <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100 text-center">PTS</th>
                <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100 text-center">J</th>
                <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100 text-center">V</th>
                <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100 text-center">E</th>
                <th className="p-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest border-b border-emerald-100 text-center">D</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((p, idx) => (
                <tr key={p.userId} className="border-b border-emerald-50 last:border-0 hover:bg-emerald-50/30 transition-colors">
                  <td className="p-4 text-sm font-black text-emerald-900/60 w-12">{idx + 1}</td>
                  <td className="p-4 text-sm font-bold text-emerald-900">{p.name}</td>
                  <td className="p-4 text-sm font-black text-[#009660] text-center bg-emerald-50/50">{p.points}</td>
                  <td className="p-4 text-xs font-medium text-emerald-900/60 text-center">{p.played}</td>
                  <td className="p-4 text-xs font-medium text-emerald-900/60 text-center">{p.won}</td>
                  <td className="p-4 text-xs font-medium text-emerald-900/60 text-center">{p.drawn}</td>
                  <td className="p-4 text-xs font-medium text-emerald-900/60 text-center">{p.lost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de Partidas por Rodada */}
      <div className="space-y-6">
        <h3 className="text-xl font-black text-emerald-900 uppercase italic tracking-tighter">Rodadas</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.keys(rounds).map(roundNum => (
            <div key={roundNum} className="bg-white rounded-[2rem] p-6 border border-emerald-100 shadow-sm">
              <h4 className="text-xs font-black text-emerald-900/60 uppercase tracking-widest mb-4 pb-2 border-b border-emerald-50">
                Rodada {roundNum}
              </h4>
              <div className="space-y-4">
                {rounds[roundNum].map(match => (
                  <div key={match.id} className="p-3 bg-emerald-50/30 rounded-2xl border border-emerald-100">
                    <div className="flex justify-between items-center text-xs font-medium text-emerald-900 mb-2">
                      <span className={match.winnerId === match.player1Id ? 'font-black text-[#009660]' : ''}>{match.player1Name}</span>
                      <span className="font-black text-[10px] bg-white px-2 py-1 rounded-lg border border-emerald-100">VS</span>
                      <span className={match.winnerId === match.player2Id ? 'font-black text-[#009660]' : ''}>{match.player2Name}</span>
                    </div>

                    {match.status === 'PENDING' && match.player1Id && match.player2Id && tournament.status === 'IN_PROGRESS' && (
                      <div className="mt-2 pt-2 border-t border-emerald-50/50">
                        {isUserInMatch(match) ? (
                          <button
                            onClick={() => handleEnterRoom(match)}
                            className="w-full bg-[#FFCE00] text-emerald-900 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#e6ba00] transition-colors"
                          >
                            Entrar na Sala
                          </button>
                        ) : (
                          <div className="text-center text-[9px] font-black text-emerald-900/40 uppercase tracking-widest">
                            Aguardando
                          </div>
                        )}
                      </div>
                    )}

                    {match.status === 'FINISHED' && (
                      <div className="mt-2 text-center text-[9px] font-black text-[#009660] uppercase tracking-widest">
                        Placar: {match.score1 ?? '-'} x {match.score2 ?? '-'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentRoundRobin;
