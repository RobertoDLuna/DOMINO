const express = require('express');
const router = express.Router();
const velhaRankingService = require('./VelhaRankingService');

router.get('/students', async (req, res) => {
  try {
    const ranking = await velhaRankingService.getStudentRanking();
    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ranking de alunos do Xadrez da Velha' });
  }
});

router.get('/schools', async (req, res) => {
  try {
    const ranking = await velhaRankingService.getSchoolRanking();
    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ranking de escolas do Xadrez da Velha' });
  }
});

router.get('/preview', async (req, res) => {
  try {
    const preview = await velhaRankingService.getPreviewRanking();
    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar preview do ranking' });
  }
});

module.exports = router;
