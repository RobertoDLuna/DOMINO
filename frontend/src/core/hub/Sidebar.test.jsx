import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Sidebar } from './GameHub';

// Mock dos assets para evitar erros de importação
vi.mock('../../assets/logo-campina.png', () => ({ default: 'logo-mock' }));
vi.mock('../../assets/logo-prefeitura.png', () => ({ default: 'logo-mock' }));

describe('Sidebar Component', () => {
  it('deve renderizar o nome do usuário corretamente', () => {
    const user = { fullName: 'Roberto Luna', role: 'ALUNO' };
    render(<Sidebar user={user} onLogout={() => {}} />);
    
    expect(screen.getByText('Roberto Luna')).toBeInTheDocument();
    expect(screen.getByText('ALUNO')).toBeInTheDocument();
  });

  it('deve exibir o botão "Painel Admin" apenas para administradores', () => {
    const adminUser = { fullName: 'Admin', role: 'ADMIN' };
    const { rerender } = render(<Sidebar user={adminUser} onLogout={() => {}} />);
    
    expect(screen.getByText('Painel Admin')).toBeInTheDocument();

    const normalUser = { fullName: 'Player', role: 'ALUNO' };
    rerender(<Sidebar user={normalUser} onLogout={() => {}} />);
    
    expect(screen.queryByText('Painel Admin')).not.toBeInTheDocument();
  });

  it('deve disparar evento de logout ao clicar no botão de sair', () => {
    const onLogout = vi.fn();
    const user = { fullName: 'User', role: 'ALUNO' };
    render(<Sidebar user={user} onLogout={onLogout} />);
    
    const logoutButton = screen.getByText('Sair');
    fireEvent.click(logoutButton);
    
    expect(onLogout).toHaveBeenCalled();
  });
});
