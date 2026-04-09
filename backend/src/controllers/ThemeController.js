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
      // Only show approved categories or default ones (isApproved: true)
      const categories = await prisma.category.findMany({
        where: { isApproved: true },
        include: { subs: true }
      });
      res.json(categories);
    } catch (error) {
      console.error('[ThemeController] DB Error in getCategories:', error.message);
      res.status(500).json({ error: "Erro ao carregar categorias.", details: error.message });
    }
  }

  async listThemes(req, res) {
    const { ownerId, categoryId, subcategoryId, search } = req.query;
    try {
      const prisma = getPrisma();
      
      const where = {
        AND: [
          { isApproved: true },
          {
            OR: [
              { isPublic: true },
              { ownerId: ownerId || 'guest' }
            ]
          }
        ]
      };

      if (categoryId) {
        where.AND.push({ categoryId: parseInt(categoryId) });
      }
      if (subcategoryId) {
        where.AND.push({ subcategoryId: parseInt(subcategoryId) });
      }
      if (search) {
        where.AND.push({
          name: { contains: search, mode: 'insensitive' }
        });
      }

      const themes = await prisma.theme.findMany({
        where,
        include: { 
          category: true, 
          subcategory: true,
          owner: {
            select: { fullName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(themes);
    } catch (error) {
      console.error('[ThemeController] DB Error in listThemes:', error.message);
      res.json([]);
    }
  }

  async createTheme(req, res) {
    try {
      const prisma = getPrisma();
      const { name, description, color, categoryId, subcategoryId, isPublic } = req.body;
      const files = req.files;
      const ownerId = req.user.id; // From authMiddleware

      // Validate required fields
      if (!name?.trim()) return res.status(400).json({ error: "O nome do tema é obrigatório." });
      if (!categoryId) return res.status(400).json({ error: "Selecione um nível de ensino válido." });
      if (!files || files.length < 6) return res.status(400).json({ error: "Envie as 6 imagens." });

      const symbolsUrls = files.map(file => `/uploads/themes/${file.filename}`);

      const newTheme = await prisma.theme.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          color: color || '#009660',
          isPublic: isPublic === 'true' || isPublic === true,
          isApproved: false, // Wait for admin
          ownerId,
          categoryId: parseInt(categoryId),
          subcategoryId: subcategoryId && !isNaN(parseInt(subcategoryId)) ? parseInt(subcategoryId) : null,
          symbols: symbolsUrls,
          summary: req.body.summary?.trim() || null
        }
      });

      res.status(201).json(newTheme);
    } catch (error) {
      console.error('[ThemeController] Error creating theme:', error);
      res.status(500).json({ error: "Erro ao criar tema." });
    }
  }

  async createCategory(req, res) {
    const { name } = req.body;
    const files = req.files;
    const ownerId = req.user.id;

    if (!name?.trim()) return res.status(400).json({ error: "O nome do nível de ensino é obrigatório." });

    try {
      const prisma = getPrisma();
      let category = await prisma.category.findUnique({ 
        where: { name: name.trim() },
        include: { subs: true }
      });
      
      if (!category) {
        // Lista padrão de disciplinas sugeridas para novos níveis
        const defaultSubs = ['Matemática', 'Ciências', 'Língua Portuguesa', 'Geografia', 'História', 'Inglês', 'Artes', 'Educação Física', 'Geral'];

        category = await prisma.category.create({
          data: { 
            name: name.trim(),
            isDefault: false,
            isApproved: false, // Custom categories also need approval?
            subs: {
              create: defaultSubs.map(name => ({ name, isDefault: false }))
            }
          },
          include: { subs: true }
        });
      }

      // Se enviou imagens, cria um tema padrão para essa categoria automaticamente
      if (files && files.length === 6) {
        const symbolsUrls = files.map(file => `/uploads/themes/${file.filename}`);
        await prisma.theme.create({
          data: {
            name: `Padrão - ${category.name}`,
            categoryId: category.id,
            symbols: symbolsUrls,
            isPublic: true,
            isApproved: false, // Theme needs approval
            ownerId,
            color: '#009660'
          }
        });
      }

      res.status(201).json(category);
    } catch (error) {
      console.error('[ThemeController] Error creating category:', error.message);
      res.status(500).json({ error: "Erro ao salvar nível." });
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
      const category = await prisma.category.findUnique({ where: { id: parseInt(id) } });
      
      if (!category) return res.status(404).json({ error: "Nível não encontrado." });
      if (category.isDefault) {
        return res.status(403).json({ error: "Níveis de ensino padrão não podem ser excluídos." });
      }

      await prisma.category.delete({ where: { id: parseInt(id) } });
      res.json({ message: "Nível excluído com sucesso." });
    } catch (error) {
      console.error('[ThemeController] Error deleting category:', error.message);
      res.status(500).json({ error: "Erro ao excluir nível no banco." });
    }
  }

  async createSubCategory(req, res) {
    const { name, categoryId } = req.body;
    if (!name?.trim() || !categoryId) {
      return res.status(400).json({ error: "Nome e nível de ensino são obrigatórios." });
    }

    try {
      const prisma = getPrisma();
      const sub = await prisma.subCategory.create({
        data: {
          name: name.trim(),
          categoryId: parseInt(categoryId),
          isDefault: false
        }
      });
      res.status(201).json(sub);
    } catch (error) {
      console.error('[ThemeController] Error creating subcategory:', error.message);
      res.status(500).json({ error: "Erro ao salvar disciplina no banco." });
    }
  }

  async deleteSubCategory(req, res) {
    const { id } = req.params;
    try {
      const prisma = getPrisma();
      const sub = await prisma.subCategory.findUnique({ where: { id: parseInt(id) } });
      
      if (!sub) return res.status(404).json({ error: "Disciplina não encontrada." });
      if (sub.isDefault) {
        return res.status(403).json({ error: "Componentes curriculares padrão não podem ser excluídos." });
      }

      await prisma.subCategory.delete({ where: { id: parseInt(id) } });
      res.json({ message: "Disciplina excluída com sucesso." });
    } catch (error) {
      console.error('[ThemeController] Error deleting subcategory:', error.message);
      res.status(500).json({ error: "Erro ao excluir disciplina no banco." });
    }
  }

  async getTheme(req, res) {
    const { id } = req.params;
    try {
      const prisma = getPrisma();
      const theme = await prisma.theme.findUnique({
        where: { id },
        include: { category: true, subcategory: true }
      });
      if (!theme) return res.status(404).json({ error: "Tema não encontrado." });
      res.json(theme);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tema." });
    }
  }
}

module.exports = new ThemeController();
