import { API_URL } from '../config/api';

class AuthService {
  async getSchools() {
    try {
      console.log(`[AuthService] Buscando escolas em: ${API_URL}/schools`);
      const res = await fetch(`${API_URL}/schools`, { cache: 'no-store' });
      
      if (!res.ok) {
        console.error(`[AuthService] Erro na requisição: ${res.status}`);
        return [];
      }
      
      const data = await res.json();
      console.log(`[AuthService] ${data.length} escolas encontradas.`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('[AuthService] Falha catastrófica ao buscar escolas:', err);
      return [];
    }
  }

  async register(data) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao criar conta.');
    
    if (result.token) {
      localStorage.setItem('domino_token', result.token);
      localStorage.setItem('domino_user', JSON.stringify(result.user));
    }
    return result;
  }

  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao fazer login.');
    
    if (result.token) {
      localStorage.setItem('domino_token', result.token);
      localStorage.setItem('domino_user', JSON.stringify(result.user));
    }
    return result;
  }

  async changePassword(newPassword) {
    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify({ newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao alterar senha');
    }

    if (data.token && data.user) {
      localStorage.setItem('domino_token', data.token);
      localStorage.setItem('domino_user', JSON.stringify(data.user));
    }
    
    return data;
  }

  logout() {
    localStorage.removeItem('domino_token');
    localStorage.removeItem('domino_user');
  }

  getCurrentUser() {
    const user = localStorage.getItem('domino_user');
    return user ? JSON.parse(user) : null;
  }
  
  getToken() {
    return localStorage.getItem('domino_token');
  }
}

export default new AuthService();
