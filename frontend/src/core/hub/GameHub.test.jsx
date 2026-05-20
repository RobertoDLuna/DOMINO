import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GameHub, { Sidebar } from './GameHub';

describe('GameHub Component', () => {
  const mockUser = {
    fullName: 'Roberto Luna',
    role: 'ALUNO'
  };

  const mockAdmin = {
    fullName: 'Admin User',
    role: 'ADMIN'
  };

  it('deve renderizar o sidebar com dados do usuário', () => {
    const onLogout = vi.fn();
    render(<Sidebar user={mockUser} onLogout={onLogout} />);
    
    expect(screen.getByText('Roberto Luna')).toBeInTheDocument();
    expect(screen.getByText('ALUNO')).toBeInTheDocument();
    
    const logoutBtn = screen.getByText('Sair');
    fireEvent.click(logoutBtn);
    expect(onLogout).toHaveBeenCalled();
  });

  it('deve exibir painel admin se o usuário for ADMIN e disparar evento', () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    render(<Sidebar user={mockAdmin} onLogout={vi.fn()} />);
    
    const adminBtn = screen.getByText('Painel Admin');
    expect(adminBtn).toBeInTheDocument();
    
    fireEvent.click(adminBtn);
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    expect(dispatchEventSpy.mock.calls[0][0].type).toBe('openAdminPanel');
  });

  it('não deve exibir painel admin se usuário não for ADMIN', () => {
    render(<Sidebar user={mockUser} onLogout={vi.fn()} />);
    expect(screen.queryByText('Painel Admin')).not.toBeInTheDocument();
  });

  it('deve renderizar os cartões de jogos e permitir seleção', () => {
    const onSelectGame = vi.fn();
    render(<GameHub user={mockUser} onSelectGame={onSelectGame} onLogout={vi.fn()} />);
    
    expect(screen.getByText('Dominó Seduc')).toBeInTheDocument();
    expect(screen.getByText('Xadrez Real')).toBeInTheDocument();
    
    // Clica no jogo de Dominó
    const dominoBtn = screen.getByRole('button', { name: /Dominó Seduc/i });
    fireEvent.click(dominoBtn);
    expect(onSelectGame).toHaveBeenCalledWith('domino');

    // Clica no jogo de Xadrez
    const chessBtn = screen.getByRole('button', { name: /Xadrez Real/i });
    fireEvent.click(chessBtn);
    expect(onSelectGame).toHaveBeenCalledWith('xadrez');

    // Tentar clicar no quiz (não implementado seleção no código base para quiz)
    const quizBtn = screen.getByRole('button', { name: /Mestre do Quiz/i });
    fireEvent.click(quizBtn);
    expect(onSelectGame).toHaveBeenCalledTimes(2); // não deve ter incrementado
  });
});
