import React, { useState, useEffect, useRef } from "react";
import logoCampina from '../assets/logo-campina.png';
import logoPrefeitura from '../assets/logo-prefeitura.png';
import AuthService from "../services/AuthService";

const AuthScreen = ({ onAuthSuccess, onGuestStart }) => {
  const [view, setView] = useState("initial"); // initial, register, login
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schools, setSchools] = useState([]);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    schoolId: "",
    role: "EXTERNO"
  });
  const passwordRef = useRef(null);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const data = await AuthService.getSchools();
        setSchools(data || []);
      } catch (err) {
        console.error("Erro ao carregar escolas no AuthScreen:", err);
      }
    };

    if (view === "register") {
      fetchSchools();
    }
  }, [view]);

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

  if (view === "initial") {
    return (
      <div className="min-h-screen bg-[#009660] flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-[#FFCE00]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>

        {/* Logos container matching Lobby */}
        <header className="flex flex-col items-center flex-shrink-0 z-10 pt-4 sm:pt-0 mb-8 w-full">
          <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-8 bg-white px-6 py-2 sm:py-3 rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.15)] border-4 border-emerald-900/10 transition-all hover:scale-105">
            <img src={logoCampina} alt="Seduc" className="h-6 sm:h-10 w-auto object-contain pointer-events-none" />
            <div className="w-px h-6 sm:h-8 bg-gray-200 self-center"></div>
            <img src={logoPrefeitura} alt="Prefeitura" className="h-6 sm:h-10 w-auto object-contain pointer-events-none" />
          </div>
          <h1 className="text-5xl sm:text-8xl font-black drop-shadow-[0_5px_0_rgba(0,0,0,0.2)] text-center tracking-tighter italic uppercase text-[#FFCE00] mb-2 leading-none">
            EDU <span className="text-white block sm:inline">GAMES</span>
          </h1>
        </header>

        <div className="bg-white p-8 sm:p-12 rounded-[3.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.3)] w-full max-w-sm flex flex-col gap-4 animate-in zoom-in-95 duration-500 z-10 border-b-[12px] border-emerald-900/10 mb-20">
          <button
            onClick={() => setView("register")}
            className="group relative bg-[#FFCE00] text-[#009660] py-5 px-8 rounded-3xl font-black text-xl uppercase tracking-wider shadow-[0_8px_0_#d1a900] hover:translate-y-1 hover:shadow-[0_4px_0_#d1a900] active:translate-y-2 active:shadow-none transition-all cursor-pointer"
          >
            CRIAR CONTA 👤
          </button>

          <button
            onClick={() => setView("login")}
            className="text-emerald-900/60 hover:text-emerald-900 font-black text-[10px] uppercase tracking-widest transition-colors py-2"
          >
            Já tenho uma conta
          </button>

          <div className="border-t-2 border-dashed border-gray-100 my-2"></div>

          <button
            onClick={onGuestStart}
            className="bg-emerald-50 text-emerald-600 py-4 px-8 rounded-2xl font-black text-base uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95 cursor-pointer border-2 border-emerald-100"
          >
            JOGAR SEM CONTA 🎮
          </button>
          
          <p className="text-[9px] text-center font-black text-emerald-900/30 uppercase tracking-widest mt-1">
            Acesso limitado para convidados
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#009660] flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
      <div className="absolute -top-10 -left-10 w-48 h-48 bg-[#FFCE00]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>

      <header className="flex flex-col items-center flex-shrink-0 z-10 pt-4 sm:pt-0 mb-8 w-full">
        <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-8 bg-white px-6 py-2 sm:py-3 rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.15)] border-4 border-emerald-900/10 transition-all hover:scale-105">
          <img src={logoCampina} alt="Seduc" className="h-6 sm:h-10 w-auto object-contain pointer-events-none" />
          <div className="w-px h-6 sm:h-8 bg-gray-200 self-center"></div>
          <img src={logoPrefeitura} alt="Prefeitura" className="h-6 sm:h-10 w-auto object-contain pointer-events-none" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-black drop-shadow-[0_5px_0_rgba(0,0,0,0.2)] text-center tracking-tighter italic uppercase text-[#FFCE00] mb-2 leading-none">
          EDU <span className="text-white block sm:inline">GAMES</span>
        </h1>
      </header>

      <div className="bg-white p-8 sm:p-10 rounded-[3.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.3)] w-full max-w-sm flex flex-col animate-in slide-in-from-bottom-8 duration-500 z-10 border-b-[12px] border-emerald-900/10">
        <button 
          onClick={() => setView("initial")} 
          className="self-start text-[10px] font-black uppercase text-emerald-900/30 hover:text-emerald-600 mb-6 flex items-center gap-1 group"
        >
          <span className="text-base group-hover:-translate-x-1 transition-transform">←</span> Voltar
        </button>

        <h2 className="text-3xl font-black text-emerald-900 uppercase italic mb-8 tracking-tight">
          {view === "register" ? "Fazer Cadastro" : "Entrar"}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl border-2 border-red-100 font-black text-[10px] uppercase mb-6 animate-in shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={view === "register" ? handleRegister : handleLogin} className="space-y-4">
          {view === "register" && (
            <div>
              <input
                required
                type="text"
                placeholder="NOME COMPLETO"
                className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-xl font-black text-emerald-900 uppercase outline-none focus:border-emerald-300 transition-all placeholder:text-emerald-200"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
          )}

          <input
            required
            type="email"
            placeholder="E-MAIL"
            className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-xl font-black text-emerald-900 uppercase outline-none focus:border-[#FFCE00] transition-all placeholder:text-emerald-200"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
          />

          <input
            required
            type="password"
            ref={passwordRef}
            placeholder="SENHA"
            className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-xl font-black text-emerald-900 outline-none focus:border-emerald-300 transition-all placeholder:text-emerald-200"
          />

          {view === "register" && (
            <>
              <div>
                <select
                  required={['PROFESSOR', 'ALUNO'].includes(formData.role)}
                  disabled={formData.role === 'EXTERNO'}
                  className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-xl font-black text-emerald-900 outline-none focus:border-emerald-300 transition-all uppercase appearance-none disabled:opacity-50"
                  value={formData.role === 'EXTERNO' ? '' : formData.schoolId}
                  onChange={e => setFormData({ ...formData, schoolId: e.target.value })}
                >
                  <option value="">— SELECIONAR ESCOLA / EXTERNO —</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 p-1 bg-emerald-50/50 rounded-2xl border-2 border-emerald-100">
                {["PROFESSOR", "ALUNO", "EXTERNO"].map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({ ...formData, role })}
                    className={`py-2 rounded-xl text-[9px] font-black transition-all ${formData.role === role ? 'bg-[#009660] text-white shadow-md scale-105' : 'text-emerald-900/40 hover:bg-white'}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            disabled={loading}
            className="w-full bg-[#FFCE00] text-[#009660] py-5 rounded-2xl font-black text-lg uppercase tracking-wider shadow-[0_8px_0_#d1a900] hover:translate-y-1 hover:shadow-[0_4px_0_#d1a900] active:translate-y-2 active:shadow-none transition-all cursor-pointer mt-6 disabled:opacity-50"
          >
            {loading ? "PROCESSANDO..." : view === "register" ? "CRIAR CONTA 🚀" : "ENTRAR ⚡"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
