// frontend/src/services/ThemeService.js
// Use relative URL so it works in both dev (via Vite proxy) and production (same origin)
const API_URL = import.meta.env.VITE_API_URL || '/api';

class ThemeService {
  async getCategories() {
    try {
      const res = await fetch(`${API_URL}/themes/categories`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  async getThemes(ownerId = null) {
    try {
      const url = ownerId ? `${API_URL}/themes?ownerId=${ownerId}` : `${API_URL}/themes`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  async createTheme(themeData) {
    const formData = new FormData();
    Object.keys(themeData).forEach(key => {
      if (key === 'symbols') {
        themeData.symbols.forEach(file => formData.append('symbols', file));
      } else {
        formData.append(key, themeData[key]);
      }
    });

    const res = await fetch(`${API_URL}/themes`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao criar tema.');
    }

    return await res.json();
  }

  async createCategory(name) {
    const res = await fetch(`${API_URL}/themes/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Erro ao criar categoria.');
    }
    
    return await res.json();
  }

  async deleteCategory(id) {
    const res = await fetch(`${API_URL}/themes/categories/${id}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Erro ao excluir categoria.');
    }
    
    return await res.json();
  }

  async deleteTheme(id) {
    const res = await fetch(`${API_URL}/themes/${id}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Erro ao excluir tema.');
    }
    
    return await res.json();
  }
}

export default new ThemeService();
