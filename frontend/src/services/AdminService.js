import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_URL || '/api';

class AdminService {
  async getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AuthService.getToken()}`
    };
  }

  async getStats() {
    const res = await fetch(`${API_URL}/admin/stats`, {
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao buscar estatísticas');
    return await res.json();
  }

  async getPendingApprovals() {
    const res = await fetch(`${API_URL}/admin/pending`, {
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao buscar aprovações pendentes');
    return await res.json();
  }

  async approveTheme(id) {
    const res = await fetch(`${API_URL}/admin/approve-theme/${id}`, {
      method: 'PUT',
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao aprovar tema');
    return await res.json();
  }

  async rejectTheme(id) {
    const res = await fetch(`${API_URL}/admin/reject-theme/${id}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao rejeitar tema');
    return await res.json();
  }

  async getUsers() {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao buscar usuários');
    return await res.json();
  }

  async resetUserPassword(id, tempPassword) {
    const res = await fetch(`${API_URL}/admin/users/${id}/reset-password`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify({ tempPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao definir a senha.');
    return data;
  }

  async deleteUser(id) {
    const res = await fetch(`${API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir o usuário.');
    return data;
  }
}

export default new AdminService();
