

// Mocks manuais precisam vir antes do require
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn().mockRejectedValue(new Error('Simulated disconnect')), // Para cair no localStore
    duplicate: vi.fn().mockReturnThis(),
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    isReady: false
  }))
}));

const RedisService = require('./RedisService');

describe('RedisService (Fallback Mode)', () => {
  beforeEach(() => {
    RedisService.localStore.clear();
    RedisService.isUsingRedis = false;
  });

  it('deve usar o localStore quando o Redis falha ao conectar', async () => {
    await RedisService.setRoom('123', { name: 'Domino Room' });
    
    expect(RedisService.localStore.has('123')).toBe(true);
    
    const room = await RedisService.getRoom('123');
    expect(room).toEqual({ name: 'Domino Room' });
  });

  it('deve deletar uma sala corretamente no localStore', async () => {
    await RedisService.setRoom('456', { name: 'Chess Room' });
    await RedisService.deleteRoom('456');
    
    expect(RedisService.localStore.has('456')).toBe(false);
    
    const room = await RedisService.getRoom('456');
    expect(room).toBeNull();
  });

  it('deve listar todas as salas no localStore', async () => {
    await RedisService.setRoom('101', { name: 'Room 1' });
    await RedisService.setRoom('102', { name: 'Room 2' });
    
    const rooms = await RedisService.getAllRooms();
    expect(Object.keys(rooms).length).toBe(2);
    expect(rooms['101'].name).toBe('Room 1');
  });
});
