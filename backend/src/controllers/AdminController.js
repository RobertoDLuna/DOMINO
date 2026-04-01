const { getPrisma } = require('../config/prismaClient');

class AdminController {
  async getStats(req, res) {
    try {
      const prisma = getPrisma();
      const usersCount = await prisma.user.count();
      const schoolsCount = await prisma.school.count();
      const themesCount = await prisma.theme.count();
      const pendingThemesCount = await prisma.theme.count({ where: { isApproved: false } });

      res.json({
        users: usersCount,
        schools: schoolsCount,
        themes: themesCount,
        pendingThemes: pendingThemesCount
      });
    } catch (error) {
      console.error('[AdminController] Error getStats:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
    }
  }

  async getPendingApprovals(req, res) {
    try {
      const prisma = getPrisma();
      const pendingThemes = await prisma.theme.findMany({
        where: { isApproved: false },
        include: {
          owner: { select: { fullName: true, email: true } },
          category: { select: { name: true } },
          subcategory: { select: { name: true } }
        },
        orderBy: { createdAt: 'asc' }
      });
      res.json(pendingThemes);
    } catch (error) {
      console.error('[AdminController] Error getPendingApprovals:', error);
      res.status(500).json({ error: 'Erro ao buscar temas pendentes.' });
    }
  }

  async approveTheme(req, res) {
    const { id } = req.params;
    try {
      const prisma = getPrisma();
      await prisma.theme.update({
        where: { id },
        data: { isApproved: true }
      });
      res.json({ message: 'Tema aprovado com sucesso.' });
    } catch (error) {
      console.error('[AdminController] Error approveTheme:', error);
      res.status(500).json({ error: 'Erro ao aprovar tema.' });
    }
  }

  async rejectTheme(req, res) {
    const { id } = req.params;
    try {
      const prisma = getPrisma();
      await prisma.theme.delete({
        where: { id }
      });
      res.json({ message: 'Tema rejeitado e removido com sucesso.' });
    } catch (error) {
      console.error('[AdminController] Error rejectTheme:', error);
      res.status(500).json({ error: 'Erro ao rejeitar tema.' });
    }
  }

  async getUsers(req, res) {
    try {
      const prisma = getPrisma();
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          createdAt: true,
          school: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error) {
      console.error('[AdminController] Error getUsers:', error);
      res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
  }

  async resetUserPassword(req, res) {
    const { id } = req.params;
    const { tempPassword } = req.body;
    
    if (!tempPassword || tempPassword.length < 6) {
      return res.status(400).json({ error: 'A senha temporária deve ter pelo menos 6 caracteres.' });
    }

    try {
      const prisma = getPrisma();
      const bcrypt = require('bcryptjs'); // Or just top-level require
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      await prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          mustChangePassword: true
        }
      });
      res.json({ message: 'Senha redefinida com sucesso. O usuário precisará alterá-la no próximo login.' });
    } catch (error) {
      console.error('[AdminController] Error resetUserPassword:', error);
      res.status(500).json({ error: 'Erro ao redefinir a senha do usuário.' });
    }
  }

  async createUser(req, res) {
    let { fullName, email, password, role, schoolId } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    email = email.toLowerCase();
    
    try {
      const prisma = getPrisma();
      
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Este e-mail já está em uso.' });
      }

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          role: role.toUpperCase(),
          schoolId: schoolId ? parseInt(schoolId) : null,
          mustChangePassword: true // Força o novo usuário a mudar a senha no primeiro login
        }
      });
      
      res.status(201).json({ message: 'Usuário criado com sucesso.', user });
    } catch (error) {
      console.error('[AdminController] Error createUser:', error);
      res.status(500).json({ error: 'Erro ao criar usuário.' });
    }
  }

  async deleteUser(req, res) {
    const { id } = req.params;
    
    // Safety check: Prevent admin from deleting themselves
    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta de administrador.' });
    }

    try {
      const prisma = getPrisma();
      
      // Delete themes of the user first or let cascade delete handle it if configured
      // We will reassign or delete their themes to avoid unlinked themes if not cascaded
      // Actually Prisma doesn't always cascade depending on schema, so let's delete their themes manually 
      // or at least detach them. The schema has ownerId String? so it can be set to null.
      await prisma.theme.updateMany({
        where: { ownerId: id },
        data: { ownerId: null }
      });

      await prisma.user.delete({
        where: { id }
      });
      res.json({ message: 'Usuário excluído com sucesso.' });
    } catch (error) {
      console.error('[AdminController] Error deleteUser:', error);
      res.status(500).json({ error: 'Erro ao excluir o usuário.' });
    }
  }
}


module.exports = new AdminController();
