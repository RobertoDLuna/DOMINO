import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmModal from './ConfirmModal';

describe('ConfirmModal Component', () => {
  it('não deve renderizar quando isOpen for false', () => {
    const { container } = render(
      <ConfirmModal 
        isOpen={false} 
        title="Test" 
        message="Test msg" 
        onConfirm={vi.fn()} 
        onCancel={vi.fn()} 
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar corretamente quando isOpen for true', () => {
    render(
      <ConfirmModal 
        isOpen={true} 
        title="Título de Teste" 
        message="Mensagem de Teste" 
        onConfirm={vi.fn()} 
        onCancel={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Título de Teste')).toBeInTheDocument();
    expect(screen.getByText('Mensagem de Teste')).toBeInTheDocument();
  });

  it('deve chamar onCancel ao clicar em Cancelar', () => {
    const cancelMock = vi.fn();
    render(
      <ConfirmModal 
        isOpen={true} 
        title="Test" 
        message="Test msg" 
        onConfirm={vi.fn()} 
        onCancel={cancelMock} 
      />
    );
    
    fireEvent.click(screen.getByText(/Cancelar/i));
    expect(cancelMock).toHaveBeenCalledTimes(1);
  });

  it('deve chamar onConfirm ao clicar em Sair', () => {
    const confirmMock = vi.fn();
    render(
      <ConfirmModal 
        isOpen={true} 
        title="Test" 
        message="Test msg" 
        onConfirm={confirmMock} 
        onCancel={vi.fn()} 
      />
    );
    
    fireEvent.click(screen.getByText(/Sair/i));
    expect(confirmMock).toHaveBeenCalledTimes(1);
  });
});
