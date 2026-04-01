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
    const files = req.files;

    if (!name?.trim()) return res.status(400).json({ error: "O nome do nível de ensino é obrigatório." });

    try {
      const prisma = getPrisma();
      let category = await prisma.category.findUnique({ 
        where: { name: name.trim() },
        include: { subs: true }
      });
      
      if (!category) {
        // Lista padrão de disciplinas sugeridas para novos níveis
        const defaultSubs = [
          'Matemática', 'Ciências', 'Língua Portuguesa', 
          'Geografia', 'História', 'Inglês', 'Artes', 
          'Educação Física', 'Geral'
        ];

        category = await prisma.category.create({
          data: { 
            name: name.trim(),
            isDefault: false,
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
            color: '#009660'
          }
        });
      }

      res.status(201).json(category);
    } catch (error) {
      console.error('[ThemeController] Error creating category:', error.message);
      res.status(500).json({ error: "Erro ao salvar nível no banco." });
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
}

module.exports = new ThemeController();
