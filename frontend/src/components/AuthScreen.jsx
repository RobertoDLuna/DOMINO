import React, { useState, useEffect, useRef } from "react";
import logoCampina from '../assets/logo-campina.png';
import logoPrefeitura from '../assets/logo-prefeitura.png';
import AuthService from "../services/AuthService";

import { API_URL } from '../config/api';

import { Podium } from './RankingBoard';

const PreviewPanel = ({ previews }) => {
   const [tab, setTab] = useState('GERAL');
   
   const getPodiumData = () => {
      switch(tab) {
         case 'GERAL': return previews?.topPlayers;
         case 'SCHOOLS': return previews?.topSchools;
         case 'CATEGORIES': return previews?.topCategories;
         case 'CREATOR': return previews?.topCreators;
         default: return [];
      }
   }

   const label = (tab === 'CREATOR' || tab === 'CATEGORIES') ? 'PARTIDAS' : 'PTS';
   const listData = getPodiumData() || [];
   const hasData = listData.length > 0;

   return (
     <div className="flex flex-col mt-4 w-full relative z-10">
         <div className="flex flex-wrap bg-black/15 p-2 rounded-2xl shadow-inner backdrop-blur-md self-start max-w-full border border-white/10 gap-1.5">
            <button onClick={()=>setTab('GERAL')} className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer ${tab==='GERAL' ? 'bg-[#FFCE00] text-emerald-900 shadow-md' : 'text-emerald-50 hover:bg-white/10'}`}>GERAL</button>
            <button onClick={()=>setTab('SCHOOLS')} className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer ${tab==='SCHOOLS' ? 'bg-[#FFCE00] text-emerald-900 shadow-md' : 'text-emerald-50 hover:bg-white/10'}`}>ESCOLAS</button>
            <button onClick={()=>setTab('CATEGORIES')} className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer ${tab==='CATEGORIES' ? 'bg-[#FFCE00] text-emerald-900 shadow-md' : 'text-emerald-50 hover:bg-white/10'}`}>NÍVEIS</button>
            <button onClick={()=>setTab('CREATOR')} className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer ${tab==='CREATOR' ? 'bg-[#FFCE00] text-emerald-900 shadow-md' : 'text-emerald-50 hover:bg-white/10'}`}>AUTORES</button>
         </div>

         {!hasData ? (
            <div className="flex flex-col items-center justify-center p-6 bg-black/10 rounded-[2rem] border border-white/10 text-center mt-5 backdrop-blur-sm self-start min-w-[200px]">
               <span className="text-4xl opacity-50 grayscale mb-2">🏆</span>
               <p className="text-emerald-100/40 italic text-[9px] font-bold uppercase tracking-widest mt-2">Nenhuma liderança ainda.</p>
            </div>
         ) : (
            <div className="w-full flex justify-center">
               <Podium mode={tab} top3={listData.slice(0, 3)} align="center" className="mt-16 sm:mt-20 mb-1" isWidget={true} />
            </div>
         )}
         
         {/* Cartões do 4º e 5º Lado Esquerdo Verde */}
         {listData.length > 3 && (
            <div className="mt-2 flex flex-col gap-2.5 pl-2 max-w-[340px]">
               {listData.slice(3, 5).map((user, idx) => {
                  const realPos = idx + 4;
                  return (
                     <div key={user.id || user.name} className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5 shadow-sm backdrop-blur-sm opacity-90 transition-all hover:opacity-100 hover:bg-black/30">
                        <div className="w-8 h-8 rounded-full font-black text-xs text-white/50 bg-black/30 border border-white/10 shrink-0 flex items-center justify-center">
                           {realPos}º
                        </div>
                        <div className="flex-1 overflow-hidden">
                           <h3 className="font-black text-white/80 text-[11px] sm:text-xs truncate uppercase">{user.name}</h3>
                           <p className="text-[8px] uppercase font-bold text-white/40 tracking-widest truncate">{user.school || 'Sem vínculo'}</p>
                        </div>
                        <div className="text-right">
                           <div className="font-black text-lg text-[#FFCE00]/80 leading-none">{user.points}</div>
                           <div className="text-[7px] font-black tracking-widest text-[#FFCE00]/50 uppercase mt-0.5">{label}</div>
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
     </div>
   )
}

const AuthScreen = ({ onAuthSuccess, onGuestStart, onJoinRoom }) => {
  const [view, setView] = useState("login"); // login, register
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schools, setSchools] = useState([]);
  
  const [previews, setPreviews] = useState({ topPlayers: [], topCreators: [] });
  const [showDrawer, setShowDrawer] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    schoolId: "",
    role: "EXTERNO"
  });
  const passwordRef = useRef(null);

  useEffect(() => {
    AuthService.getSchools().then(s => setSchools(s || [])).catch(console.error);
    
    fetch(`${API_URL}/ranking/preview`)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setPreviews(data))
      .catch(console.error);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...formData, password: passwordRef.current?.value || "" };
      const result = await AuthService.register(payload);
      onAuthSuccess(result.user, result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const pwd = passwordRef.current?.value || "";
      const result = await AuthService.login(formData.email, pwd);
      onAuthSuccess(result.user, result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans relative">
      {/* ======= LADO ESQUERDO (AZUL/VERDE): Institucional & Ranking ======= */}
      
      {/* Mobile Drawer (Sobrepõe o lado direito no celular) */}
      <div className={`fixed inset-y-0 left-0 w-[85%] max-w-sm bg-[#009660] z-50 transform transition-transform duration-300 flex flex-col p-8 overflow-y-auto ${showDrawer ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} lg:hidden`}>
         <div className="flex justify-between items-center mb-8 relative z-10">
           <h2 className="text-3xl font-black italic uppercase text-[#FFCE00]">DOMINÓ</h2>
           <button onClick={() => setShowDrawer(false)} className="text-white bg-black/20 w-8 h-8 rounded-full flex items-center justify-center">✕</button>
         </div>
         <p className="text-emerald-100/80 text-sm font-medium mb-6 relative z-10">Plataforma educacional para aprendizado lúdico através do dominó.</p>
         <PreviewPanel previews={previews} />
      </div>
      {/* Overlay Escuro Mobile */}
      {showDrawer && <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setShowDrawer(false)}></div>}

      {/* Desktop Exclusivo */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#009660] flex-col justify-center items-center p-8 xl:p-16 relative overflow-hidden">
        {/* Background blobs elegantes */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#FFCE00]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col justify-center">
           <h1 className="text-5xl xl:text-6xl font-black drop-shadow-[0_5px_0_rgba(0,0,0,0.2)] tracking-tighter italic uppercase text-[#FFCE00] leading-none mb-3 text-left">
             EDU <span className="text-white block">GAMES</span>
           </h1>
           <p className="text-emerald-100 text-base font-medium mb-4 border-l-4 border-[#FFCE00] pl-4 text-left leading-tight">
             Plataforma unificada para educadores e alunos. Aprendizado e diversão nas mesas virtuais de dominó.
           </p>

           <PreviewPanel previews={previews} />
        </div>
      </div>


      {/* ======= LADO DIREITO (BRANCO): Área do Input ======= */}
      
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 relative bg-slate-50 h-screen overflow-hidden">
        
        {/* Botão Mobile para abrir o Menu Lateral (Lado Esquerdo) */}
        <div className="absolute top-6 left-6 lg:hidden w-full px-6 py-2">
           <button onClick={() => setShowDrawer(true)} className="flex items-center gap-2 bg-[#009660]/10 text-[#009660] px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#009660]/20 transition-colors">
              <span>🏆</span> Destaques
           </button>
        </div>

        {/* Logos Responsivos no Formulário (Lobby) */}
        <header className="flex flex-col items-center mb-5 mt-8 lg:mt-0 lg:mb-6 shrink-0 z-10">
          <div className="flex items-center gap-6 bg-white px-8 py-4 rounded-[2rem] shadow-[0_4px_24px_rgba(0,0,0,0.07)] border border-slate-100 mb-5">
            <img src={logoCampina} alt="Seduc Campina Grande" className="h-12 sm:h-14 w-auto object-contain pointer-events-none" />
            <div className="w-px h-10 bg-slate-200"></div>
            <img src={logoPrefeitura} alt="Prefeitura" className="h-12 sm:h-14 w-auto object-contain pointer-events-none" />
          </div>
          
          <h2 className="text-3xl font-black text-slate-800 uppercase italic mb-1 tracking-tight text-center lg:hidden">
            EDU <span className="text-[#009660]">GAMES</span>
          </h2>
          <p className="text-slate-500 font-medium text-xs text-center max-w-xs leading-relaxed">
            {view === "register" ? "Crie sua conta para começar a jogar" : "Bem-vindo de volta! Entre na sua conta para continuar"}
          </p>
        </header>

        {/* Caixote do Formulário */}
        <div className="bg-white p-7 sm:p-9 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-slate-100 w-full max-w-[26rem] flex flex-col z-10">
          
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-xl border-2 border-red-100 font-black text-[10px] uppercase mb-6 animate-in shake">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={view === "register" ? handleRegister : handleLogin} className="space-y-3">
            {view === "register" && (
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-4 mb-0.5 block">Nome Completo</label>
                <input required type="text" placeholder="Ex: Roberto D. Luna" className="w-full bg-slate-50 border-2 border-slate-100 p-3 sm:p-3.5 rounded-[1.25rem] font-bold text-slate-800 text-sm outline-none focus:border-[#009660] transition-all" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
              </div>
            )}

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-4 mb-0.5 block">Endereço de E-mail</label>
              <input required type="email" placeholder="seu@email.com" className="w-full bg-slate-50 border-2 border-slate-100 p-3 sm:p-3.5 rounded-[1.25rem] font-bold text-slate-800 text-sm outline-none focus:border-[#009660] transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })} />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-4 mb-0.5 block">Sua Senha</label>
              <input required type="password" ref={passwordRef} placeholder="••••••••" className="w-full bg-slate-50 border-2 border-slate-100 p-3 sm:p-3.5 rounded-[1.25rem] font-bold text-slate-800 text-sm outline-none focus:border-[#009660] transition-all" />
            </div>

            {view === "register" && (
              <>
                <div className="pt-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-4 mb-0.5 block">Vínculo Escolar</label>
                  <select
                    required={['PROFESSOR', 'ALUNO'].includes(formData.role)}
                    disabled={formData.role === 'EXTERNO'}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-3.5 rounded-[1.25rem] font-bold text-slate-800 text-xs outline-none focus:border-[#009660] transition-all uppercase appearance-none"
                    value={formData.role === 'EXTERNO' ? '' : formData.schoolId}
                    onChange={e => setFormData({ ...formData, schoolId: e.target.value })}
                  >
                    <option value="">— ESCOLA OU EXTERNO —</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-[1rem] border border-slate-200 mt-1">
                  {["PROFESSOR", "ALUNO", "EXTERNO"].map(role => (
                    <button type="button" key={role} onClick={() => setFormData({ ...formData, role })} className={`py-2 rounded-[10px] text-[8px] font-black tracking-widest transition-all ${formData.role === role ? 'bg-[#009660] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
                      {role}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button disabled={loading} className="w-full bg-[#009660] text-emerald-50 py-4 sm:py-4 rounded-[1.25rem] font-black text-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all mt-4 disabled:opacity-50">
              {loading ? "PROCESSANDO..." : view === "register" ? "CRIAR CONTA" : "ENTRAR NO JOGO"}
            </button>
          </form>

          <button onClick={() => setView(view === "login" ? "register" : "login")} className="text-slate-400 hover:text-slate-600 font-bold text-xs pt-5 text-center group transition-colors">
            {view === "login" ? (
              <>Não tem conta? <span className="text-[#009660] group-hover:underline">Cadastre-se</span></>
            ) : (
              <>Já tenho uma conta. <span className="text-[#009660] group-hover:underline">Fazer Login</span></>
            )}
          </button>
        </div>
        
        {/* Guest & Room Fallbacks area (abaixo do card) */}
        <div className="flex justify-center gap-4 mt-6 z-10 shrink-0">
           <button onClick={onGuestStart} className="text-slate-400 hover:text-[#009660] font-black text-[9px] uppercase tracking-widest transition-colors flex items-center gap-1.5">
             <span>🎮</span> Jogar Sem Conta
           </button>
           <span className="text-slate-200">|</span>
           <button onClick={onJoinRoom} className="text-slate-400 hover:text-[#009660] font-black text-[9px] uppercase tracking-widest transition-colors flex items-center gap-1.5">
             <span>🔑</span> Entrar em Sala
           </button>
        </div>

        <p className="absolute bottom-4 text-[8px] font-black text-slate-300 uppercase tracking-widest pointer-events-none z-10">
          © 2026 EduCampina. Todos os direitos.
        </p>

      </div>
    </div>
  );
};

export default AuthScreen;
