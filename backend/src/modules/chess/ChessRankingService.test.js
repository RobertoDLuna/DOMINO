import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do prismaClient antes de importar o serviço
const prismaClient = require('../../shared/config/prismaClient');
const getPrismaSpy = vi.spyOn(prismaClient, 'getPrisma');

const ChessRankingService = require('./ChessRankingService');

describe('ChessRankingService', () => {
  let prismaMock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    prismaMock = {
      user: {
        findUnique: vi.fn(),
      },
      chessRanking: {
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
    };

    getPrismaSpy.mockReturnValue(prismaMock);
  });

  describe('updateRanking', () => {
    it('deve atribuir 3 pontos para o vencedor e 0 para o perdedor (WHITE_WIN)', async () => {
      const whiteId = 'white-1';
      const blackId = 'black-1';
      
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: whiteId, fullName: 'White Player', schoolId: 'school-1', school: { name: 'Escola 1' } })
        .mockResolvedValueOnce({ id: blackId, fullName: 'Black Player', schoolId: 'school-2', school: { name: 'Escola 2' } });

      await ChessRankingService.updateRanking(whiteId, blackId, 'WHITE_WIN');

      // Verifica Brancas (Vencedor)
      expect(prismaMock.chessRanking.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: whiteId },
        update: expect.objectContaining({ points: { increment: 3 }, wins: { increment: 1 } })
      }));

      // Verifica Negras (Perdedor)
      expect(prismaMock.chessRanking.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: blackId },
        update: expect.objectContaining({ points: { increment: 0 }, losses: { increment: 1 } })
      }));
    });

    it('deve atribuir 1 ponto para ambos em caso de empate (DRAW)', async () => {
      const whiteId = 'white-1';
      const blackId = 'black-1';
      
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: whiteId, fullName: 'White Player' })
        .mockResolvedValueOnce({ id: blackId, fullName: 'Black Player' });

      await ChessRankingService.updateRanking(whiteId, blackId, 'DRAW');

      expect(prismaMock.chessRanking.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: whiteId },
        update: expect.objectContaining({ points: { increment: 1 }, draws: { increment: 1 } })
      }));

      expect(prismaMock.chessRanking.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: blackId },
        update: expect.objectContaining({ points: { increment: 1 }, draws: { increment: 1 } })
      }));
    });
  });

  describe('obfuscateName', () => {
    it('deve ofuscar nomes corretamente para LGPD', () => {
      expect(ChessRankingService.obfuscateName('Roberto Luna')).toBe('Roberto L.');
      expect(ChessRankingService.obfuscateName('Alice Silva Oliveira')).toBe('Alice O.');
      expect(ChessRankingService.obfuscateName('Unico')).toBe('Unico');
      expect(ChessRankingService.obfuscateName('')).toBe('Anônimo');
    });
  });
});
