// frontend/src/services/ThemeService.js
// Use relative URL so it works in both dev (via Vite proxy) and production (same origin)
import AuthService from "./AuthService";

import { API_URL } from '../config/api';

class ThemeService {
  async getThemes(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Legacy support: if filters is a string, treat it as ownerId
      if (typeof filters === 'string') {
        params.append('ownerId', filters);
      } else {
        if (filters.ownerId) params.append('ownerId', filters.ownerId);
        if (filters.categoryId) params.append('categoryId', filters.categoryId);
        if (filters.subcategoryId) params.append('subcategoryId', filters.subcategoryId);
        if (filters.search) params.append('search', filters.search);
      }
      
      const res = await fetch(`${API_URL}/themes?${params.toString()}`);
      return await res.json();
    } catch {
      return [];
    }
  }

  async getThemeInfo(id) {
    try {
      const res = await fetch(`${API_URL}/themes/info/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getCategories() {
    try {
      const res = await fetch(`${API_URL}/themes/categories`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async createCategory(name, symbols) {
    const formData = new FormData();
    formData.append('name', name);
    if (Array.isArray(symbols)) {
      symbols.filter(file => file !== null).forEach(file => formData.append('symbols', file));
    }

    const res = await fetch(`${API_URL}/themes/categories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      },
      body: formData
    });
    
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao criar nível de ensino.');
    return result;
  }

  async deleteCategory(id) {
    const res = await fetch(`${API_URL}/themes/categories/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao excluir nível de ensino.');
    }
    return true;
  }

  async createSubCategory(name, categoryId) {
    const res = await fetch(`${API_URL}/themes/categories/subs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AuthService.getToken()}`
      },
      body: JSON.stringify({ name, categoryId })
    });
    
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao criar disciplina.');
    return result;
  }

  async deleteSubCategory(id) {
    const res = await fetch(`${API_URL}/themes/categories/subs/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao excluir disciplina.');
    }
    return true;
  }

  async createTheme(themeData) {
    const formData = new FormData();
    Object.keys(themeData).forEach(key => {
      if (key === 'symbols' && Array.isArray(themeData[key])) {
        themeData[key].filter(file => file !== null).forEach(file => formData.append('symbols', file));
      } else {
        formData.append(key, themeData[key]);
      }
    });

    const res = await fetch(`${API_URL}/themes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      },
      body: formData
    });
    
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao criar tema pedagógico.');
    return result;
  }

  async deleteTheme(id) {
    const res = await fetch(`${API_URL}/themes/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao excluir tema.');
    }
    return true;
  }
}

export default new ThemeService();
