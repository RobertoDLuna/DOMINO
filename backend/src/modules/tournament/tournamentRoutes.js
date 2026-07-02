const express = require('express');
const router = express.Router();
const TournamentController = require('./TournamentController');
const TournamentRankingService = require('./TournamentRankingService');
const { authMiddleware } = require('../../shared/middleware/authMiddleware'); // Supondo o authMiddleware padrão

// Ranking routes (Públicas)
router.get('/ranking', async (req, res) => {
  try {
    const ranking = await TournamentRankingService.getRanking();
    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar ranking." });
  }
});

// Tournament routes (Públicas/Leitura)
router.get('/', TournamentController.getTournaments);
router.get('/:id', TournamentController.getTournament);

// Rotas protegidas (Requer login)
router.use(authMiddleware);

router.post('/', TournamentController.createTournament);
router.patch('/:id', TournamentController.updateTournament);
router.delete('/:id', TournamentController.deleteTournament);

router.post('/:id/join', TournamentController.joinTournament);
router.delete('/:id/leave', TournamentController.leaveTournament);

router.post('/:id/start', TournamentController.startTournament);
router.post('/:id/matches/:matchId/result', TournamentController.registerMatchResult);

module.exports = router;
