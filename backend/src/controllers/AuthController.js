const { getPrisma } = require('../config/prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'domino-secret-key-2026';

class AuthController {
  async register(req, res) {
    let { fullName, email, password, schoolId, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: "Todos os campos obrigatórios devem ser preenchidos." });
    }
    
    email = email.toLowerCase();

    try {
      const prisma = getPrisma();
      
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "Este e-mail já está em uso." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          schoolId: schoolId ? parseInt(schoolId) : null,
          role: role.toUpperCase()
        },
        include: { school: true }
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          school: user.school?.name || null
        }
      });
    } catch (error) {
      console.error('[AuthController] Error in register:', error);
      res.status(500).json({ error: "Erro ao realizar cadastro." });
    }
  }

  async login(req, res) {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }
    
    email = email.toLowerCase();

    try {
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ 
        where: { email },
        include: { school: true }
      });

      if (!user) {
        return res.status(401).json({ error: "E-mail ou senha inválidos." });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "E-mail ou senha inválidos." });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          school: user.school?.name || null
        }
      });
    } catch (error) {
      console.error('[AuthController] Error in login:', error);
      res.status(500).json({ error: "Erro ao realizar login." });
    }
  }

  async changePassword(req, res) {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    try {
      const prisma = getPrisma();
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          password: hashedPassword,
          mustChangePassword: false
        },
        include: { school: true }
      });

      const token = jwt.sign(
        { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: "Senha alterada com sucesso.",
        token,
        user: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
          mustChangePassword: false,
          school: updatedUser.school?.name || null
        }
      });
    } catch (error) {
      console.error('[AuthController] Error in changePassword:', error);
      res.status(500).json({ error: "Erro ao atualizar senha." });
    }
  }

  async me(req, res) {
    // req.user is populated by authMiddleware
    try {
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { school: true }
      });

      if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

      res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        school: user.school?.name || null
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar dados do usuário." });
    }
  }
}


module.exports = new AuthController();
