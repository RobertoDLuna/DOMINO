const { getPrisma } = require('../config/prismaClient');
const path = require('path');
const fs = require('fs');

/**
 * ThemeController - Manages custom educational themes.
 * Gracefully handles DB unavailability (server runs without Postgres configured).
 */
class ThemeController {

  async getCategories(req, res) {
    try {
      const prisma = getPrisma();
      const categories = await prisma.category.findMany({ include: { subs: true } });
      res.json(categories);
    } catch (error) {
      console.error('[ThemeController] DB Error in getCategories:', error.message);
      res.status(500).json({ error: "Erro ao carregar categorias. Verifique a conexão com o banco de dados.", details: error.message });
    }
  }

  async listThemes(req, res) {
    const { ownerId } = req.query;
    try {
      const prisma = getPrisma();
      const themes = await prisma.theme.findMany({
        where: {
          OR: [
            { isPublic: true },
            { ownerId: ownerId || 'guest' }
          ]
        },
        include: { category: true, subcategory: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(themes);
    } catch (error) {
      console.error('[ThemeController] DB Error in listThemes:', error.message);
      res.json([]); // Return empty for players, but log the error
    }
  }

  async createTheme(req, res) {
    try {
      const prisma = getPrisma();
      const { name, description, color, categoryId, subcategoryId, isPublic, ownerId } = req.body;
      const files = req.files;

      // Validate required fields
      if (!name?.trim()) {
        return res.status(400).json({ error: "O nome do tema é obrigatório." });
      }
      if (!categoryId || isNaN(parseInt(categoryId))) {
        return res.status(400).json({ error: "Selecione uma categoria válida para o tema." });
      }
      if (!files || files.length < 6) {
        return res.status(400).json({ error: "É necessário enviar 6 imagens (para os pontos 1 a 6)." });
      }

      const symbolsUrls = files.map(file => `/uploads/themes/${file.filename}`);

      const newTheme = await prisma.theme.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          color: color || '#009660',
          isPublic: isPublic === 'true' || isPublic === true,
          ownerId: ownerId || null,
          categoryId: parseInt(categoryId),
          subcategoryId: subcategoryId && !isNaN(parseInt(subcategoryId)) ? parseInt(subcategoryId) : null,
          symbols: symbolsUrls
        }
      });

      res.status(201).json(newTheme);
    } catch (error) {
      console.error('[ThemeController] Error creating theme:', error.message);
      // Prisma foreign key violation → invalid categoryId
      if (error.code === 'P2003') {
        return res.status(400).json({ error: "Categoria não encontrada no banco de dados." });
      }
      res.status(500).json({ error: "Erro ao criar tema. Verifique se o banco de dados está configurado." });
    }
  }

  async createCategory(req, res) {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "O nome da categoria é obrigatório." });

    try {
      const prisma = getPrisma();
      const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
      if (existing) return res.json(existing); // Return existing instead of erroring if name matches

      const created = await prisma.category.create({
        data: { name: name.trim() }
      });
      res.status(201).json(created);
    } catch (error) {
      console.error('[ThemeController] Error creating category:', error.message);
      res.status(500).json({ error: "Erro ao salvar categoria no banco." });
    }
  }

  async deleteTheme(req, res) {
    const { id } = req.params;
    try {
      const prisma = getPrisma();
      const theme = await prisma.theme.findUnique({ where: { id } });
      if (!theme) return res.status(404).json({ error: "Tema não encontrado." });

      // Remove uploaded image files from disk
      theme.symbols.forEach(url => {
        const filePath = path.join(__dirname, '../../', url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

      await prisma.theme.delete({ where: { id } });
      res.json({ message: "Tema removido com sucesso." });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir tema." });
    }
  }

  async deleteCategory(req, res) {
    const { id } = req.params;
    try {
      const prisma = getPrisma();
      
      // Check if category has themes
      const category = await prisma.category.findUnique({
        where: { id: parseInt(id) },
        include: { _count: { select: { themes: true } } }
      });

      if (!category) return res.status(404).json({ error: "Categoria não encontrada." });
      
      if (category._count.themes > 0) {
        return res.status(400).json({ error: "Não é possível excluir esta categoria pois ela possui temas vinculados." });
      }

      await prisma.category.delete({ where: { id: parseInt(id) } });
      res.json({ message: "Categoria removida com sucesso." });
    } catch (error) {
      console.error('[ThemeController] Error deleting category:', error.message);
      res.status(500).json({ error: "Erro ao excluir categoria." });
    }
  }
}

module.exports = new ThemeController();
