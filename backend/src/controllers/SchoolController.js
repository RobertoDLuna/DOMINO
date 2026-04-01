const { getPrisma } = require('../config/prismaClient');

class SchoolController {
  async list(req, res) {
    try {
      const prisma = getPrisma();
      const schools = await prisma.school.findMany({
        orderBy: { name: 'asc' }
      });
      res.json(schools);
    } catch (error) {
       console.error('[SchoolController] Error in list:', error);
       res.status(500).json({ error: "Erro ao listar escolas." });
    }
  }
}

module.exports = new SchoolController();
