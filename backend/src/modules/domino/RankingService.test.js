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
        findMany: vi.fn(),
      },
      school: {
        findMany: vi.fn(),
      },
      category: {
        findMany: vi.fn(),
      }
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

    it('deve listar os líderes usando agregações quando há filtros (themeId)', async () => {
      prismaMock.gameMatch.groupBy.mockResolvedValue([
        { winnerId: '2', _sum: { points: 50 } }
      ]);
      prismaMock.user.findMany.mockResolvedValue([
        { id: '2', fullName: 'Bob', school: null }
      ]);

      const result = await RankingService.getLeaderboard({ themeId: 'theme-1' });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bob');
      expect(result[0].school).toBe('Sem Escola');
      expect(prismaMock.gameMatch.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { themeId: 'theme-1', winnerId: { not: null } } })
      );
    });

    it('deve retornar vazio se der erro', async () => {
      prismaMock.user.findMany.mockRejectedValue(new Error('DB Error'));
      const result = await RankingService.getLeaderboard();
      expect(result).toEqual([]);
    });
  });

  describe('getCreatorsLeaderboard', () => {
    it('deve agrupar contagens de partidas e retornar os maiores criadores', async () => {
      prismaMock.theme.findMany.mockResolvedValue([
        { ownerId: '1', _count: { gameMatches: 10 } },
        { ownerId: '1', _count: { gameMatches: 5 } },
        { ownerId: '2', _count: { gameMatches: 5 } }
      ]);
      prismaMock.user.findMany.mockResolvedValue([
        { id: '1', fullName: 'Criador 1', school: { name: 'Escola 1' } },
        { id: '2', fullName: 'Criador 2', school: null }
      ]);

      const result = await RankingService.getCreatorsLeaderboard();
      
      expect(result).toHaveLength(2);
      expect(result[0].points).toBe(15);
      expect(result[0].name).toBe('Criador 1');
      expect(result[1].points).toBe(5);
    });

    it('deve retornar vazio se houver erro', async () => {
      prismaMock.theme.findMany.mockRejectedValue(new Error('Err'));
      expect(await RankingService.getCreatorsLeaderboard()).toEqual([]);
    });
  });

  describe('getSchoolsLeaderboard', () => {
    it('deve somar os pontos dos usuários de cada escola', async () => {
      prismaMock.school.findMany.mockResolvedValue([
        { id: 's1', name: 'Escola A', users: [{ rankingPoints: 10 }, { rankingPoints: 20 }] },
        { id: 's2', name: 'Escola B', users: [{ rankingPoints: 5 }] },
        { id: 's3', name: 'Escola Vazia', users: [] } // Deve ser filtrada porque tem 0 pontos
      ]);

      const result = await RankingService.getSchoolsLeaderboard();
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Escola A');
      expect(result[0].points).toBe(30);
      expect(result[1].name).toBe('Escola B');
      expect(result[1].points).toBe(5);
    });

    it('deve retornar vazio se houver erro', async () => {
      prismaMock.school.findMany.mockRejectedValue(new Error('Err'));
      expect(await RankingService.getSchoolsLeaderboard()).toEqual([]);
    });
  });

  describe('getCategoriesLeaderboard', () => {
    it('deve somar o número de partidas de cada categoria', async () => {
      prismaMock.category.findMany.mockResolvedValue([
        {
          id: 1, name: 'Cat 1', subs: [
            { themes: [{ gameMatches: [1, 2] }, { gameMatches: [3] }] }
          ]
        },
        {
          id: 2, name: 'Cat 2', subs: [
            { themes: [{ gameMatches: [4] }] }
          ]
        }
      ]);

      const result = await RankingService.getCategoriesLeaderboard();
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Cat 1');
      expect(result[0].points).toBe(3); // 2 matches + 1 match
      expect(result[1].name).toBe('Cat 2');
      expect(result[1].points).toBe(1);
    });

    it('deve retornar vazio em erro', async () => {
      prismaMock.category.findMany.mockRejectedValue(new Error('Err'));
      expect(await RankingService.getCategoriesLeaderboard()).toEqual([]);
    });
  });

  describe('obfuscateName', () => {
    it('deve ofuscar corretamente', () => {
      expect(RankingService.obfuscateName('Roberto Luna')).toBe('Roberto L.');
      expect(RankingService.obfuscateName('Alice')).toBe('Alice');
      expect(RankingService.obfuscateName('')).toBe('Anônimo');
    });
  });

  describe('getPreviewLeaderboards', () => {
    it('deve montar o preview de 4 vitrines', async () => {
      vi.spyOn(RankingService, 'getLeaderboard').mockResolvedValue([{ name: 'Aluno', points: 10 }]);
      vi.spyOn(RankingService, 'getCreatorsLeaderboard').mockResolvedValue([{ name: 'Criador', points: 5 }]);
      vi.spyOn(RankingService, 'getSchoolsLeaderboard').mockResolvedValue([{ name: 'Escola', points: 20 }]);
      vi.spyOn(RankingService, 'getCategoriesLeaderboard').mockResolvedValue([{ name: 'Cat', points: 30 }]);

      const result = await RankingService.getPreviewLeaderboards();
      
      expect(result.topPlayers[0].name).toBe('Aluno');
      expect(result.topCreators[0].name).toBe('Criador');
      expect(result.topSchools[0].name).toBe('Escola');
      expect(result.topCategories[0].name).toBe('Cat');
    });

    it('deve retornar arrays vazios em caso de falha de algum deles', async () => {
      vi.spyOn(RankingService, 'getLeaderboard').mockRejectedValue(new Error('Erro'));
      
      const result = await RankingService.getPreviewLeaderboards();
      
      expect(result.topPlayers).toEqual([]);
      expect(result.topCreators).toEqual([]);
      expect(result.topSchools).toEqual([]);
      expect(result.topCategories).toEqual([]);
    });
  });
});
