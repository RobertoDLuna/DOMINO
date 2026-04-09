import React, { useState, useEffect, useRef } from "react";
import logoCampina from '../assets/logo-campina.png';
import logoPrefeitura from '../assets/logo-prefeitura.png';
import AuthService from "../services/AuthService";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TrophySVG = ({ fill = '#FFE066', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 4h28v22c0 9-6.5 14-14 14S10 35 10 26V4z" fill={fill} opacity="0.95"/>
    <path d="M10 8H5a5 5 0 0 0 5 5V8z" fill={fill} opacity="0.65"/>
    <path d="M38 8h5a5 5 0 0 1-5 5V8z" fill={fill} opacity="0.65"/>
    <rect x="20" y="40" width="8" height="6" rx="1" fill={fill} opacity="0.8"/>
    <rect x="14" y="46" width="20" height="4" rx="2" fill={fill}/>
    <path d="M24 13l2 5h5.5l-4.5 3.2 1.7 5.3L24 23l-4.7 3.5 1.7-5.3L16.5 18H22z" fill="white" opacity="0.85"/>
    <path d="M15 9 Q17 15 15 22" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
  </svg>
);

const SparkSVG = ({ fill = '#FFD700', size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={fill}><path d="M10 0L11.8 8.2L20 10L11.8 11.8L10 20L8.2 11.8L0 10L8.2 8.2Z"/></svg>
);

// BAR_W fixo para todas as 3 colunas — só barH varia.
const BAR_W = 80;
const PODIUM_CONFIG = {
  1: { outerDiamond: '#8B6508', innerGrad: ['#FFD700','#FFC200'], cupFill: '#FFF8C0', spark: '#FFE566', barBg: '#FFCE00', barTop: '#9A6B00', barH: 110, tSize: 32, dSize: 68 },
  2: { outerDiamond: '#4A4A4A', innerGrad: ['#D4D4D4','#A0A0A0'], cupFill: '#EFEFEF', spark: '#C8C8C8', barBg: '#BABABA', barTop: '#5A5A5A', barH: 84,  tSize: 24, dSize: 54 },
  3: { outerDiamond: '#5C2D0E', innerGrad: ['#C87832','#9A5020'], cupFill: '#FFDAAA', spark: '#D08838', barBg: '#E07828', barTop: '#6A3010', barH: 62,  tSize: 20, dSize: 46 },
};

const MiniPodium = ({ top3, mode }) => {
  if (!top3 || top3.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-black/10 rounded-[2rem] border border-white/10 text-center mt-5 backdrop-blur-sm">
         <TrophySVG fill="rgba(255,255,255,0.15)" size={32}/>
         <p className="text-emerald-100/40 italic text-[9px] font-bold uppercase tracking-widest mt-2">Nenhuma liderança ainda.</p>
      </div>
    );
  }
  
  const reordered = [];
  if (top3.length > 1) reordered.push({ ...top3[1], pos: 2 });
  if (top3.length > 0) reordered.push({ ...top3[0], pos: 1 });
  if (top3.length > 2) reordered.push({ ...top3[2], pos: 3 });

  const label = (mode === 'CREATOR' || mode === 'CATEGORIES') ? 'PARTIDAS' : 'PTS';

  // Nome truncado de forma inteligente — nunca quebra no meio de palavra
  const getDisplayName = (name) => {
    if (mode === 'SCHOOLS') {
       const cleaned = name.replace(/Escola|Municipal|Estadual|Col[eé]gio|EMEF|-/gi, '').trim();
       const w = cleaned.split(' ').filter(Boolean);
       return w.length >= 2 ? `${w[0]} ${w[1].charAt(0)}.` : (w[0] || name.split(' ')[0]);
    }
    if (mode === 'CATEGORIES') return name.substring(0, 12).trim();
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0];
    // Ex: "Roberto Luna" → "Roberto L."  |  se 1 palavra apenas, mostra só ela
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };

  return (
    <div className="flex justify-center items-end gap-3 pb-2 relative mt-8 w-full">
      {reordered.map((u) => {
        const cfg = PODIUM_CONFIG[u.pos];
        const isFirst = u.pos === 1;

        return (
          <div key={u.id ?? u.name} className="flex flex-col items-center" style={{ width: BAR_W }}>

            {/* Losango + Troféu — flutua acima, pequeno overlap fixo de 18px */}
            <div className="relative flex items-center justify-center z-20"
              style={{ width: cfg.dSize, height: cfg.dSize, marginBottom: -18 }}>
              {/* Losango externo */}
              <div className="absolute inset-0 shadow-[0_6px_20px_rgba(0,0,0,0.28)]"
                style={{ background: cfg.outerDiamond, transform: 'rotate(45deg)', borderRadius: 9 }}/>
              {/* Losango interno metálico */}
              <div className="absolute"
                style={{
                  inset: 6, borderRadius: 6, transform: 'rotate(45deg)',
                  background: `linear-gradient(145deg, ${cfg.innerGrad[0]}, ${cfg.innerGrad[1]})`
                }}/>
              {/* Troféu */}
              <div className="relative z-10 drop-shadow-md flex items-center justify-center">
                <TrophySVG fill={cfg.cupFill} size={cfg.tSize}/>
              </div>
              {/* Sparkles */}
              <div className="absolute -top-2 -right-1"><SparkSVG fill={cfg.spark} size={isFirst ? 10 : 8}/></div>
              <div className="absolute top-1 left-0 opacity-55"><SparkSVG fill={cfg.spark} size={isFirst ? 7 : 6}/></div>
              <div className="absolute -bottom-1 -right-3 opacity-40"><SparkSVG fill={cfg.spark} size={7}/></div>
            </div>

            {/* Barra do Pódio — conteúdo ancorado na base (justify-end) */}
            <div className="flex flex-col items-center justify-end z-10 w-full overflow-hidden"
              style={{
                height: cfg.barH,
                background: cfg.barBg,
                borderTop: `5px solid ${cfg.barTop}`,
                borderRadius: '10px 10px 0 0',
                paddingBottom: 14,
                paddingLeft: 10,
                paddingRight: 10,
                boxShadow: 'inset 0 -8px 18px rgba(0,0,0,0.10), 0 4px 14px rgba(0,0,0,0.15)',
              }}>
              {/* Nome */}
              <span className="block text-center font-black uppercase w-full text-white overflow-hidden mb-0.5"
                style={{
                  fontSize: isFirst ? 11 : 9,
                  letterSpacing: '0.05em',
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                {getDisplayName(u.name)}
              </span>
              {/* Pontuação */}
              <span className="font-black leading-none text-white"
                style={{ fontSize: isFirst ? 28 : 20, textShadow: '0 2px 8px rgba(0,0,0,0.22)' }}>
                {u.points}
              </span>
              {/* Label */}
              <span className="font-black uppercase text-white/70 tracking-widest mt-0.5"
                style={{ fontSize: 7.5 }}>
                {label}
              </span>
            </div>

          </div>
        );
      })}
    </div>
  );
};

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

   return (
     <div className="flex flex-col mt-4 w-full relative z-10">
         <div className="flex flex-wrap bg-black/15 p-2 rounded-2xl shadow-inner backdrop-blur-md self-start max-w-full border border-white/10 gap-1.5">
            <button onClick={()=>setTab('GERAL')} className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer ${tab==='GERAL' ? 'bg-[#FFCE00] text-emerald-900 shadow-md' : 'text-emerald-50 hover:bg-white/10'}`}>GERAL</button>
            <button onClick={()=>setTab('SCHOOLS')} className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer ${tab==='SCHOOLS' ? 'bg-[#FFCE00] text-emerald-900 shadow-md' : 'text-emerald-50 hover:bg-white/10'}`}>ESCOLAS</button>
            <button onClick={()=>setTab('CATEGORIES')} className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer ${tab==='CATEGORIES' ? 'bg-[#FFCE00] text-emerald-900 shadow-md' : 'text-emerald-50 hover:bg-white/10'}`}>NÍVEIS</button>
            <button onClick={()=>setTab('CREATOR')} className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer ${tab==='CREATOR' ? 'bg-[#FFCE00] text-emerald-900 shadow-md' : 'text-emerald-50 hover:bg-white/10'}`}>AUTORES</button>
         </div>

         <MiniPodium mode={tab} top3={getPodiumData()} />
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
