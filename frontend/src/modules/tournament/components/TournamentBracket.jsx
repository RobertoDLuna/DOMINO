import React from 'react';

const TournamentBracket = ({ matches, tournament, user }) => {
  const rounds = {};
  matches.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });

  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

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

  return (
    <div className="overflow-x-auto pb-8 scrollbar-hide">
      <div className="flex min-w-max h-full">
        {roundNumbers.map((roundNum, index) => {
          const isFinal = index === roundNumbers.length - 1;
          const roundMatches = rounds[roundNum];

          return (
            <div key={roundNum} className="flex flex-col w-72 relative">
              <h4 className="text-center text-[10px] font-black text-emerald-900/40 uppercase tracking-widest mb-2 shrink-0 h-4">
                {isFinal ? 'Final' : `Rodada ${roundNum}`}
              </h4>

              <div className="flex flex-col flex-1">
                {roundMatches.map(match => (
                  <div key={match.id} className="relative flex-1 flex flex-col justify-center px-6 py-4">
                    {/* Conector de entrada (Exceto primeira rodada) */}
                    {index > 0 && (
                      <div className="absolute left-0 top-1/2 w-6 border-b-2 border-emerald-300"></div>
                    )}

                    {/* Conectores de saída e vertical (Exceto final) */}
                    {!isFinal && (
                      <>
                        <div className="absolute right-0 top-1/2 w-6 border-b-2 border-emerald-300"></div>
                        {match.position % 2 === 0 ? (
                          <div className="absolute right-0 top-1/2 w-0.5 bg-emerald-300 h-[50%]"></div>
                        ) : (
                          <div className="absolute right-0 bottom-1/2 w-0.5 bg-emerald-300 h-[50%]"></div>
                        )}
                      </>
                    )}

                    {/* Card da Partida */}
                    <div className={`bg-white rounded-2xl border ${match.status === 'IN_PROGRESS' ? 'border-[#009660] shadow-md' : 'border-emerald-100'} p-3 z-10 relative transition-transform hover:scale-105 shadow-sm h-[120px] flex flex-col justify-center`}>

                      {/* Jogador 1 */}
                      <div className={`flex justify-between items-center p-2 rounded-xl mb-1 ${match.winnerId === match.player1Id ? 'bg-emerald-50 text-[#009660] font-black' : 'text-emerald-900 font-medium'} text-xs`}>
                        <span className="truncate pr-2">{match.player1Name || 'A definir'}</span>
                        <span className="font-black text-[10px]">{match.score1 ?? '-'}</span>
                      </div>

                      {/* Jogador 2 */}
                      <div className={`flex justify-between items-center p-2 rounded-xl ${match.winnerId === match.player2Id ? 'bg-emerald-50 text-[#009660] font-black' : 'text-emerald-900 font-medium'} text-xs`}>
                        <span className="truncate pr-2">{match.player2Name || 'A definir'}</span>
                        <span className="font-black text-[10px]">{match.score2 ?? '-'}</span>
                      </div>

                      {/* Ações da Partida */}
                      {match.status === 'PENDING' && match.player1Id && match.player2Id && tournament.status === 'IN_PROGRESS' && (
                        <div className="mt-3 pt-3 border-t border-emerald-50">
                          {isUserInMatch(match) ? (
                            <button
                              onClick={() => handleEnterRoom(match)}
                              className="w-full bg-[#FFCE00] text-emerald-900 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#e6ba00] transition-colors"
                            >
                              Entrar na Sala
                            </button>
                          ) : (
                            <div className="text-center text-[9px] font-black text-emerald-900/40 uppercase tracking-widest py-1">
                              Aguardando
                            </div>
                          )}
                        </div>
                      )}

                      {match.status === 'FINISHED' && (
                        <div className="mt-2 text-center text-[9px] font-black text-[#009660] uppercase tracking-widest">
                          Finalizada
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TournamentBracket;
