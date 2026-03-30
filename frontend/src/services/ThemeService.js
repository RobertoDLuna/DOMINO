// frontend/src/services/ThemeService.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ThemeService {
  /**
   * Fetch all system categories.
   */
  async getCategories() {
    const res = await fetch(`${API_URL}/themes/categories`);
    return await res.json();
  }

  /**
   * Fetch all available themes (Standard + Custom).
   */
  async getThemes(ownerId = null) {
    const url = ownerId ? `${API_URL}/themes?ownerId=${ownerId}` : `${API_URL}/themes`;
    const res = await fetch(url);
    return await res.json();
  }

  /**
   * Register a new custom theme.
   * Uses FormData for file upload.
   */
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
      const err = await res.json();
      throw new Error(err.error || "Erro ao criar tema.");
    }
    
    return await res.json();
  }
}

export default new ThemeService();
