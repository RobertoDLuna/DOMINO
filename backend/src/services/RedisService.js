const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisService {
  constructor() {
    const config = {
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          // Estratégia silenciosa: tenta a cada 10s sem poluir o console após a 1ª falha
          return 10000;
        },
        connectTimeout: 5000
      },
      disableOfflineQueue: true // CRÍTICO: Não trava o código se o Redis estiver offline
    };

    this.client = createClient(config);
    this.pubClient = createClient(config);
    this.subClient = this.pubClient.duplicate();
    
    this.localStore = new Map();
    this.isUsingRedis = false;
    this.hasWarned = false;

    // Listeners silenciados
    this.client.on('error', () => { this.isUsingRedis = false; });
    this.client.on('connect', () => {
      console.log('✅ Sincronização em Nuvem (Redis) Ativada');
      this.isUsingRedis = true;
    });

    // Tenta conectar em background - NÃO trava o servidor
    this.client.connect().catch(() => {
        if(!this.hasWarned) {
            console.log('💡 Dica: Redis não detectado. Usando armazenamento local (Modo Desenvolvimento).');
            this.hasWarned = true;
        }
    });
  }

  // Métodos rápidos com fallback instantâneo
  async setRoom(roomId, data) {
    if (this.isUsingRedis && this.client.isReady) {
      try {
        await this.client.set(`room:${roomId}`, JSON.stringify(data), { EX: 86400 });
        return;
      } catch (e) { this.isUsingRedis = false; }
    }
    this.localStore.set(roomId, data);
  }

  async getRoom(roomId) {
    if (this.isUsingRedis && this.client.isReady) {
      try {
        const data = await this.client.get(`room:${roomId}`);
        return data ? JSON.parse(data) : null;
      } catch (e) { this.isUsingRedis = false; }
    }
    return this.localStore.get(roomId) || null;
  }

  async deleteRoom(roomId) {
    if (this.isUsingRedis && this.client.isReady) {
      try {
        await this.client.del(`room:${roomId}`);
        return;
      } catch (e) { this.isUsingRedis = false; }
    }
    this.localStore.delete(roomId);
  }

  async getAllRooms() {
    if (this.isUsingRedis && this.client.isReady) {
      try {
        const keys = await this.client.keys('room:*');
        const rooms = {};
        for (const key of keys) {
          const id = key.split(':')[1];
          rooms[id] = await this.getRoom(id);
        }
        return rooms;
      } catch (e) { this.isUsingRedis = false; }
    }
    const rooms = {};
    this.localStore.forEach((v, k) => { rooms[k] = v; });
    return rooms;
  }
}

module.exports = new RedisService();
