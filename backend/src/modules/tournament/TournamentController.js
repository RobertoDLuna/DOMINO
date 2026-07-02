const TournamentService = require('./TournamentService');

const getSafeError = (error, defaultMessage) => {
  if (!error || !error.message) return defaultMessage;
  // Se for erro do Prisma (expondo dados, invocação), esconder!
  if (error.message.includes('prisma.') || error.message.includes('tx.') || error.message.includes('Invocation')) {
    return defaultMessage;
  }
  return error.message;
};

class TournamentController {
  async getTournaments(req, res) {
    try {
      const filters = req.query;
      const tournaments = await TournamentService.getTournaments(filters);
      res.json(tournaments);
    } catch (error) {
      console.error("[TournamentController] getTournaments error:", error);
      res.status(500).json({ error: "Erro ao buscar campeonatos." });
    }
  }

  async getTournament(req, res) {
    try {
      const { id } = req.params;
      const tournament = await TournamentService.getTournamentById(id);
      if (!tournament) return res.status(404).json({ error: "Campeonato não encontrado." });
      res.json(tournament);
    } catch (error) {
      console.error("[TournamentController] getTournament error:", error);
      res.status(500).json({ error: "Erro ao buscar campeonato." });
    }
  }

  async createTournament(req, res) {
    try {
      if (req.user.role !== 'ADMIN' && req.user.role !== 'PROFESSOR') {
        return res.status(403).json({ error: "Apenas administradores e professores podem criar campeonatos." });
      }
      
      const tournament = await TournamentService.createTournament(req.body, req.user.id);
      res.status(201).json(tournament);
    } catch (error) {
      console.error("[TournamentController] createTournament error:", error);
      res.status(400).json({ error: getSafeError(error, "Erro ao criar campeonato.") });
    }
  }

  async updateTournament(req, res) {
    try {
      const { id } = req.params;
      const tournament = await TournamentService.updateTournament(id, req.body, req.user.id, req.user.role);
      res.json(tournament);
    } catch (error) {
      console.error("[TournamentController] updateTournament error:", error);
      res.status(400).json({ error: getSafeError(error, "Erro ao atualizar campeonato.") });
    }
  }

  async deleteTournament(req, res) {
    try {
      const { id } = req.params;
      await TournamentService.deleteTournament(id, req.user.id, req.user.role);
      res.status(204).send();
    } catch (error) {
      console.error("[TournamentController] deleteTournament error:", error);
      res.status(400).json({ error: getSafeError(error, "Erro ao deletar campeonato.") });
    }
  }

  async joinTournament(req, res) {
    try {
      const { id } = req.params;
      const participant = await TournamentService.joinTournament(id, req.user);
      res.status(201).json(participant);
    } catch (error) {
      console.error("[TournamentController] joinTournament error:", error);
      res.status(400).json({ error: getSafeError(error, "Erro ao se inscrever no campeonato.") });
    }
  }

  async leaveTournament(req, res) {
    try {
      const { id } = req.params;
      await TournamentService.leaveTournament(id, req.user.id);
      res.status(204).send();
    } catch (error) {
      console.error("[TournamentController] leaveTournament error:", error);
      res.status(400).json({ error: getSafeError(error, "Erro ao sair do campeonato.") });
    }
  }

  async startTournament(req, res) {
    try {
      const { id } = req.params;
      await TournamentService.startTournament(id, req.user.id, req.user.role);
      res.json({ message: "Campeonato iniciado com sucesso!" });
    } catch (error) {
      console.error("[TournamentController] startTournament error:", error);
      res.status(400).json({ error: getSafeError(error, "Erro ao iniciar campeonato.") });
    }
  }

  async registerMatchResult(req, res) {
    try {
      const { id, matchId } = req.params;
      await TournamentService.registerMatchResult(id, matchId, req.body, req.user.id, req.user.role);
      res.json({ message: "Resultado registrado com sucesso." });
    } catch (error) {
      console.error("[TournamentController] registerMatchResult error:", error);
      res.status(400).json({ error: getSafeError(error, "Erro ao registrar resultado.") });
    }
  }
}

module.exports = new TournamentController();
