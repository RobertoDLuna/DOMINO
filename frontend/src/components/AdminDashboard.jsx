import React, { useState, useEffect } from 'react';
import AdminService from '../services/AdminService';

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('pending'); // pending, users
  const [stats, setStats] = useState({ users: 0, schools: 0, themes: 0, pendingThemes: 0 });
  const [pendingThemes, setPendingThemes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, pendingData, usersData] = await Promise.all([
        AdminService.getStats(),
        AdminService.getPendingApprovals(),
        AdminService.getUsers()
      ]);
      setStats(statsData);
      setPendingThemes(pendingData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id) => {
    try {
      await AdminService.approveTheme(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (id) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este tema rejeitado?")) return;
    try {
      await AdminService.rejectTheme(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (user) => {
    const tempPassword = prompt(`Digite a nova senha temporária para ${user.fullName}:\n\nO usuário será avisado para alterar esta senha no próximo login.`, 'aluno123');
    if (!tempPassword) return; // User cancelled
    
    try {
      await AdminService.resetUserPassword(user.id, tempPassword);
      alert(`✅ Senha temporária de ${user.fullName} definida como: ${tempPassword}\n\nO usuário precisará alterar no próximo login.`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id, fullName) => {
    if (!confirm(`⚠️ CUIDADO: Tem certeza que deseja excluir o usuário ${fullName} permanentemente e apagar seus temas associados?`)) return;
    try {
      await AdminService.deleteUser(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-full bg-[#F0FDF4] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col p-4 sm:p-8 animate-in slide-in-from-right-10 duration-500 overflow-hidden border-l-8 border-[#009660]">
        <header className="flex justify-between items-center mb-8 relative z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="bg-white hover:bg-[#FFCE00] p-3 rounded-full shadow-lg transition-all flex items-center justify-center border-b-4 border-gray-200 hover:border-yellow-600 active:scale-95 group"
              title="Fechar Painel"
            >
              <span className="text-xl group-hover:-translate-x-1 transition-transform">X</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#009660] uppercase italic tracking-tighter drop-shadow-sm">PAINEL ADMIN</h1>
              <p className="text-[10px] font-black uppercase text-emerald-900/40 tracking-[0.2em]">Gestão da Plataforma</p>
            </div>
          </div>
        </header>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Usuários', value: stats.users, icon: '👤', color: 'bg-emerald-100/50 text-emerald-700' },
          { label: 'Escolas', value: stats.schools, icon: '🏫', color: 'bg-blue-100/50 text-blue-700' },
          { label: 'Temas Ativos', value: stats.themes - stats.pendingThemes, icon: '🎮', color: 'bg-purple-100/50 text-purple-700' },
          { label: 'Pendentes', value: stats.pendingThemes, icon: '⏳', color: 'bg-yellow-100/50 text-yellow-700' }
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-3xl ${stat.color} border-2 border-white/50 shadow-sm flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500 delay-${i*100}`}>
            <span className="text-4xl sm:text-5xl mb-2">{stat.icon}</span>
            <span className="text-3xl font-black">{stat.value}</span>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 sm:flex-none px-8 py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-[#FFCE00] text-[#009660] shadow-[0_4px_0_#d1a900]' : 'bg-white text-emerald-900/50 hover:bg-emerald-50'}`}
        >
          Aprovações ({stats.pendingThemes})
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex-1 sm:flex-none px-8 py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-[#FFCE00] text-[#009660] shadow-[0_4px_0_#d1a900]' : 'bg-white text-emerald-900/50 hover:bg-emerald-50'}`}
        >
          Usuários Registrados
        </button>
      </div>

      <div className="bg-white flex-1 rounded-[2.5rem] shadow-xl border-[10px] border-emerald-900/5 p-6 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-emerald-600 font-black animate-pulse">
            CARREGANDO DADOS...
          </div>
        ) : activeTab === 'pending' ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {pendingThemes.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <span className="text-6xl block mb-4">✨</span>
                <p className="font-black uppercase tracking-widest text-emerald-900">Nenhum tema pendente</p>
              </div>
            ) : (
              pendingThemes.map(theme => (
                <div key={theme.id} className="bg-emerald-50 rounded-3xl p-6 border-2 border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-2">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-600 shadow-sm border border-emerald-100">
                         {theme.category?.name} {theme.subcategory?.name ? ` › ${theme.subcategory?.name}` : ''}
                       </span>
                    </div>
                    <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tight mb-1">{theme.name}</h3>
                    <p className="text-xs font-bold text-emerald-800/60 leading-relaxed mb-3">"{theme.description}"</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👨‍🏫</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900/60">
                        {theme.owner?.fullName} ({theme.owner?.email})
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex sm:flex-col gap-3 w-full sm:w-auto shrink-0">
                    <button onClick={() => handleApprove(theme.id)} className="flex-1 sm:flex-none bg-[#009660] hover:bg-[#00a86b] text-white py-3 px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_4px_0_#006d46] active:translate-y-1 active:shadow-none transition-all">
                      Aprovar ✓
                    </button>
                    <button onClick={() => handleReject(theme.id)} className="flex-1 sm:flex-none bg-red-100 hover:bg-red-200 text-red-600 py-3 px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_4px_0_#fda4af] active:translate-y-1 active:shadow-none transition-all">
                      Rejeitar ✗
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-2xl border-2 border-emerald-50">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-emerald-100/50 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-emerald-900/50">Nome</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-emerald-900/50">E-mail</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-emerald-900/50">Função</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-emerald-900/50">Escola</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-emerald-900/50">Data</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-emerald-900/50 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map(u => (
                  <tr key={u.id} className="border-b-2 border-emerald-50 hover:bg-emerald-50/50 transition-colors">
                    <td className="p-4 font-black text-emerald-900 uppercase">{u.fullName}</td>
                    <td className="p-4 font-bold text-emerald-800/70">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : u.role === 'PROFESSOR' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-emerald-800/70">{u.school?.name || 'EXTERNO'}</td>
                    <td className="p-4 font-bold text-emerald-800/50 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                       <div className="flex items-center justify-end gap-2">
                         <button 
                           onClick={() => handleResetPassword(u)}
                           className="bg-gray-100 hover:bg-yellow-100 text-gray-500 hover:text-yellow-700 p-2 rounded-xl text-xs font-black uppercase transition-colors"
                           title="Resetar Senha"
                         >
                           🔑
                         </button>
                         {u.role !== 'ADMIN' && (
                           <button 
                             onClick={() => handleDeleteUser(u.id, u.fullName)}
                             className="bg-red-50 hover:bg-red-500 text-red-400 hover:text-white p-2 rounded-xl text-xs font-black uppercase transition-colors"
                             title="Excluir Usuário"
                           >
                             🗑️
                           </button>
                         )}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default AdminDashboard;
