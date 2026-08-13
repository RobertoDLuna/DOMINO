import { describe, it, expect, vi, beforeEach } from 'vitest';
const prismaClient = require('../../shared/config/prismaClient');
const getPrismaSpy = vi.spyOn(prismaClient, 'getPrisma');

const MemoryService = require('./MemoryService');

describe('MemoryService', () => {
  let prismaMock;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock = {
      memoryGame: { create: vi.fn().mockResolvedValue({ id: 'game-1' }) },
      memoryRanking: { 
        upsert: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue({ bestScore: 500 }),
        update: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    getPrismaSpy.mockReturnValue(prismaMock);
  });

  describe('finishGame scoring logic', () => {
    const user = { id: 'u1', fullName: 'Test User', schoolId: 1, school: { name: 'School 1' } };

    it('deve calcular a pontuação corretamente para uma partida perfeita (6 pares, 0 erros, combo max)', async () => {
      const payload = {
        themeId: 't1',
        totalPairs: 6,
        pairsFound: 6,
        errors: 0,
        consecutiveErrors: 0,
        maxCombo: 6,
        timeSpentSecs: 30
      };

      await MemoryService.finishGame(user, payload);
      
      // Base: 6 * 100 = 600
      // Multiplier: maxCombo 6 -> 2.0
      // Final: 1200
      expect(prismaMock.memoryGame.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          finalScore: 1200
        })
      }));
    });

    it('deve aplicar penalidades por erros e erros consecutivos', async () => {
      const payload = {
        themeId: 't1',
        totalPairs: 6,
        pairsFound: 6,
        errors: 5,
        consecutiveErrors: 4, // 2 erros além da tolerância de 2
        maxCombo: 2,
        timeSpentSecs: 60
      };

      await MemoryService.finishGame(user, payload);
      
      // Base: 6 * 100 = 600
      // Penalty: 5 * 10 = 50 -> 550
      // Consecutive Penalty (4 > 2 => 2 * 20 = 40) -> 510
      // Multiplier: maxCombo 2 -> 1.2
      // Final: Math.floor(510 * 1.2) = 612
      expect(prismaMock.memoryGame.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          finalScore: 612
        })
      }));
    });

    it('deve garantir a pontuação mínima de 50 pontos para participação', async () => {
      const payload = {
        themeId: 't1',
        totalPairs: 6,
        pairsFound: 6,
        errors: 60, // muitos erros
        consecutiveErrors: 10,
        maxCombo: 1,
        timeSpentSecs: 120
      };

      await MemoryService.finishGame(user, payload);
      
      // Base Score iria para negativo, mas a pontuação mínima deve ser 50
      expect(prismaMock.memoryGame.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          finalScore: 50
        })
      }));
    });

    it('deve retornar 0 pontos se não encontrou nenhum par (abandono total)', async () => {
      const payload = {
        themeId: 't1',
        totalPairs: 6,
        pairsFound: 0,
        errors: 2,
        consecutiveErrors: 2,
        maxCombo: 0,
        timeSpentSecs: 10
      };

      await MemoryService.finishGame(user, payload);
      
      expect(prismaMock.memoryGame.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          finalScore: 0
        })
      }));
    });

    it('não deve atualizar o ranking se for um usuário anônimo (guest)', async () => {
      const payload = {
        themeId: 't1',
        totalPairs: 6,
        pairsFound: 6,
        errors: 0,
        consecutiveErrors: 0,
        maxCombo: 2
      };

      await MemoryService.finishGame(null, payload);
      
      expect(prismaMock.memoryRanking.upsert).not.toHaveBeenCalled();
    });
  });
});
