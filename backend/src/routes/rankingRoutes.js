const express = require('express');
const RankingService = require('../services/RankingService');
const router = express.Router();

// GET /api/ranking
router.get('/', async (req, res) => {
    try {
        const { themeId, categoryId, subcategoryId, type } = req.query;
        let leaderboard = [];

        if (type === 'CREATORS') {
            leaderboard = await RankingService.getCreatorsLeaderboard();
        } else {
            leaderboard = await RankingService.getLeaderboard({ themeId, categoryId, subcategoryId });
        }
        res.json(leaderboard);
    } catch (error) {
        console.error('Erro na rota de ranking:', error);
        res.status(500).json({ error: "Erro interno ao buscar ranking." });
    }
});

// GET /api/ranking/preview (Destaques públicos ofuscados)
router.get('/preview', async (req, res) => {
    try {
        const previewData = await RankingService.getPreviewLeaderboards();
        res.json(previewData);
    } catch (error) {
        console.error('Erro na rota de ranking/preview:', error);
        res.status(500).json({ error: "Erro interno ao buscar Destaques." });
    }
});

module.exports = router;
