const memoryService = require('./MemoryService');

class MemoryController {
  async finishGame(req, res, next) {
    try {
      const user = req.user; // Obtido via middleware authMiddleware
      const payload = req.body;
      const result = await memoryService.finishGame(user, payload);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Erro ao finalizar partida de memória:", error);
      next(error);
    }
  }

  async getRanking(req, res, next) {
    try {
      const ranking = await memoryService.getRanking();
      return res.status(200).json({ success: true, data: ranking });
    } catch (error) {
      console.error("Erro ao buscar ranking de memória:", error);
      next(error);
    }
  }

  async getReports(req, res, next) {
    try {
      // Idealmente, adicionar paginação ou filtros aqui futuramente
      const reports = await memoryService.getReports();
      return res.status(200).json({ success: true, data: reports });
    } catch (error) {
      console.error("Erro ao buscar relatórios de memória:", error);
      next(error);
    }
  }
}

module.exports = new MemoryController();
