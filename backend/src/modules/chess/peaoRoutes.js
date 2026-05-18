const express = require('express');
const router = express.Router();
const peaoRankingService = require('./PeaoRankingService');

router.get('/students', async (req, res) => {
  try {
    const ranking = await peaoRankingService.getStudentRanking();
    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ranking de alunos da Batalha dos Peões' });
  }
});

router.get('/schools', async (req, res) => {
  try {
    const ranking = await peaoRankingService.getSchoolRanking();
    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ranking de escolas da Batalha dos Peões' });
  }
});

router.get('/preview', async (req, res) => {
  try {
    const preview = await peaoRankingService.getPreviewRanking();
    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar preview do ranking da Batalha dos Peões' });
  }
});

module.exports = router;
