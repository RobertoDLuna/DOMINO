import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaClient = require('../../shared/config/prismaClient');
const getPrismaSpy = vi.spyOn(prismaClient, 'getPrisma');

const GameService = require('./GameService');
const ScoringService = require('./ScoringService');

describe('GameService', () => {
  let prismaMock;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock = {
      theme: { findUnique: vi.fn() }
    };
    getPrismaSpy.mockReturnValue(prismaMock);
  });

  describe('generateRoomId', () => {
    it('deve gerar uma string de 5 caracteres', () => {
      const id = GameService.generateRoomId();
      expect(typeof id).toBe('string');
      expect(id).toHaveLength(5);
    });
  });

  describe('createGame', () => {
    it('deve inicializar um jogo corretamente com fallback de tema', async () => {
      // Sem tema achado no DB
      prismaMock.theme.findUnique.mockResolvedValue(null);
      const players = [{ id: 'p1' }, { id: 'p2' }];
      
      const game = await GameService.createGame(players, 'invalid-theme');
      
      expect(game.board).toEqual([]);
      expect(Object.keys(game.hands)).toHaveLength(2);
      expect(game.hands['p1']).toHaveLength(7);
      expect(game.hands['p2']).toHaveLength(7);
      expect(game.pile).toHaveLength(14); // 28 - 14
      expect(game.status).toBe('playing');
      expect(game.theme.name).toBe('Animais Selvagens 🦁'); // Fallback theme
    });

    it('deve usar o tema que vier do Prisma se existir', async () => {
      prismaMock.theme.findUnique.mockResolvedValue({
        id: 'custom',
        name: 'Custom Theme',
        symbols: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        color: '#000'
      });
      const players = ['p1'];
      
      const game = await GameService.createGame(players, 'custom');
      expect(game.theme.name).toBe('Custom Theme');
    });

    it('deve determinar quem começa e qual peça (maior carroça)', async () => {
      // Criar jogo e garantir que a mecânica roda
      const game = await GameService.createGame(['p1', 'p2']);
      expect(game.currentTurn).toBeTruthy();
      expect(game.startingPieceId).toBeTruthy();
    });
  });

  describe('checkDeadlock', () => {
    it('deve retornar falso se o board estiver vazio', () => {
      expect(GameService.checkDeadlock({ board: [] })).toBe(false);
    });

    it('deve retornar falso se algum jogador puder jogar', () => {
      const game = {
        board: [{ ladoA: 1, ladoB: 2 }, { ladoA: 2, ladoB: 3 }],
        players: [{ id: 'p1' }],
        hands: { 'p1': [{ ladoA: 3, ladoB: 4 }] } // Pode jogar no 3
      };
      expect(GameService.checkDeadlock(game)).toBe(false);
    });

    it('deve retornar verdadeiro se ninguém puder jogar', () => {
      const game = {
        board: [{ ladoA: 1, ladoB: 2 }, { ladoA: 2, ladoB: 3 }], // pontas 1 e 3
        players: [{ id: 'p1' }],
        hands: { 'p1': [{ ladoA: 4, ladoB: 5 }] } // Não tem 1 nem 3
      };
      expect(GameService.checkDeadlock(game)).toBe(true);
    });
  });

  describe('getWinnerOnDeadlock', () => {
    it('deve delegar para o ScoringService', () => {
      vi.spyOn(ScoringService, 'getTrancamentoWinner').mockReturnValue('p1');
      const winner = GameService.getWinnerOnDeadlock({});
      expect(winner).toBe('p1');
      expect(ScoringService.getTrancamentoWinner).toHaveBeenCalled();
    });
  });

  describe('processMove', () => {
    it('deve rejeitar se jogador não tiver a peça', () => {
      const game = { hands: { 'p1': [] } };
      const res = GameService.processMove(game, 'p1', 'p-1-1', 'left');
      expect(res.canPlay).toBe(false);
    });

    it('deve obrigar a jogar a startingPieceId na primeira rodada', () => {
      const piece1 = { id: 'p-1-1' };
      const piece2 = { id: 'p-2-2' };
      const game = {
        board: [],
        hands: { 'p1': [piece1, piece2] },
        startingPieceId: 'p-2-2'
      };

      const res = GameService.processMove(game, 'p1', 'p-1-1', 'left');
      expect(res.canPlay).toBe(false);
      expect(res.error).toMatch(/começar o jogo com a maior carroça/);
    });

    it('deve permitir a primeira jogada corretamente', () => {
      const piece1 = { id: 'p-2-2' };
      const game = {
        board: [],
        hands: { 'p1': [piece1] },
        startingPieceId: 'p-2-2'
      };

      const res = GameService.processMove(game, 'p1', 'p-2-2', 'left');
      expect(res.canPlay).toBe(true);
      expect(res.isOver).toBe(true); // Esvaziou a mão
      expect(game.board).toHaveLength(1);
    });

    it('deve virar a peça corretamente quando jogar e os lados estiverem invertidos', () => {
      const piece = { id: 'p-1-2', ladoA: 1, ladoB: 2, vA: 1, vB: 2 };
      const game = {
        board: [{ ladoA: 2, ladoB: 3 }], // ponta esquerda é 2
        hands: { 'p1': [piece] } // quero jogar no lado esquerdo (left)
      };

      // A peça é [1|2]. A ponta esquerda é 2. Eu jogo na esquerda.
      // O board deve encaixar [1|2] na esquerda de [2|3], ficando [1|2]-[2|3].
      // Então a nova peça deve ser colocada de forma que a sua direita (ladoB) seja 2.
      const res = GameService.processMove(game, 'p1', 'p-1-2', 'left');
      expect(res.canPlay).toBe(true);
      expect(game.board[0].ladoB).toBe(2);
    });
  });
});
