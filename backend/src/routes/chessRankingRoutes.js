const express = require('express');
const router = express.Router();
const chessRankingService = require('../services/ChessRankingService');

/**
 * GET /api/chess/ranking
 * Retorna o ranking completo de alunos e escolas
 */
router.get('/', async (req, res) => {
    try {
        const [students, schools] = await Promise.all([
            chessRankingService.getStudentRanking(),
            chessRankingService.getSchoolRanking()
        ]);

        res.json({
            students,
            schools
        });
    } catch (error) {
        console.error('Erro na rota de ranking de xadrez:', error);
        res.status(500).json({ error: "Erro interno ao buscar ranking de xadrez." });
    }
});

/**
 * GET /api/chess/ranking/preview
 * Destaques públicos para a tela de login
 */
router.get('/preview', async (req, res) => {
    try {
        const preview = await chessRankingService.getPreviewRanking();
        res.json(preview);
    } catch (error) {
        console.error('Erro na rota de ranking/preview de xadrez:', error);
        res.status(500).json({ error: "Erro interno ao buscar preview de xadrez." });
    }
});

module.exports = router;
