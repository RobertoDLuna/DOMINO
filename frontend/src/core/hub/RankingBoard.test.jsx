import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RankingBoard, { Podium } from './RankingBoard';
import { API_URL } from '../../config/api';

const mockThemes = [
  { id: 'theme1', name: 'Tema X', category: { name: 'Cat 1' } }
];

const mockCategories = [
  { id: 'cat1', name: 'Categoria X' }
];

const mockRanking = [
  { id: '1', name: 'Player One', points: 100, school: 'School A' },
  { id: '2', name: 'Player Two', points: 90, school: 'School B' },
  { id: '3', name: 'Player Three', points: 80, school: 'School C' },
  { id: '4', name: 'Player Four', points: 70, school: 'School D' },
  { id: '5', name: 'Player Five', points: 60, school: 'School E' },
  { id: '6', name: 'Player Six', points: 50, school: 'School F' },
];

global.fetch = vi.fn((url) => {
  if (url.includes('/themes/categories')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
  }
  if (url.includes('/themes')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockThemes) });
  }
  if (url.includes('/ranking')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRanking) });
  }
  return Promise.resolve({ ok: false });
});

describe('RankingBoard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o Podium corretamente', () => {
    render(<Podium top3={mockRanking.slice(0, 3)} mode="GERAL" />);
    expect(screen.getByText('Player O.')).toBeInTheDocument();
    expect(screen.getAllByText('Player T.').length).toBe(2);
  });

  it('deve buscar rankings ao carregar o RankingBoard', async () => {
    const onClose = vi.fn();
    render(<RankingBoard onClose={onClose} />);
    
    // Aguarda o fetch terminar
    await waitFor(() => {
      expect(screen.getByText('Player O.')).toBeInTheDocument();
      // Verifica se exibiu o resto da lista. A partir do 4º nome, não tem abreviação no History
      // Wait, leaderboard.slice(3, 5) -> "Player Four"
      expect(screen.getByText('Player Four')).toBeInTheDocument();
      expect(screen.getByText('Player Six')).toBeInTheDocument();
    });
    
    // Testa o botão fechar
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('deve mudar a aba e filtrar os dados', async () => {
    render(<RankingBoard onClose={vi.fn()} />);
    
    // Clica em CATEGORY
    const catBtn = screen.getByText(/NÍVEIS/i);
    fireEvent.click(catBtn);
    
    // Ao mudar para categoria sem ID selecionado, deve exibir mensagem
    await waitFor(() => {
      expect(screen.getByText(/Defina seu alvo/i)).toBeInTheDocument();
    });

    // Clica em CREATOR
    const creatorBtn = screen.getByText(/AUTORES/i);
    fireEvent.click(creatorBtn);

    // Deve recarregar a lista
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('?type=CREATORS'), expect.any(Object));
      expect(screen.getByText('Player O.')).toBeInTheDocument();
    });
  });
});
