/**
 * RedisService - Simulado em Memória Local para Máxima Estabilidade
 * (Revertido para modo leve conforme pedido do usuário)
 */
class RedisService {
  constructor() {
    this.localStore = new Map();
    this.isUsingRedis = false;
    console.log('📦 Gerenciador de Salas: Modo Memória Local (Ativo)');
  }

  // Métodos simulados para manter compatibilidade com o resto do código
  async connect() { return true; }

  async setRoom(roomId, data) {
    this.localStore.set(roomId, data);
  }

  async getRoom(roomId) {
    return this.localStore.get(roomId) || null;
  }

  async deleteRoom(roomId) {
    this.localStore.delete(roomId);
  }

  async getAllRooms() {
    const rooms = {};
    this.localStore.forEach((val, key) => {
      rooms[key] = val;
    });
    return rooms;
  }
}

module.exports = new RedisService();
