const express = require('express');
const RankingService = require('../services/RankingService');
const router = express.Router();

// GET /api/ranking
router.get('/', async (req, res) => {
    try {
        const { themeId, categoryId, subcategoryId } = req.query;
        const leaderboard = await RankingService.getLeaderboard({ themeId, categoryId, subcategoryId });
        res.json(leaderboard);
    } catch (error) {
        console.error('Erro na rota de ranking:', error);
        res.status(500).json({ error: "Erro interno ao buscar ranking." });
    }
});

module.exports = router;
