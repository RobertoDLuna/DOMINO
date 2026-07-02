const { getPrisma } = require('../../shared/config/prismaClient');

class TournamentRankingService {
  async getRanking(limit = 50) {
    const prisma = getPrisma();
    return await prisma.tournamentRanking.findMany({
      orderBy: [
        { totalPoints: 'desc' },
        { championships: 'desc' },
        { podiums: 'desc' }
      ],
      take: limit
    });
  }

  // Isso seria chamado após a finalização de um campeonato
  async updateRankingForTournament(tournamentId) {
    const prisma = getPrisma();
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: { user: { select: { id: true, fullName: true, schoolId: true, school: { select: { name: true } } } } }
    });

    for (const p of participants) {
      if (!p.finalPosition && !p.points) continue; // Ignorar quem não pontuou
      
      const isChampion = p.finalPosition === 1 ? 1 : 0;
      const isPodium = p.finalPosition && p.finalPosition <= 3 ? 1 : 0;
      
      // Calculate points if not directly set
      let earnedPoints = p.points || 0;
      if (p.finalPosition) {
         if (p.finalPosition === 1) earnedPoints = 10;
         else if (p.finalPosition === 2) earnedPoints = 7;
         else if (p.finalPosition === 3) earnedPoints = 5;
         else if (p.finalPosition === 4) earnedPoints = 3;
         else earnedPoints = 1;
      } else if (earnedPoints === 0) {
         earnedPoints = 1; // Participação
      }

      await prisma.tournamentRanking.upsert({
        where: { userId: p.userId },
        update: {
          championships: { increment: isChampion },
          podiums: { increment: isPodium },
          totalPoints: { increment: earnedPoints },
          participated: { increment: 1 },
          userName: p.user.fullName,
          schoolId: p.user.schoolId,
          schoolName: p.user.school?.name
        },
        create: {
          userId: p.userId,
          userName: p.user.fullName,
          schoolId: p.user.schoolId,
          schoolName: p.user.school?.name,
          championships: isChampion,
          podiums: isPodium,
          totalPoints: earnedPoints,
          participated: 1
        }
      });
    }
  }
}

module.exports = new TournamentRankingService();
