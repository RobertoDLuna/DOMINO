import { describe, it, expect } from 'vitest';
const ScoringService = require('./ScoringService');

describe('ScoringService', () => {
  describe('calculateWinScore', () => {
    it('deve retornar LAILOA_CARROCA (7 pts) se for lailoa e carroça', () => {
      const piece = { ladoA: 6, ladoB: 6 };
      const res = ScoringService.calculateWinScore(piece, true);
      expect(res.winType).toBe('LAILOA_CARROCA');
      expect(res.points).toBe(7);
    });

    it('deve retornar LAILOA (6 pts) se for lailoa e não carroça', () => {
      const piece = { ladoA: 5, ladoB: 6 };
      const res = ScoringService.calculateWinScore(piece, true);
      expect(res.winType).toBe('LAILOA');
      expect(res.points).toBe(6);
    });

    it('deve retornar CARROCA (5 pts) se não for lailoa e for carroça', () => {
      const piece = { ladoA: 4, ladoB: 4 };
      const res = ScoringService.calculateWinScore(piece, false);
      expect(res.winType).toBe('CARROCA');
      expect(res.points).toBe(5);
    });

    it('deve retornar NORMAL (3 pts) caso padrão', () => {
      const piece = { ladoA: 1, ladoB: 2 };
      const res = ScoringService.calculateWinScore(piece, false);
      expect(res.winType).toBe('NORMAL');
      expect(res.points).toBe(3);
    });
  });

  describe('getTrancamentoWinner', () => {
    it('deve vencer quem tem a menor soma de pontos', () => {
      const game = {
        players: [{ id: 'p1' }, { id: 'p2' }],
        hands: {
          'p1': [{ vA: 1, vB: 1 }, { vA: 0, vB: 1 }], // total = 3
          'p2': [{ vA: 6, vB: 6 }] // total = 12
        }
      };
      const res = ScoringService.getTrancamentoWinner(game);
      expect(res.isTie).toBe(false);
      expect(res.winnerId).toBe('p1');
      expect(res.points).toBe(2);
      expect(res.winType).toBe('TRANCOU_MENOS');
    });

    it('em caso de empate de pontos, vence quem tem MENOS peças', () => {
      const game = {
        players: ['p1', 'p2'],
        hands: {
          'p1': [{ vA: 1, vB: 1 }, { vA: 0, vB: 1 }], // total = 3 (2 peças)
          'p2': [{ vA: 1, vB: 2 }] // total = 3 (1 peça)
        }
      };
      const res = ScoringService.getTrancamentoWinner(game);
      expect(res.isTie).toBe(false);
      expect(res.winnerId).toBe('p2');
    });

    it('deve retornar TRANCOU_EMPATE (1 pt) em empate completo (pontos e quantidade de peças)', () => {
      const game = {
        players: ['p1', 'p2'],
        hands: {
          'p1': [{ vA: 1, vB: 2 }], // total = 3 (1 peça)
          'p2': [{ vA: 0, vB: 3 }]  // total = 3 (1 peça)
        }
      };
      const res = ScoringService.getTrancamentoWinner(game);
      expect(res.isTie).toBe(true);
      expect(res.winnerId).toBeNull();
      expect(res.tiedPlayers).toContain('p1');
      expect(res.tiedPlayers).toContain('p2');
      expect(res.points).toBe(1);
      expect(res.winType).toBe('TRANCOU_EMPATE');
    });
    
    it('deve considerar zero para cartas que não possuem vA ou vB (segurança)', () => {
      const game = {
        players: ['p1', 'p2'],
        hands: {
          'p1': [{}], // total = 0
          'p2': [{ vA: 1, vB: 0 }] // total = 1
        }
      };
      const res = ScoringService.getTrancamentoWinner(game);
      expect(res.winnerId).toBe('p1');
    });
  });
});
