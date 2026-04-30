import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChessSidebar from './ChessSidebar';

describe('ChessSidebar', () => {
  const defaultProps = {
    whiteName: 'Alice',
    blackName: 'Bob',
    moves: [],
    status: 'playing',
    isMyTurn: true,
    myColor: 'white',
    onBack: vi.fn(),
  };

  it('deve renderizar os nomes dos jogadores corretamente', () => {
    render(<ChessSidebar {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('deve exibir o banner de "Sua vez" quando for a vez do usuário', () => {
    render(<ChessSidebar {...defaultProps} />);
    expect(screen.getByText(/Sua vez/i)).toBeInTheDocument();
  });

  it('deve exibir o banner de "Vez do adversário" quando não for a vez do usuário', () => {
    render(<ChessSidebar {...defaultProps} isMyTurn={false} />);
    expect(screen.getByText(/Vez do adversário/i)).toBeInTheDocument();
  });

  it('deve listar o histórico de jogadas', () => {
    const moves = [{ san: 'e4', from: 'e2', to: 'e4', piece: 'p' }];
    render(<ChessSidebar {...defaultProps} moves={moves} />);
    expect(screen.getByText('e4')).toBeInTheDocument();
    expect(screen.getByText(/Peão para E4/i)).toBeInTheDocument();
  });

  it('deve mostrar o botão de desistir durante o jogo', () => {
    render(<ChessSidebar {...defaultProps} />);
    expect(screen.getByText(/Desistir/i)).toBeInTheDocument();
  });
});
