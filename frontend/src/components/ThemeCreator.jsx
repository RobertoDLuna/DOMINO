import React, { useState, useEffect } from "react";
import ThemeService from "../services/ThemeService";

const ThemeCreator = ({ onThemeCreated, onClose }) => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#009660",
    categoryId: "",
    subcategoryId: "",
    isPublic: true,
    ownerId: localStorage.getItem("dominoPlayerId") || "guest"
  });
  const [symbols, setSymbols] = useState(Array(6).fill(null));
  const [previews, setPreviews] = useState(Array(6).fill(null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load categories for selector
    ThemeService.getCategories().then(setCategories).catch(console.error);
  }, []);

  const handleFileChange = (index, file) => {
    if (!file) return;
    const newSymbols = [...symbols];
    newSymbols[index] = file;
    setSymbols(newSymbols);

    const newPreviews = [...previews];
    newPreviews[index] = URL.createObjectURL(file);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (symbols.some(s => !s)) {
      setError("Por favor, envie as 6 imagens para as peças (1 a 6).");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const result = await ThemeService.createTheme({
        ...formData,
        symbols: symbols
      });
      onThemeCreated(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative">
        <header className="p-6 sm:p-8 bg-emerald-50 border-b-2 border-emerald-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-white">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#009660] uppercase italic tracking-tighter leading-none">Novo Tema Customizado</h2>
            <p className="text-[10px] sm:text-xs font-black uppercase text-emerald-900/40 tracking-widest mt-1">Crie seu próprio conjunto de dominó 🎨</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white text-emerald-900 hover:bg-emerald-100 transition-colors shadow-sm flex items-center justify-center font-black">X</button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-hide">
          {error && <div className="bg-red-50 text-red-500 p-4 rounded-2xl border-2 border-red-100 font-black text-sm uppercase tracking-tight text-center">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <section className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-emerald-900/60 mb-1 block ml-2">Nome do Tema</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-2xl focus:border-emerald-500 transition-all outline-none font-black text-emerald-900 uppercase" placeholder="EX: ANIMAIS DA FAZENDA" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-emerald-900/60 mb-1 block ml-2">Categoria</label>
                <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value, subcategoryId: ""})} className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-2xl focus:border-emerald-500 transition-all outline-none font-black text-emerald-900 uppercase">
                  <option value="">Selecione...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-emerald-900/60 mb-1 block ml-2">Visibilidade</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData({...formData, isPublic: true})} className={`flex-1 p-3 rounded-2xl font-black text-xs transition-all border-2 ${formData.isPublic ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>PÚBLICO ✅</button>
                  <button type="button" onClick={() => setFormData({...formData, isPublic: false})} className={`flex-1 p-3 rounded-2xl font-black text-xs transition-all border-2 ${!formData.isPublic ? 'bg-emerald-950 text-white border-black shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>PRIVADO 🔒</button>
                </div>
              </div>
            </section>

            <section>
              <label className="text-[10px] font-black uppercase text-emerald-900/60 mb-1 block ml-2 text-center">Imagens das Peças (1 a 6)</label>
              <div className="grid grid-cols-3 gap-2 bg-emerald-50/30 p-4 rounded-3xl border-2 border-emerald-100/50">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-square relative group bg-white rounded-xl border-2 border-dashed border-emerald-100 hover:border-emerald-300 transition-all overflow-hidden flex items-center justify-center shadow-inner cursor-pointer">
                    <input required type="file" accept="image/*" onChange={e => handleFileChange(i, e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {previews[i] ? (
                      <img src={previews[i]} alt={`Preview ${i+1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <span className="text-xl font-black text-emerald-200">{i + 1}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-center mt-2 font-black text-emerald-900/30 uppercase tracking-widest italic">O valor '0' (zero) será vazio por padrão.</p>
            </section>
          </div>
        </form>

        <footer className="p-6 sm:p-8 bg-white border-t-2 border-emerald-50 flex gap-4">
          <button type="button" onClick={onClose} className="flex-1 py-4 px-6 rounded-2xl bg-gray-100 text-gray-500 font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all active:scale-95">Sair</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-[2] py-4 px-6 rounded-2xl bg-[#FFCE00] text-[#009660] font-black uppercase tracking-widest text-sm shadow-[0_6px_0_#d1a900] hover:scale-[1.02] transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 min-w-[200px]">
             {loading ? 'Salvando...' : 'Criar Tema Agora! 🚀'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ThemeCreator;
