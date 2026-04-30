import { describe, it, expect, vi, beforeEach } from 'vitest';

// Importamos o módulo de configuração do Prisma
const prismaClient = require('../../shared/config/prismaClient');
// Criamos um espião (spy) na função getPrisma
const getPrismaSpy = vi.spyOn(prismaClient, 'getPrisma');

// Agora importamos o serviço que será testado
const RankingService = require('./RankingService');

describe('RankingService', () => {
  let prismaMock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Criamos um objeto mock completo para o Prisma
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      gameMatch: {
        create: vi.fn(),
        groupBy: vi.fn(),
      },
      theme: {
        findUnique: vi.fn(),
      },
    };

    // Fazemos o espião retornar nosso mock em cada chamada
    getPrismaSpy.mockReturnValue(prismaMock);
  });

  describe('saveGameResult', () => {
    it('deve salvar o resultado corretamente para um usuário válido', async () => {
      const userId = 'user-valid-id-12345';
      
      prismaMock.user.findUnique.mockResolvedValue({ id: userId, fullName: 'Teste' });
      prismaMock.theme.findUnique.mockResolvedValue(null);

      await RankingService.saveGameResult(userId, 'NORMAL', 10, 'sala-1', 'tema-1');

      // Verificamos se o método de criação de partida foi chamado
      expect(prismaMock.gameMatch.create).toHaveBeenCalled();
      // Verificamos se os pontos foram incrementados
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: { rankingPoints: { increment: 10 } }
        })
      );
    });

    it('deve ignorar se o ID for de convidado', async () => {
      await RankingService.saveGameResult('guest-999', 'NORMAL', 10);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getLeaderboard', () => {
    it('deve listar os líderes quando não há filtros', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: '1', fullName: 'Alice', rankingPoints: 100, school: { name: 'Escola A' } }
      ]);

      const result = await RankingService.getLeaderboard({});
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');
    });
  });
});
