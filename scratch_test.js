const { io } = require('socket.io-client');

async function runTest() {
  console.log('Iniciando teste de reconexão do Socket do Xadrez...');
  const url = 'http://localhost:3001/chess';
  
  const p1_userId = 'test_p1_' + Math.floor(Math.random() * 1000);
  const p1_userName = 'Player 1 Test';
  
  const p2_userId = 'test_p2_' + Math.floor(Math.random() * 1000);
  const p2_userName = 'Player 2 Test';

  console.log(`[P1] Conectando...`);
  let socketA = io(url, { transports: ['websocket'] });
  let roomCode = null;

  await new Promise((resolve) => {
    socketA.on('connect', () => {
      console.log(`[P1] Conectado! (ID: ${socketA.id})`);
      resolve();
    });
  });

  console.log(`[P1] Criando sala de xadrez...`);
  socketA.emit('create-chess-room', {
    userId: p1_userId,
    userName: p1_userName,
    aiLevel: 5,
    timeLimit: 600,
  });

  await new Promise((resolve) => {
    socketA.on('chess-room-created', (data) => {
      roomCode = data.roomCode;
      console.log(`[P1] Sala criada: ${roomCode}`);
      resolve();
    });
  });

  console.log(`[P1] Desconectando para simular F5 (Atualização de página)...`);
  socketA.disconnect();
  
  await new Promise(r => setTimeout(r, 2000)); // Aguarda 2 segundos

  console.log(`[P1] Reconectando (novo socket id)...`);
  let socketA_reconnect = io(url, { transports: ['websocket'] });

  await new Promise((resolve) => {
    socketA_reconnect.on('connect', () => {
      console.log(`[P1] Reconectado com sucesso! (ID: ${socketA_reconnect.id})`);
      resolve();
    });
  });

  console.log(`[P1] Tentando reentrar na sala ${roomCode}...`);
  socketA_reconnect.emit('join-chess-room', {
    roomCode: roomCode,
    userId: p1_userId,
    userName: p1_userName
  });

  let joinedSuccessfully = false;
  socketA_reconnect.on('chess-room-joined', (data) => {
    console.log(`[P1] EVENTO RECEBIDO: chess-room-joined! Reconexão bem sucedida.`, data);
    joinedSuccessfully = true;
  });

  socketA_reconnect.on('chess-error', (data) => {
    console.error(`[P1] ERRO RECEBIDO:`, data);
  });

  await new Promise(r => setTimeout(r, 1000));

  if (!joinedSuccessfully) {
    console.error(`[!] Falha ao reconectar P1. O evento 'chess-room-joined' não foi disparado.`);
    process.exit(1);
  }

  console.log(`\n[P2] Conectando adversário...`);
  let socketB = io(url, { transports: ['websocket'] });
  await new Promise((resolve) => {
    socketB.on('connect', () => {
      console.log(`[P2] Conectado! (ID: ${socketB.id})`);
      resolve();
    });
  });

  console.log(`[P2] Entrando na sala ${roomCode}...`);
  socketB.emit('join-chess-room', {
    roomCode: roomCode,
    userId: p2_userId,
    userName: p2_userName
  });

  let p2_joined = false;
  socketB.on('chess-room-joined', (data) => {
    console.log(`[P2] EVENTO RECEBIDO: chess-room-joined! Adversário entrou na sala.`);
    p2_joined = true;
  });

  let p1_gameReady = false;
  socketA_reconnect.on('chess-game-ready', (data) => {
    console.log(`[P1] EVENTO RECEBIDO: chess-game-ready! O jogo começou.`);
    p1_gameReady = true;
  });

  await new Promise(r => setTimeout(r, 1000));

  if (p2_joined && p1_gameReady) {
    console.log(`\n✅ TESTE DE PONTA A PONTA CONCLUÍDO COM SUCESSO!`);
    console.log(`O estado do socket foi perfeitamente mantido durante a atualização da página (F5). A sala não foi destruída precocemente.`);
  } else {
    console.error(`\n❌ FALHA NO TESTE!`);
    if (!p2_joined) console.error(`- P2 não conseguiu entrar.`);
    if (!p1_gameReady) console.error(`- P1 não recebeu chess-game-ready.`);
    process.exit(1);
  }

  socketA_reconnect.disconnect();
  socketB.disconnect();
  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
