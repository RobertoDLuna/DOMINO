import React, { useState, useEffect, useRef } from 'react';
import AdminService from '../services/AdminService';
import AuthService from '../services/AuthService';

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('pending'); // pending, users
  const [stats, setStats] = useState({ users: 0, schools: 0, themes: 0, pendingThemes: 0 });
  const [pendingThemes, setPendingThemes] = useState([]);
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Context
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', role: 'EXTERNO', schoolId: '' });
  const newUserPasswordRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentUser = AuthService.getCurrentUser();

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase());
        
        const schoolsToImport = lines.slice(1).map(line => {
          const values = line.split(/[;,]/).map(v => v.trim());
          if (values.length < 1) return null;
          
          let schoolObj = {};
          headers.forEach((header, index) => {
            if (header.includes('nome') || header.includes('escola')) schoolObj.name = values[index];
            if (header.includes('inep')) schoolObj.inep = values[index];
            if (header.includes('endereço') || header.includes('address')) schoolObj.address = values[index];
            if (header.includes('telefone') || header.includes('phone')) schoolObj.phone = values[index];
            if (header.includes('email')) schoolObj.email = values[index];
            if (header.includes('cnpj')) schoolObj.cnpj = values[index];
            if (header.includes('diretor')) schoolObj.director = values[index];
          });
          
          return schoolObj.name ? schoolObj : null;
        }).filter(s => s !== null);

        if (schoolsToImport.length === 0) {
          alert('Nenhuma escola válida encontrada no CSV.');
          return;
        }

        setLoading(true);
        const result = await AdminService.importSchools(schoolsToImport);
        alert(`✅ ${result.count} escolas importadas/atualizadas com sucesso!`);
        loadData();
      } catch (err) {
        alert('Erro ao processar CSV: ' + err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, pendingData, usersData, schoolsData] = await Promise.all([
        AdminService.getStats(),
        AdminService.getPendingApprovals(),
        AdminService.getUsers(),
        AuthService.getSchools()
      ]);
      setStats(statsData);
      setPendingThemes(pendingData);
      setUsers(usersData);
      setSchools(schoolsData);
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newUser, password: newUserPasswordRef.current?.value || '' };
      await AdminService.createUser(payload);
      alert('✅ Conta criada com sucesso! O novo usuário será forçado a criar sua própria senha no primeiro login.');
      setShowCreateModal(false);
      setNewUser({ fullName: '', email: '', role: 'EXTERNO', schoolId: '' });
      if (newUserPasswordRef.current) newUserPasswordRef.current.value = '';
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      {/* OVERLAY / MODAL - Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[3.5rem] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 border-b-[8px] border-emerald-900/10">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full font-black text-xs">X</button>
            <h2 className="text-2xl font-black text-emerald-900 uppercase italic mb-6">Criar Novo Usuário</h2>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <input required type="text" placeholder="NOME COMPLETO" className="w-full bg-emerald-50 border-2 border-emerald-100 p-4 rounded-xl font-black uppercase text-xs" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} />
              <input required type="email" placeholder="E-MAIL" className="w-full bg-emerald-50 border-2 border-emerald-100 p-4 rounded-xl font-black uppercase text-xs" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value.toLowerCase()})} />
              <input required type="password" ref={newUserPasswordRef} placeholder="SENHA INICIAL" className="w-full bg-emerald-50 border-2 border-emerald-100 p-4 rounded-xl font-black uppercase text-xs" />
              <select 
                required={['PROFESSOR', 'ALUNO'].includes(newUser.role)} 
                className="w-full bg-emerald-50 border-2 border-emerald-100 p-4 rounded-xl font-black uppercase text-xs disabled:opacity-50" 
                value={newUser.schoolId} 
                onChange={e => setNewUser({...newUser, schoolId: e.target.value})}
                disabled={['ADMIN', 'EXTERNO'].includes(newUser.role)}
              >
                <option value="">— SELECIONAR ESCOLA / EXTERNO —</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="grid grid-cols-4 gap-2 pt-2">
                {['ADMIN', 'PROFESSOR', 'ALUNO', 'EXTERNO'].map(role => (
                  <button key={role} type="button" onClick={() => setNewUser({...newUser, role})} className={`py-2 rounded-xl text-[9px] font-black transition-all ${newUser.role === role ? 'bg-[#009660] text-white' : 'bg-gray-100 text-gray-400'}`}>{role}</button>
                ))}
              </div>
              <button type="submit" className="w-full bg-[#FFCE00] text-emerald-900 py-4 mt-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_6px_0_#d1a900] hover:translate-y-1 hover:shadow-[0_3px_0_#d1a900] active:translate-y-2 active:shadow-none transition-all">CRIAR CONTA ✨</button>
            </form>
          </div>
        </div>
      )}

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 shrink-0">
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
        
        {/* Importador de Escolas em destaque */}
        <div className="mb-6 bg-blue-50 border-2 border-blue-100 p-6 rounded-[2rem] flex items-center justify-between animate-in slide-in-from-top-4 duration-700 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm text-2xl">🏫</div>
            <div>
              <h3 className="text-sm font-black text-blue-900 uppercase italic">Base de Dados de Escolas</h3>
              <p className="text-[10px] font-bold text-blue-700/60 uppercase tracking-widest">Importe o arquivo CSV para atualizar a lista do sistema</p>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileImport} 
            accept=".csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_4px_0_#1e3a8a] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
          >
            UPLOAD CSV 🚀
          </button>
        </div>

        <div className="flex gap-4 mb-6 sticky top-0 bg-[#F0FDF4] z-20 py-2 items-center justify-between shrink-0">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white shadow-md text-emerald-900' : 'text-emerald-900/40 hover:bg-white/50'}`}
            >
              Aprovações ({stats.pendingThemes})
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-[#FFCE00] shadow-[0_4px_0_#d1a900] text-emerald-900' : 'text-emerald-900/40 hover:bg-white/50'}`}
            >
              Usuários Registrados
            </button>
          </div>
          {activeTab === 'users' && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-[#009660] hover:bg-[#00a86b] text-white px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-[0_4px_0_#006d46] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
            >
              ✍️ Criar Conta
            </button>
          )}
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
                         {(currentUser?.email === 'robertocgw@gmail.com' || u.email !== 'robertocgw@gmail.com') && u.id !== currentUser?.id && (
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
