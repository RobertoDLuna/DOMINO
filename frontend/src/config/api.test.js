import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getBaseUrl } from './api';

describe('API Config (getBaseUrl)', () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation
    });
  });

  it('deve usar VITE_API_URL se definida', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.teste.com');
    expect(getBaseUrl()).toBe('https://api.teste.com');
  });

  it('deve usar o origin do location em PRODUÇÃO se VITE_API_URL não estiver definida', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PROD', 'true');
    vi.stubEnv('VITE_API_URL', '');
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { origin: 'https://meudominio.com' }
    });
    
    expect(getBaseUrl()).toBe('https://meudominio.com');
  });

  it('deve usar localhost em DESENVOLVIMENTO se VITE_API_URL não estiver definida', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PROD', '');
    vi.stubEnv('VITE_API_URL', '');
    expect(getBaseUrl()).toBe('http://localhost:3001');
  });
});
