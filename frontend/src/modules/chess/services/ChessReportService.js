import { API_URL } from '../../../config/api';

class ChessReportService {
  constructor() {
    this.baseURL = `${API_URL}/chess`;
  }

  getHeaders() {
    const token = localStorage.getItem('domino_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  async _fetch(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers }
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      localStorage.removeItem('domino_token');
      localStorage.removeItem('domino_user');
      window.location.reload();
      throw new Error('Sessão expirada. Redirecionando...');
    }

    if (!response.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  }

  async getGlobalRanking() {
    // A rota de ranking retorna { students, schools }
    return this._fetch('/ranking');
  }

  async getPlayerStats(userId) {
    return this._fetch(`/reports/player/${userId}`);
  }
}

export default new ChessReportService();
