const express = require('express');
const router = express.Router();
const ChessReportService = require('./ChessReportService');

/**
 * GET /api/chess/reports/player/:userId
 * Retorna estatísticas (wins/losses) e histórico de partidas de um jogador.
 */
router.get('/player/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const stats = await ChessReportService.getPlayerStats(userId);
        res.json(stats);
    } catch (error) {
        console.error('Erro na rota de relatórios do jogador de xadrez:', error);
        res.status(500).json({ error: "Erro interno ao buscar estatísticas do xadrez." });
    }
});

module.exports = router;
