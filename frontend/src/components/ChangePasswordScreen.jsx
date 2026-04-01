import React, { useState, useRef } from 'react';
import AuthService from '../services/AuthService';
import logoCampina from '../assets/logo-campina.png';
import logoPrefeitura from '../assets/logo-prefeitura.png';

const ChangePasswordScreen = ({ onPasswordChanged }) => {
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const newPassword = newPasswordRef.current?.value || '';
    const confirmPassword = confirmPasswordRef.current?.value || '';

    if (newPassword !== confirmPassword) {
      return setError('As senhas não coincidem.');
    }
    if (newPassword.length < 6) {
      return setError('A senha deve ter pelo menos 6 caracteres.');
    }

    setLoading(true);
    try {
      const data = await AuthService.changePassword(newPassword);
      onPasswordChanged(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#009660] flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
      <div className="absolute -top-10 -left-10 w-48 h-48 bg-red-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>

      <header className="flex flex-col items-center flex-shrink-0 z-10 pt-4 sm:pt-0 mb-8 w-full">
        <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-8 bg-white px-6 py-2 sm:py-3 rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.15)] border-4 border-emerald-900/10 transition-all hover:scale-105">
          <img src={logoCampina} alt="Seduc" className="h-6 sm:h-10 w-auto object-contain pointer-events-none" />
          <div className="w-px h-6 sm:h-8 bg-gray-200 self-center"></div>
          <img src={logoPrefeitura} alt="Prefeitura" className="h-6 sm:h-10 w-auto object-contain pointer-events-none" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-black drop-shadow-[0_5px_0_rgba(0,0,0,0.2)] text-center tracking-tighter italic uppercase text-white mb-2 leading-none">
          SEGURANÇA <span className="text-[#FFCE00] block sm:inline">ALERTA</span>
        </h1>
      </header>

      <div className="bg-white p-8 sm:p-10 rounded-[3.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.3)] w-full max-w-sm flex flex-col animate-in slide-in-from-bottom-8 duration-500 z-10 border-b-[12px] border-emerald-900/10">
        <h2 className="text-xl font-black text-emerald-900 uppercase italic mb-4 tracking-tight text-center leading-tight">
          Crie uma <span className="text-red-500">nova senha</span> para acessar
        </h2>
        
        <p className="text-xs text-center font-bold text-gray-400 uppercase tracking-widest mb-6">
          Por motivos de segurança, altere sua senha temporária agora.
        </p>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl border-2 border-red-100 font-black text-[10px] uppercase mb-6 animate-in shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            type="password"
            ref={newPasswordRef}
            placeholder="NOVA SENHA"
            className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-xl font-black text-emerald-900 outline-none focus:border-[#FFCE00] transition-all placeholder:text-emerald-200"
          />

          <input
            required
            type="password"
            ref={confirmPasswordRef}
            placeholder="CONFIRMAR NOVA SENHA"
            className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-xl font-black text-emerald-900 outline-none focus:border-[#FFCE00] transition-all placeholder:text-emerald-200"
          />

          <button
            disabled={loading}
            className="w-full bg-[#FFCE00] text-[#009660] py-5 rounded-3xl font-black text-lg uppercase tracking-wider shadow-[0_8px_0_#d1a900] hover:translate-y-1 hover:shadow-[0_4px_0_#d1a900] active:translate-y-2 active:shadow-none transition-all cursor-pointer mt-6 disabled:opacity-50"
          >
            {loading ? "SALVANDO..." : "ATUALIZAR SENHA 🔒"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordScreen;
