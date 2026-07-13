require('dotenv').config();
const { getPrisma } = require('../shared/config/prismaClient');
const TournamentService = require('../modules/tournament/TournamentService');
const fs = require('fs');
const path = require('path');

const prisma = getPrisma();
const tService = TournamentService;

async function simulateTournament(size, adminUser, users) {
  console.log(`\n==============================================`);
  console.log(`🚀 INICIANDO SIMULAÇÃO DE CAMPEONATO: ${size} JOGADORES`);
  console.log(`==============================================\n`);

  // 1. Criar campeonato
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 1); // Amanhã, para não falhar na validação
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + 5);

  const tData = {
    name: `Campeonato Simulação ${size} Players`,
    description: `Campeonato gerado automaticamente via script de teste.`,
    gameType: 'CHESS',
    format: 'ELIMINATION',
    maxPlayers: size,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };

  console.log(`[1] Criando torneio...`);
  const tournament = await tService.createTournament(tData, adminUser.id);
  console.log(`   ✅ Torneio criado: ${tournament.id}`);

  // 2. Inscrever jogadores
  console.log(`[2] Inscrevendo ${size} jogadores...`);
  for (let i = 0; i < size; i++) {
    await tService.joinTournament(tournament.id, users[i]);
  }
  console.log(`   ✅ Jogadores inscritos.`);

  // 3. Modificar data de início no banco para agora, permitindo iniciar
  console.log(`[3] Atualizando datas para permitir início...`);
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { startsAt: new Date(Date.now() - 1000 * 60 * 60) } // Começou há 1 hora
  });
  
  // 4. Iniciar campeonato
  console.log(`[4] Iniciando campeonato (Gerando Chaveamento)...`);
  await tService.startTournament(tournament.id, adminUser.id, adminUser.role);
  console.log(`   ✅ Campeonato iniciado. Status: IN_PROGRESS`);

  // 5. Simular partidas rodada a rodada
  let tournamentState = await tService.getTournamentById(tournament.id);
  let roundNum = 1;
  let reportLines = [];

  reportLines.push(`## Simulação: Campeonato de ${size} Jogadores`);
  reportLines.push(`**ID:** ${tournament.id}`);
  reportLines.push(`**Status Inicial:** IN_PROGRESS`);
  reportLines.push(``);

  while (tournamentState.status === 'IN_PROGRESS') {
    console.log(`\n--- Simulação: Rodada Atual ---`);
    const pendingMatches = tournamentState.matches.filter(m => m.status === 'PENDING' && m.player1Id && m.player2Id);
    
    if (pendingMatches.length === 0) {
      console.log(`[!] Nenhuma partida PENDING com ambos os jogadores. Checando se precisa finalizar torneio...`);
      // Verifica se finalizou (o sistema normal já deveria finalizar no registerMatchResult)
      tournamentState = await tService.getTournamentById(tournament.id);
      if (tournamentState.status === 'IN_PROGRESS') {
        console.log(`[!] Ocorreu um problema e o campeonato travou em IN_PROGRESS.`);
        break;
      }
    }

    reportLines.push(`### Matches Resolvidas`);
    for (const match of pendingMatches) {
      // Pick random winner
      const p1Wins = Math.random() > 0.5;
      const winnerId = p1Wins ? match.player1Id : match.player2Id;
      const winnerName = p1Wins ? match.player1Name : match.player2Name;
      const loserName = p1Wins ? match.player2Name : match.player1Name;

      console.log(`   🥊 ${match.player1Name} vs ${match.player2Name} -> Vencedor: ${winnerName}`);
      reportLines.push(`- **Rodada ${match.round}** - Posição ${match.position}: ${match.player1Name} vs ${match.player2Name} 🏆 **Vencedor: ${winnerName}**`);

      await tService.registerMatchResult(tournament.id, match.id, {
        score1: p1Wins ? 1 : 0,
        score2: p1Wins ? 0 : 1,
        winnerId: winnerId
      }, adminUser.id, adminUser.role);
    }
    reportLines.push(``);

    // Refresh state
    tournamentState = await tService.getTournamentById(tournament.id);
  }

  console.log(`\n[+] Torneio Finalizado! Status final: ${tournamentState.status}`);
  
  const finalMatch = tournamentState.matches.find(m => m.status === 'FINISHED' && !tournamentState.matches.some(m2 => m2.round > m.round));
  console.log(`   🏆 CAMPEÃO FINAL: ${finalMatch ? (finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player1Name : finalMatch.player2Name) : 'Desconhecido'}`);
  
  reportLines.push(`### Resultado Final`);
  reportLines.push(`- **Status Final:** ${tournamentState.status}`);
  if (finalMatch) {
    const champ = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player1Name : finalMatch.player2Name;
    reportLines.push(`- 🏆 **GRANDE CAMPEÃO:** ${champ}`);
  }
  reportLines.push(`\n---\n`);
  
  return reportLines.join('\n');
}

async function runTest() {
  try {
    console.log('--- PREPARANDO BANCO E USUÁRIOS FAKE ---');
    
    // Create admin user
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          fullName: "Admin Test",
          email: "admin_test_tourney@example.com",
          password: "123",
          role: "ADMIN"
        }
      });
    }

    // Ensure we have 16 users for the max simulation
    let users = await prisma.user.findMany({ take: 30 });
    let playerUsers = users.filter(u => u.id !== adminUser.id);
    if (playerUsers.length < 16) {
      const needed = 16 - playerUsers.length;
      console.log(`Criando ${needed} usuários fake...`);
      for (let i = 0; i < needed; i++) {
        const u = await prisma.user.create({
          data: {
            fullName: `Jogador Ficticio ${Date.now()}_${i}`,
            email: `jogador_${Date.now()}_${i}@example.com`,
            password: "123",
            role: "ALUNO"
          }
        });
        playerUsers.push(u);
      }
    }

    let fullReport = `# Relatório de Teste: Sistema de Campeonatos\n\nEste documento contém os resultados dos testes automatizados simulando campeonatos do início ao fim.\n\n`;

    const report4 = await simulateTournament(4, adminUser, playerUsers.slice(0, 4));
    fullReport += report4;

    const report8 = await simulateTournament(8, adminUser, playerUsers.slice(0, 8));
    fullReport += report8;

    const report16 = await simulateTournament(16, adminUser, playerUsers.slice(0, 16));
    fullReport += report16;

    console.log(`\n✅ TESTES CONCLUÍDOS. GERANDO RELATÓRIO...`);
    const reportPath = path.join(__dirname, 'tournament_test_report.md');
    
    fs.writeFileSync(reportPath, fullReport);
    console.log(`Relatório salvo em: ${reportPath}`);

  } catch (err) {
    console.error("ERRO NO TESTE:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
