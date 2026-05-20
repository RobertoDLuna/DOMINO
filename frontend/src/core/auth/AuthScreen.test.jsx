import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthScreen from './AuthScreen';
import AuthService from '../../services/AuthService';

// Mocking AuthService
vi.mock('../../services/AuthService', () => {
  return {
    default: {
      getSchools: vi.fn(() => Promise.resolve([])),
      login: vi.fn(),
      register: vi.fn()
    }
  };
});

// Mocking fetch for previews
const mockPreviews = {
  topPlayers: [
    { id: 1, name: 'Player 1', points: 100, school: 'School A' },
    { id: 2, name: 'Player 2', points: 90, school: 'School B' },
    { id: 3, name: 'Player 3', points: 80, school: 'School C' },
    { id: 4, name: 'Player 4', points: 70, school: 'School D' },
    { id: 5, name: 'Player 5', points: 60, school: 'School E' }
  ],
  topSchools: [{ id: 1, name: 'School A', points: 500 }],
  topCategories: [{ name: 'Iniciante', points: 200 }],
  topCreators: [{ id: 1, name: 'Creator 1', points: 150 }]
};

global.fetch = vi.fn((url) => {
  if (url.includes('chess/ranking/preview')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ topPlayers: [], topSchools: [] })
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockPreviews)
  });
});

describe('AuthScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar a tela de login inicialmente', async () => {
    render(<AuthScreen onAuthSuccess={vi.fn()} onGuestStart={vi.fn()} onJoinRoom={vi.fn()} />);
    
    // Deve exibir o campo de email e senha
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    
    // O botão deve ter o texto de entrar
    expect(screen.getByTestId('login-button')).toHaveTextContent(/ENTRAR NO JOGO/i);
  });

  it('deve alternar a visibilidade da senha ao clicar no botão de olho', async () => {
    render(<AuthScreen onAuthSuccess={vi.fn()} onGuestStart={vi.fn()} onJoinRoom={vi.fn()} />);
    
    const passwordInput = screen.getByTestId('password-input');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Botão de toggle
    const toggleButton = screen.getByRole('button', { name: /mostrar senha/i });
    fireEvent.click(toggleButton);

    // O tipo deve mudar para text
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Clicando de novo volta para password
    fireEvent.click(screen.getByRole('button', { name: /ocultar senha/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('deve alternar para tela de registro', async () => {
    render(<AuthScreen onAuthSuccess={vi.fn()} onGuestStart={vi.fn()} onJoinRoom={vi.fn()} />);
    
    // Clica no link de cadastre-se
    const registerLink = screen.getByText(/Cadastre-se/i);
    fireEvent.click(registerLink);

    // O botão de ação deve mudar
    expect(screen.getByTestId('login-button')).toHaveTextContent(/CRIAR CONTA/i);
    // Deve exibir o campo de nome completo
    expect(screen.getByPlaceholderText(/Ex: Roberto D. Luna/i)).toBeInTheDocument();
  });

  it('deve chamar AuthService.login ao submeter o form de login', async () => {
    AuthService.login.mockResolvedValue({ user: { name: 'Test' }, token: '123' });
    const authSuccessMock = vi.fn();
    
    render(<AuthScreen onAuthSuccess={authSuccessMock} onGuestStart={vi.fn()} onJoinRoom={vi.fn()} />);
    
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const loginButton = screen.getByTestId('login-button');

    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(AuthService.login).toHaveBeenCalledWith('test@test.com', 'senha123');
      expect(authSuccessMock).toHaveBeenCalled();
    });
  });

  it('deve chamar AuthService.register ao submeter o form de cadastro', async () => {
    AuthService.register.mockResolvedValue({ user: { name: 'Test' }, token: '123' });
    const authSuccessMock = vi.fn();
    
    render(<AuthScreen onAuthSuccess={authSuccessMock} onGuestStart={vi.fn()} onJoinRoom={vi.fn()} />);
    
    // Mudar para tela de registro
    fireEvent.click(screen.getByText(/Cadastre-se/i));
    
    const nameInput = screen.getByPlaceholderText(/Ex: Roberto D. Luna/i);
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const registerButton = screen.getByTestId('login-button');

    fireEvent.change(nameInput, { target: { value: 'Roberto Luna' } });
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(AuthService.register).toHaveBeenCalled();
      expect(authSuccessMock).toHaveBeenCalled();
    });
  });

  it('deve exibir falha se login retornar erro', async () => {
    AuthService.login.mockRejectedValue(new Error('Credenciais inválidas'));
    
    render(<AuthScreen onAuthSuccess={vi.fn()} onGuestStart={vi.fn()} onJoinRoom={vi.fn()} />);
    
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'errado@test.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(screen.getByText(/Credenciais inválidas/i)).toBeInTheDocument();
    });
  });

  it('deve renderizar a aba do PreviewPanel e trocar de tab', async () => {
    render(<AuthScreen onAuthSuccess={vi.fn()} onGuestStart={vi.fn()} onJoinRoom={vi.fn()} />);
    
    // Aguarda o Mock das previews serem exibidas
    await waitFor(() => {
      // Como a tabela tem dois lados na tela desktop, pode ter 2 elementos GERAL
      expect(screen.getAllByText(/GERAL/i).length).toBeGreaterThan(0);
    });

    // Clica na tab SCHOOLS
    const schoolsTabs = screen.getAllByText(/ESCOLAS/i);
    fireEvent.click(schoolsTabs[0]);

    // Verifica se "School A" foi exibida
    await waitFor(() => {
      expect(screen.getAllByText(/School A/i).length).toBeGreaterThan(0);
    });
    
    // Troca para o jogo de Xadrez
    const chessBtns = screen.getAllByText(/XADREZ/i);
    fireEvent.click(chessBtns[0]);
    
    // Como xadrez não mockamos dados no mockPreviews do topPlayers, vai exibir Nenhuma liderança (ou apenas carregar vazio)
    await waitFor(() => {
      expect(screen.getAllByText(/Nenhuma liderança ainda./i).length).toBeGreaterThan(0);
    });
  });
});
