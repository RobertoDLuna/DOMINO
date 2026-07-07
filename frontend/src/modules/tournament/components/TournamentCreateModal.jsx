import React, { useState } from 'react';
import TournamentService from '../services/TournamentService';

const TournamentCreateModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gameType: 'CHESS',
    format: 'ELIMINATION',
    maxPlayers: 8,
    startsAt: '',
    endsAt: ''
  });
  const [customPlayers, setCustomPlayers] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const players = customPlayers ? parseInt(customPlayers) : formData.maxPlayers;
    
    if (!players || isNaN(players) || players % 2 !== 0 || players < 4) {
      setError('O número de participantes deve ser um número par maior ou igual a 4.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(formData.startsAt + 'T00:00:00'); // Garante que a data local seja parseada corretamente
    
    if (startDate < today) {
      setError('A data de início não pode ser no passado.');
      return;
    }

    if (new Date(formData.startsAt) > new Date(formData.endsAt)) {
      setError('A data de término não pode ser anterior à data de início.');
      return;
    }

    try {
      setLoading(true);
      await TournamentService.createTournament({
        ...formData,
        maxPlayers: players
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao criar campeonato');
    } finally {
      setLoading(false);
    }
  };

  const presetSizes = [4, 8, 16, 32];

  return (
    <div className="fixed inset-0 bg-emerald-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-emerald-100 shadow-2xl">
        <div className="sticky top-0 bg-white p-6 md:p-8 border-b border-emerald-50 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-black text-emerald-900 uppercase italic tracking-tighter">Novo Campeonato</h2>
            <p className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest mt-1">Configuração de Torneio Oficial</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center font-bold hover:bg-emerald-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold uppercase tracking-widest border border-red-100 text-center">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest">Nome do Campeonato *</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-emerald-50 border-none rounded-2xl px-4 py-3 text-emerald-900 font-medium focus:ring-2 focus:ring-[#009660] outline-none"
                placeholder="Ex: Copa Interescolar de Xadrez"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest">Tipo de Jogo *</label>
              <select 
                value={formData.gameType}
                onChange={e => setFormData({...formData, gameType: e.target.value})}
                className="w-full bg-emerald-50 border-none rounded-2xl px-4 py-3 text-emerald-900 font-black uppercase text-xs tracking-widest focus:ring-2 focus:ring-[#009660] outline-none appearance-none"
              >
                <option value="CHESS">Xadrez Real ♟️</option>
                <option value="DOMINO">Dominó Seduc 🀄</option>
                <option value="QUIZ">Mestre do Quiz 💡</option>
                <option value="PEAO">Batalha dos Peões 🛡️</option>
                <option value="VELHA">Xadrez da Velha ❌</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest">Formato *</label>
              <select 
                value={formData.format}
                onChange={e => setFormData({...formData, format: e.target.value})}
                className="w-full bg-emerald-50 border-none rounded-2xl px-4 py-3 text-emerald-900 font-black uppercase text-xs tracking-widest focus:ring-2 focus:ring-[#009660] outline-none appearance-none"
              >
                <option value="ELIMINATION">Eliminatórias (Bracket)</option>
                <option value="ROUND_ROBIN">Todos contra Todos</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest">Número de Participantes *</label>
              <div className="flex flex-wrap gap-2">
                {presetSizes.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => { setFormData({...formData, maxPlayers: size}); setCustomPlayers(''); }}
                    className={`px-4 py-2 rounded-xl font-black text-xs transition-colors ${
                      formData.maxPlayers === size && !customPlayers
                        ? 'bg-[#009660] text-white' 
                        : 'bg-emerald-50 text-emerald-900/60 hover:bg-emerald-100'
                    }`}
                  >
                    {size}
                  </button>
                ))}
                <input 
                  type="number" 
                  min="4"
                  step="2"
                  placeholder="Outro (Par)"
                  value={customPlayers}
                  onChange={e => setCustomPlayers(e.target.value)}
                  className={`w-32 bg-emerald-50 border-none rounded-xl px-4 py-2 text-emerald-900 font-black text-xs focus:ring-2 focus:ring-[#009660] outline-none ${customPlayers ? 'ring-2 ring-[#009660]' : ''}`}
                />
              </div>
              <p className="text-[9px] text-emerald-900/40 uppercase font-black tracking-widest">O número precisa ser par para permitir o chaveamento correto.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest">Data de Início *</label>
              <input 
                type="date" 
                required
                value={formData.startsAt}
                onChange={e => setFormData({...formData, startsAt: e.target.value})}
                className="w-full bg-emerald-50 border-none rounded-2xl px-4 py-3 text-emerald-900 font-medium focus:ring-2 focus:ring-[#009660] outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest">Data de Encerramento *</label>
              <input 
                type="date" 
                required
                value={formData.endsAt}
                onChange={e => setFormData({...formData, endsAt: e.target.value})}
                className="w-full bg-emerald-50 border-none rounded-2xl px-4 py-3 text-emerald-900 font-medium focus:ring-2 focus:ring-[#009660] outline-none"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-emerald-900/60 uppercase tracking-widest">Descrição / Regras (Opcional)</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-emerald-50 border-none rounded-2xl px-4 py-3 text-emerald-900 font-medium focus:ring-2 focus:ring-[#009660] outline-none min-h-[100px] resize-none"
                placeholder="Detalhes adicionais sobre o torneio..."
              />
            </div>
          </div>

          <div className="pt-6 border-t border-emerald-50 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs text-emerald-900/60 hover:bg-emerald-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#FFCE00] text-emerald-900 px-8 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-[#e6ba00] transition-colors shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Campeonato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TournamentCreateModal;
