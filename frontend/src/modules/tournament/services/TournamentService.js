import { API_URL } from '../../../config/api';
import AuthService from '../../../services/AuthService';

class TournamentService {
  getHeaders() {
    const token = AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  async getTournaments(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_URL}/tournaments${query ? `?${query}` : ''}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar campeonatos');
    return response.json();
  }

  async getTournamentById(id) {
    const response = await fetch(`${API_URL}/tournaments/${id}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar campeonato');
    return response.json();
  }

  async createTournament(data) {
    const response = await fetch(`${API_URL}/tournaments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json();
      throw { response: { data: err } };
    }
    return response.json();
  }

  async updateTournament(id, data) {
    const response = await fetch(`${API_URL}/tournaments/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json();
      throw { response: { data: err } };
    }
    return response.json();
  }

  async deleteTournament(id) {
    const response = await fetch(`${API_URL}/tournaments/${id}`, { 
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao deletar campeonato');
  }

  async joinTournament(id) {
    const response = await fetch(`${API_URL}/tournaments/${id}/join`, { 
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!response.ok) {
      const err = await response.json();
      throw { response: { data: err } };
    }
    return response.json();
  }

  async leaveTournament(id) {
    const response = await fetch(`${API_URL}/tournaments/${id}/leave`, { 
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!response.ok) {
      const err = await response.json();
      throw { response: { data: err } };
    }
  }

  async startTournament(id) {
    const response = await fetch(`${API_URL}/tournaments/${id}/start`, { 
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!response.ok) {
      const err = await response.json();
      throw { response: { data: err } };
    }
    return response.json();
  }

  async registerMatchResult(tournamentId, matchId, data) {
    const response = await fetch(`${API_URL}/tournaments/${tournamentId}/matches/${matchId}/result`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Erro ao registrar resultado');
    return response.json();
  }

  async getRanking() {
    const response = await fetch(`${API_URL}/tournaments/ranking`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar ranking');
    return response.json();
  }
}

export default new TournamentService();
