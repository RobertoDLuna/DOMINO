const { getPrisma } = require('../../shared/config/prismaClient');

class TournamentService {
  async getTournaments(filters = {}) {
    const prisma = getPrisma();
    const where = {};
    if (filters.status) {
      if (filters.status.includes(',')) {
        where.status = { in: filters.status.split(',') };
      } else {
        where.status = filters.status;
      }
    }
    if (filters.gameType) where.gameType = filters.gameType;

    return await prisma.tournament.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, fullName: true, school: { select: { name: true } } }
        },
        _count: {
          select: { participants: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTournamentById(id) {
    const prisma = getPrisma();
    return await prisma.tournament.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, school: { select: { name: true } } }
        },
        participants: {
          orderBy: { createdAt: 'asc' }
        },
        matches: {
          orderBy: [
            { round: 'asc' },
            { position: 'asc' }
          ]
        }
      }
    });
  }

  async createTournament(data, userId) {
    const prisma = getPrisma();
    // Validate if maxPlayers is even
    if (data.maxPlayers % 2 !== 0) {
      throw new Error("O número de participantes deve ser um número par.");
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startDate = new Date(data.startsAt);
    if (startDate < today) {
      throw new Error("A data de início do campeonato não pode ser no passado.");
    }

    return await prisma.tournament.create({
      data: {
        name: data.name,
        description: data.description,
        gameType: data.gameType,
        format: data.format,
        maxPlayers: data.maxPlayers,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        createdById: userId,
        status: 'OPEN'
      }
    });
  }

  async updateTournament(id, data, userId, userRole) {
    const prisma = getPrisma();
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { _count: { select: { participants: true } } }
    });
    if (!tournament) throw new Error("Campeonato não encontrado.");

    if (tournament.createdById !== userId && userRole !== 'ADMIN') {
      throw new Error("Apenas o criador ou um administrador pode editar este campeonato.");
    }

    if (data.maxPlayers) {
      if (data.maxPlayers % 2 !== 0) {
        throw new Error("O número de participantes deve ser um número par.");
      }
      if (data.maxPlayers < tournament._count.participants) {
        throw new Error("O número de participantes não pode ser menor que a quantidade já inscrita.");
      }
    }

    if (data.startsAt && data.endsAt) {
      if (new Date(data.startsAt) > new Date(data.endsAt)) {
        throw new Error("A data de encerramento não pode ser anterior à data de início.");
      }
    }

    if (data.startsAt) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const startDate = new Date(data.startsAt);
      if (startDate < today) {
        throw new Error("A data de início do campeonato não pode ser no passado.");
      }
    }

    return await prisma.tournament.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        gameType: data.gameType,
        format: data.format,
        maxPlayers: data.maxPlayers,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      }
    });
  }

  async deleteTournament(id, userId, userRole) {
    const prisma = getPrisma();
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new Error("Campeonato não encontrado.");

    if (tournament.createdById !== userId && userRole !== 'ADMIN') {
      throw new Error("Apenas o criador ou um administrador pode excluir este campeonato.");
    }

    await prisma.tournament.delete({ where: { id } });
    return true;
  }

  async joinTournament(id, user) {
    const prisma = getPrisma();
    
    return await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id },
        include: { _count: { select: { participants: true } } }
      });

      if (!tournament) throw new Error("Campeonato não encontrado.");
      if (tournament.status !== 'OPEN') throw new Error("Inscrições encerradas.");
      if (tournament._count.participants >= tournament.maxPlayers) {
        throw new Error("Campeonato lotado.");
      }

      const existing = await tx.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: { tournamentId: id, userId: user.id }
        }
      });

      if (existing) throw new Error("Você já está inscrito neste campeonato.");

      let schoolName = null;
      let userName = "Jogador Desconhecido";
      
      const dbUser = await tx.user.findUnique({ where: { id: user.id }, include: { school: true } });
      if (dbUser) {
        userName = dbUser.fullName;
        if (dbUser.school) {
          schoolName = dbUser.school.name;
        }
      }

      return await tx.tournamentParticipant.create({
        data: {
          tournamentId: id,
          userId: user.id,
          userName: userName,
          schoolName
        }
      });
    });
  }

  async leaveTournament(id, userId) {
    const prisma = getPrisma();
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new Error("Campeonato não encontrado.");
    if (tournament.status !== 'OPEN') throw new Error("Não é possível sair após o início do campeonato.");

    await prisma.tournamentParticipant.delete({
      where: {
        tournamentId_userId: { tournamentId: id, userId }
      }
    });

    return true;
  }

  async startTournament(id, userId, userRole) {
    const prisma = getPrisma();

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!tournament) throw new Error("Campeonato não encontrado.");
    if (tournament.createdById !== userId && userRole !== 'ADMIN') {
      throw new Error("Apenas o criador pode iniciar o campeonato.");
    }
    if (tournament.status !== 'OPEN') throw new Error("O campeonato já foi iniciado ou encerrado.");

    const participants = [...tournament.participants];
    // Shuffle aleatório
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }

    if (tournament.format === 'ELIMINATION') {
      await this.generateEliminationBracket(prisma, id, participants);
    } else {
      await this.generateRoundRobin(prisma, id, participants);
    }

    await prisma.tournament.update({
      where: { id },
      data: { status: 'IN_PROGRESS' }
    });

    return true;
  }

  async generateEliminationBracket(prisma, tournamentId, participants) {
    // Basic power of 2 bracket. If participants < power of 2, some get byes.
    // For simplicity, we assume we generate matches for the first round.
    // E.g., if 8 participants, 4 matches. If 7, 1 bye.
    
    // Nearest power of 2 >= length
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length || 2)));
    const byes = bracketSize - participants.length;

    let nextPos = 0;
    const matches = [];

    // Rodada 1
    for (let i = 0; i < bracketSize / 2; i++) {
      const p1 = participants[i * 2] || null;
      const p2 = participants[i * 2 + 1] || null;
      
      let winnerId = null;
      let status = 'PENDING';
      
      // se houver bye, avança p1 automaticamente
      if (p1 && !p2) {
        winnerId = p1.userId;
        status = 'FINISHED';
      }

      matches.push({
        tournamentId,
        round: 1,
        position: i,
        player1Id: p1?.userId || null,
        player1Name: p1?.userName || null,
        player2Id: p2?.userId || null,
        player2Name: p2?.userName || null,
        winnerId,
        status,
        gameRoomCode: status === 'PENDING' && p1 && p2 ? `T-${tournamentId.substring(0,4)}-R1-M${i}` : null
      });
    }

    // Outras rodadas em branco
    let currentSize = bracketSize / 2;
    let round = 2;
    while (currentSize > 1) {
      currentSize = currentSize / 2;
      for (let i = 0; i < currentSize; i++) {
        matches.push({
          tournamentId,
          round,
          position: i,
          status: 'PENDING'
        });
      }
      round++;
    }

    await prisma.tournamentMatch.createMany({ data: matches });

    // Avançar bye se existir
    const r1Matches = matches.filter(m => m.round === 1 && m.status === 'FINISHED');
    for (const m of r1Matches) {
      await this.advanceWinner(prisma, tournamentId, 1, m.position, m.winnerId, m.player1Name);
    }
  }

  async generateRoundRobin(prisma, tournamentId, participants) {
    const matches = [];
    let roundCount = participants.length - 1;
    let numMatches = participants.length / 2;
    
    const teamArray = [...participants];
    if (teamArray.length % 2 !== 0) {
      teamArray.push(null); // bye
      roundCount = teamArray.length - 1;
      numMatches = teamArray.length / 2;
    }

    for (let round = 1; round <= roundCount; round++) {
      for (let i = 0; i < numMatches; i++) {
        const home = teamArray[i];
        const away = teamArray[teamArray.length - 1 - i];

        if (home !== null && away !== null) {
          matches.push({
            tournamentId,
            round,
            position: i,
            player1Id: home.userId,
            player1Name: home.userName,
            player2Id: away.userId,
            player2Name: away.userName,
            status: 'PENDING',
            gameRoomCode: `T-${tournamentId.substring(0,4)}-R${round}-M${i}`
          });
        }
      }
      // rotate (keep first element fixed)
      teamArray.splice(1, 0, teamArray.pop());
    }

    await prisma.tournamentMatch.createMany({ data: matches });
  }

  async registerMatchResult(tournamentId, matchId, resultData, userId, userRole) {
    const prisma = getPrisma();
    
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new Error("Campeonato não encontrado.");
    
    if (tournament.createdById !== userId && userRole !== 'ADMIN') {
      throw new Error("Apenas o organizador pode registrar o resultado.");
    }

    const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
    if (!match) throw new Error("Partida não encontrada.");
    
    await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        score1: resultData.score1,
        score2: resultData.score2,
        winnerId: resultData.winnerId,
        status: 'FINISHED'
      }
    });

    if (tournament.format === 'ELIMINATION' && resultData.winnerId) {
       const winnerName = resultData.winnerId === match.player1Id ? match.player1Name : match.player2Name;
       await this.advanceWinner(prisma, tournamentId, match.round, match.position, resultData.winnerId, winnerName);
    }
    
    await this.checkTournamentCompletion(prisma, tournamentId);

    return true;
  }

  async autoRegisterMatchByRoomCode(gameRoomCode, resultData) {
    const prisma = getPrisma();
    
    const match = await prisma.tournamentMatch.findFirst({
      where: { gameRoomCode },
      include: { tournament: true }
    });
    
    if (!match) return false;

    // Se a partida já estiver finalizada, ignorar
    if (match.status === 'FINISHED') return true;

    const score1 = resultData.winnerId === match.player1Id ? 1 : 0;
    const score2 = resultData.winnerId === match.player2Id ? 1 : 0;

    await prisma.tournamentMatch.update({
      where: { id: match.id },
      data: {
        score1,
        score2,
        winnerId: resultData.winnerId,
        status: 'FINISHED'
      }
    });

    if (match.tournament.format === 'ELIMINATION' && resultData.winnerId) {
       const winnerName = resultData.winnerId === match.player1Id ? match.player1Name : match.player2Name;
       await this.advanceWinner(prisma, match.tournamentId, match.round, match.position, resultData.winnerId, winnerName);
    }
    
    await this.checkTournamentCompletion(prisma, match.tournamentId);

    return true;
  }

  async advanceWinner(prisma, tournamentId, round, position, winnerId, winnerName) {
    const nextRound = round + 1;
    const nextPosition = Math.floor(position / 2);
    
    const nextMatch = await prisma.tournamentMatch.findFirst({
      where: { tournamentId, round: nextRound, position: nextPosition }
    });

    if (!nextMatch) return; // Final já concluída

    const isPlayer1 = position % 2 === 0;
    
    const dataToUpdate = isPlayer1 
      ? { player1Id: winnerId, player1Name: winnerName }
      : { player2Id: winnerId, player2Name: winnerName };
      
    // Set room code if both players are present
    if ((isPlayer1 && nextMatch.player2Id) || (!isPlayer1 && nextMatch.player1Id)) {
        dataToUpdate.gameRoomCode = `T-${tournamentId.substring(0,4)}-R${nextRound}-M${nextPosition}`;
    }

    await prisma.tournamentMatch.update({
      where: { id: nextMatch.id },
      data: dataToUpdate
    });
  }
  
  async checkTournamentCompletion(prisma, tournamentId) {
    const pendingMatches = await prisma.tournamentMatch.count({
      where: { tournamentId, status: { not: 'FINISHED' } }
    });
    
    if (pendingMatches === 0) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: 'FINISHED' }
      });
      // Here we could trigger a ranking update via TournamentRankingService
    }
  }
}

module.exports = new TournamentService();
