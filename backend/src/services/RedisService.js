const { createClient } = require('redis');

class RedisService {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    // Fallback storage when Redis is offline
    this.localStore = new Map();
    this.isUsingRedis = false;
    this.connecting = null;

    this.client.on('error', (err) => {
      if (this.isUsingRedis) {
        console.warn('⚠️ Redis Error:', err.message);
      } else {
        // Silently handle connection errors during initial phase
      }
    });
  }

  async connect() {
    if (this.isUsingRedis) return true;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      try {
        // timeout after 2 seconds
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
        );
        
        await Promise.race([this.client.connect(), timeout]);
        
        this.isUsingRedis = true;
        this.connecting = null;
        console.log('✅ Conectado ao Redis com sucesso');
        return true;
      } catch (err) {
        console.warn('📂 Redis não disponível ou timeout. Usando armazenamento em memória local.');
        this.isUsingRedis = false;
        this.connecting = null;
        return false;
      }
    })();

    return this.connecting;
  }

  async setRoom(roomId, data) {
    const connected = await this.connect();
    if (connected && this.isUsingRedis) {
      try {
        await this.client.set(`room:${roomId}`, JSON.stringify(data), {
          EX: 3600 * 24 // 24 hours expiry
        });
        return;
      } catch (e) {
        this.isUsingRedis = false;
      }
    }
    this.localStore.set(roomId, data);
  }

  async getRoom(roomId) {
    const connected = await this.connect();
    if (connected && this.isUsingRedis) {
      try {
        const data = await this.client.get(`room:${roomId}`);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        this.isUsingRedis = false;
      }
    }
    return this.localStore.get(roomId) || null;
  }

  async deleteRoom(roomId) {
    const connected = await this.connect();
    if (connected && this.isUsingRedis) {
      try {
        await this.client.del(`room:${roomId}`);
        return;
      } catch (e) {
        this.isUsingRedis = false;
      }
    }
    this.localStore.delete(roomId);
  }

  async getAllRooms() {
    const connected = await this.connect();
    if (connected && this.isUsingRedis) {
      try {
        const keys = await this.client.keys('room:*');
        const rooms = {};
        for (const key of keys) {
          const roomId = key.split(':')[1];
          rooms[roomId] = await this.getRoom(roomId);
        }
        return rooms;
      } catch (e) {
        this.isUsingRedis = false;
      }
    }
    
    // Return from local store
    const rooms = {};
    this.localStore.forEach((val, key) => {
      rooms[key] = val;
    });
    return rooms;
  }
}

module.exports = new RedisService();
