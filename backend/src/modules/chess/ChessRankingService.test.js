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

      // Verifica Pretas (Perdedor)
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
    it('deve atribuir 3 pontos para as Pretas (BLACK_WIN)', async () => {
      const whiteId = 'white-1';
      const blackId = 'black-1';
      
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: whiteId, fullName: 'White Player' })
        .mockResolvedValueOnce({ id: blackId, fullName: 'Black Player' });

      await ChessRankingService.updateRanking(whiteId, blackId, 'BLACK_WIN');

      expect(prismaMock.chessRanking.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: blackId },
        update: expect.objectContaining({ points: { increment: 3 }, wins: { increment: 1 } })
      }));
    });

    it('não deve fazer nada se os usuários não existirem', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await ChessRankingService.updateRanking('fake-1', 'fake-2', 'WHITE_WIN');
      expect(prismaMock.chessRanking.upsert).not.toHaveBeenCalled();
    });

    it('não deve fazer nada se faltar id de algum jogador', async () => {
      await ChessRankingService.updateRanking(null, 'fake-2', 'WHITE_WIN');
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getStudentRanking', () => {
    it('deve retornar lista formatada', async () => {
      prismaMock.chessRanking.findMany.mockResolvedValue([
        { userId: '1', userName: 'A', points: 10, schoolName: 'S1', wins: 2, losses: 0, draws: 1 }
      ]);
      const res = await ChessRankingService.getStudentRanking();
      expect(res).toHaveLength(1);
      expect(res[0].rank).toBe(1);
      expect(res[0].school).toBe('S1');
    });

    it('deve retornar vazio se houver erro', async () => {
      prismaMock.chessRanking.findMany.mockRejectedValue(new Error('Erro DB'));
      const res = await ChessRankingService.getStudentRanking();
      expect(res).toEqual([]);
    });
  });

  describe('getSchoolRanking', () => {
    it('deve retornar ranking somado', async () => {
      prismaMock.chessRanking.findMany.mockResolvedValue([
        { schoolId: 1, schoolName: 'S1', points: 10 },
        { schoolId: 1, schoolName: 'S1', points: 5 },
        { schoolId: 2, schoolName: 'S2', points: 5 }
      ]);
      const res = await ChessRankingService.getSchoolRanking();
      expect(res).toHaveLength(2);
      expect(res[0].points).toBe(15);
      expect(res[1].points).toBe(5);
    });

    it('deve retornar vazio em erro', async () => {
      prismaMock.chessRanking.findMany.mockRejectedValue(new Error('Erro DB'));
      const res = await ChessRankingService.getSchoolRanking();
      expect(res).toEqual([]);
    });
  });

  describe('getPreviewRanking', () => {
    it('deve retornar objeto com topPlayers e topSchools', async () => {
      vi.spyOn(ChessRankingService, 'getStudentRanking').mockResolvedValue([{ name: 'Fulano Silva', points: 10 }]);
      vi.spyOn(ChessRankingService, 'getSchoolRanking').mockResolvedValue([{ name: 'S1', points: 10 }]);
      
      const res = await ChessRankingService.getPreviewRanking();
      expect(res.topPlayers[0].name).toBe('Fulano S.');
      expect(res.topSchools).toHaveLength(1);
    });
    
    it('deve retornar arrays vazios em caso de erro', async () => {
      vi.spyOn(ChessRankingService, 'getStudentRanking').mockRejectedValue(new Error('Erro'));
      const res = await ChessRankingService.getPreviewRanking();
      expect(res.topPlayers).toEqual([]);
      expect(res.topSchools).toEqual([]);
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
