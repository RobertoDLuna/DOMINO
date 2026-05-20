const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const RedisService = require("../utils/RedisService");

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173", 
      methods: ["GET", "POST"],
      credentials: true
    },
  });

  // Ativa Sincronização em Nuvem (Redis) se disponível
  (async () => {
    try {
      // Tenta conectar os clientes de Pub/Sub
      const setupAdapter = Promise.all([
        RedisService.pubClient.connect(),
        RedisService.subClient.connect()
      ]);

      // Se não conectar em 2s (limite para local), desiste do adaptador
      const timeout = new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000));

      await Promise.race([setupAdapter, timeout]);
      
      io.adapter(createAdapter(RedisService.pubClient, RedisService.subClient));
      console.log("📡 Sincronização Multi-Instância: Ativada");
    } catch (err) {
      // Falha silenciosa para desenvolvimento local
    }
  })();

  return io;
};

module.exports = setupSocket;
