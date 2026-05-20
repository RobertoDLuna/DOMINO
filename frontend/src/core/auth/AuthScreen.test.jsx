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
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ topPlayers: [], topSchools: [], topCategories: [], topCreators: [] })
  })
);

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
});
