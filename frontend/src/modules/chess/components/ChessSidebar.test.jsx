import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(screen.getAllByText('Pe4').length).toBeGreaterThan(0);
  });

  it('deve mostrar o botão de desistir e de propor empate durante o jogo', () => {
    const onResign = vi.fn();
    const onOfferDraw = vi.fn();
    render(<ChessSidebar {...defaultProps} onResign={onResign} onOfferDraw={onOfferDraw} />);
    
    const resignBtn = screen.getByText(/Desistir/i);
    expect(resignBtn).toBeInTheDocument();
    fireEvent.click(resignBtn);
    expect(onResign).toHaveBeenCalled();

    const drawBtn = screen.getByText(/Propor Empate/i);
    expect(drawBtn).toBeInTheDocument();
    fireEvent.click(drawBtn);
    expect(onOfferDraw).toHaveBeenCalled();
  });

  it('deve renderizar a animação de vitória quando game over e botões de revanche', () => {
    const onRematch = vi.fn();
    render(<ChessSidebar 
      {...defaultProps} 
      gameOver={{ result: 'WHITE_WIN', reason: 'checkmate' }} 
      onRematch={onRematch}
    />);
    
    // Verifica se a animação apareceu (pelo menos o label)
    expect(screen.getByText(/Você Venceu/i)).toBeInTheDocument();
    expect(screen.getByText(/por Xeque-Mate/i)).toBeInTheDocument();

    const rematchBtn = screen.getByText(/Jogar Novamente/i);
    expect(rematchBtn).toBeInTheDocument();
    fireEvent.click(rematchBtn);
    expect(onRematch).toHaveBeenCalled();
  });

  it('deve renderizar o ChessTimer com os tempos apropriados', () => {
    render(<ChessSidebar {...defaultProps} whiteTime={65} blackTime={5} />);
    
    // 65 segundos = 1:05
    expect(screen.getByText('1:05')).toBeInTheDocument();
    // 5 segundos com decimais (se < 10) ex: 0:05.0
    expect(screen.getByText('0:05.0')).toBeInTheDocument();
  });

  it('deve tratar props do oponente oferecendo empate', () => {
    const onAcceptDraw = vi.fn();
    const onDeclineDraw = vi.fn();
    render(<ChessSidebar {...defaultProps} drawOffered={true} onAcceptDraw={onAcceptDraw} onDeclineDraw={onDeclineDraw} />);
    
    expect(screen.getByText(/Adversário propõe empate/i)).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Aceitar'));
    expect(onAcceptDraw).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Recusar'));
    expect(onDeclineDraw).toHaveBeenCalled();
  });
});
