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
      console.warn('[ThemeController] DB unavailable:', error.message);
      res.json([]); // Returns empty array instead of crashing
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
      console.warn('[ThemeController] DB unavailable:', error.message);
      res.json([]);
    }
  }

  async createTheme(req, res) {
    try {
      const prisma = getPrisma();
      const { name, description, color, categoryId, subcategoryId, isPublic, ownerId } = req.body;
      const files = req.files;

      if (!files || files.length < 6) {
        return res.status(400).json({ error: "É necessário enviar exatamente 6 imagens (para os pontos 1 a 6)." });
      }

      const symbolsUrls = files.map(file => `/uploads/themes/${file.filename}`);

      const newTheme = await prisma.theme.create({
        data: {
          name,
          description,
          color: color || '#009660',
          isPublic: isPublic === 'true',
          ownerId: ownerId || null,
          categoryId: parseInt(categoryId),
          subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
          symbols: symbolsUrls
        }
      });

      res.status(201).json(newTheme);
    } catch (error) {
      console.error('[ThemeController] Error creating theme:', error);
      res.status(500).json({ error: "Erro ao criar tema. Verifique se o banco de dados está configurado." });
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
}

module.exports = new ThemeController();
