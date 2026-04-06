import React, { useState, useEffect } from "react";
import ThemeService from "../services/ThemeService";

const ThemeCreator = ({ onThemeCreated, onClose }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "", // Descrição curta
    summary: "", // Resumo detalhado (novo)
    color: "#009660",
    categoryId: "",
    subcategoryId: "",
    isPublic: true,
    ownerId: localStorage.getItem("dominoPlayerId") || "guest"
  });
  const [symbols, setSymbols] = useState(Array(6).fill(null));
  const [previews, setPreviews] = useState(Array(6).fill(null));
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState("");
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isAddingNewSubCategory, setIsAddingNewSubCategory] = useState(false);
  const [newSubName, setNewSubName] = useState("");

  useEffect(() => {
    ThemeService.getCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoadingCategories(false));
  }, []);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    
    // Check if user already put some images (optional but recommended for populating)
    const currentSymbols = symbols.some(s => s) ? symbols : null;

    try {
      setLoading(true);
      const created = await ThemeService.createCategory(newCatName, currentSymbols);
      setCategories([...categories, created]);
      setFormData({ ...formData, categoryId: created.id, subcategoryId: "" });
      setSubcategories(created.subs || []);
      setIsAddingNewCategory(false);
      setNewCatName("");
      setError("");
      
      // If symbols were sent, refresh themes listing so they can play it right away
      if (currentSymbols) {
        window.dispatchEvent(new CustomEvent('refreshThemes'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!formData.categoryId) return;
    const cat = categories.find(c => String(c.id) === String(formData.categoryId));
    if (!cat) return;

    if (cat.isDefault) {
      setError("Níveis de ensino padrão não podem ser excluídos.");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o nível "${cat.name}"?`)) return;

    try {
      setLoading(true);
      await ThemeService.deleteCategory(cat.id);
      setCategories(categories.filter(c => c.id !== cat.id));
      setFormData({ ...formData, categoryId: "", subcategoryId: "" });
      setSubcategories([]);
      setError(""); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubCategory = async () => {
    if (!newSubName.trim() || !formData.categoryId) return;

    try {
      setLoading(true);
      const created = await ThemeService.createSubCategory(newSubName, formData.categoryId);
      
      // Update local state
      const updatedCategories = categories.map(c => {
        if (String(c.id) === String(formData.categoryId)) {
          return { ...c, subs: [...(c.subs || []), created] };
        }
        return c;
      });
      
      setCategories(updatedCategories);
      setSubcategories([...subcategories, created]);
      setFormData({ ...formData, subcategoryId: created.id });
      setIsAddingNewSubCategory(false);
      setNewSubName("");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubCategory = async () => {
    if (!formData.subcategoryId) return;
    const sub = subcategories.find(s => String(s.id) === String(formData.subcategoryId));
    if (!sub) return;

    if (sub.isDefault) {
      setError("Componentes curriculares padrão não podem ser excluídos.");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir a disciplina "${sub.name}"?`)) return;

    try {
      setLoading(true);
      await ThemeService.deleteSubCategory(sub.id);
      
      // Update local state
      const updatedCategories = categories.map(c => {
        if (String(c.id) === String(formData.categoryId)) {
          return { ...c, subs: c.subs.filter(s => s.id !== sub.id) };
        }
        return c;
      });
      
      setCategories(updatedCategories);
      setSubcategories(subcategories.filter(s => s.id !== sub.id));
      setFormData({ ...formData, subcategoryId: "" });
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    const selected = categories.find(c => String(c.id) === String(categoryId));
    setSubcategories(selected?.subs || []);
    setFormData({ ...formData, categoryId, subcategoryId: "" });
  };

  const handleFileChange = (index, file) => {
    if (!file) return;
    const newSymbols = [...symbols];
    newSymbols[index] = file;
    setSymbols(newSymbols);
    const newPreviews = [...previews];
    newPreviews[index] = URL.createObjectURL(file);
    setPreviews(newPreviews);
  };

  const validate = () => {
    if (!formData.name.trim()) return "Digite um nome para o tema.";
    if (!formData.description.trim()) return "Uma descrição curta é obrigatória.";
    if (!formData.summary.trim()) return "O resumo do jogo é obrigatório.";
    if (!formData.categoryId) return "Selecione uma categoria para o tema.";
    if (symbols.some(s => !s)) return "Envie as 6 imagens das peças (pontos 1 a 6).";
    return null;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError("");
    setLoading(true);
    try {
      const result = await ThemeService.createTheme({ ...formData, symbols });
      onThemeCreated(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl lg:max-w-4xl max-h-[92vh] rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="p-6 sm:p-8 bg-gradient-to-r from-emerald-50 to-white border-b-2 border-emerald-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#009660] uppercase italic tracking-tighter leading-none">Novo Tema</h2>
            <p className="text-[10px] sm:text-xs font-black uppercase text-emerald-900/40 tracking-widest mt-1">Crie seu próprio conjunto de dominó</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white text-emerald-900 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm border border-gray-100 flex items-center justify-center font-black text-sm cursor-pointer">✕</button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 scrollbar-hide">
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-2xl border-2 border-red-100 font-black text-sm uppercase tracking-tight text-center animate-in shake">
              ⚠️ {error}
            </div>
          )}

          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Column */}
            <section className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[10px] font-black uppercase text-emerald-900/60 mb-1.5 block ml-1">Nome do Tema *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-2xl focus:border-[#009660] transition-all outline-none font-black text-emerald-900 uppercase placeholder:text-emerald-200"
                  placeholder="EX: ANIMAIS DA FAZENDA"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-black uppercase text-emerald-900/60 mb-1.5 block ml-1">Descrição Curta *</label>
                <input
                  required
                  type="text"
                  maxLength={100}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-2xl focus:border-[#009660] transition-all outline-none font-black text-emerald-900 uppercase placeholder:text-emerald-200"
                  placeholder="EX: APRENDA SOBRE OS BICHINHOS DA FLORESTA"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="text-[10px] font-black uppercase text-emerald-900/60 mb-1.5 block ml-1">Resumo Detalhado *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.summary}
                  onChange={e => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-2xl focus:border-[#009660] transition-all outline-none font-medium text-emerald-900 placeholder:text-emerald-200 resize-none"
                  placeholder="DESCREVA O OBJETIVO DO JOGO E O QUE FOI CRIADO..."
                />
              </div>

              {/* Category */}
              <div>
                <div className="flex justify-between items-end mb-1.5 ml-1">
                  <label className="text-[10px] font-black uppercase text-emerald-900/60 block">
                    Categoria *
                    {loadingCategories && <span className="ml-2 opacity-40 font-normal normal-case">carregando...</span>}
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                    className="text-[9px] font-black uppercase text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    {isAddingNewCategory ? "✕ Cancelar" : "➕ Nova Categoria"}
                  </button>
                </div>

                {isAddingNewCategory ? (
                  <div className="flex flex-col sm:flex-row gap-2 animate-in slide-in-from-right-2 duration-300">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value.toUpperCase())}
                      className="flex-1 bg-emerald-50/50 border-2 border-emerald-300 p-4 rounded-2xl focus:border-emerald-500 transition-all outline-none font-black text-emerald-900 uppercase placeholder:text-emerald-200 text-sm"
                      placeholder="EX: ENSINO MÉDIO"
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={handleCreateCategory}
                      className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-xs hover:bg-emerald-600 active:scale-95 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      SALVAR NÍVEL
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      required
                      value={formData.categoryId}
                      onChange={handleCategoryChange}
                      className={`flex-1 bg-emerald-50/50 border-2 p-4 rounded-2xl focus:border-[#009660] transition-all outline-none font-black text-emerald-900 uppercase cursor-pointer ${!formData.categoryId ? 'border-red-200' : 'border-emerald-100'}`}
                    >
                      <option value="">— Selecione o Nível —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    {formData.categoryId && categories.find(c => String(c.id) === String(formData.categoryId))?.isDefault === false && (
                      <button
                        type="button"
                        onClick={handleDeleteCategory}
                        className="w-14 h-14 flex items-center justify-center bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl border-2 border-red-100 transition-all active:scale-90 flex-shrink-0"
                        title="Excluir Nível"
                      >
                        <span className="text-xl">🗑️</span>
                      </button>
                    )}
                  </div>
                )}
                {!loadingCategories && categories.length === 0 && !isAddingNewCategory && (
                  <p className="text-[10px] text-red-400 font-black mt-1 ml-1 uppercase tracking-wide">Nenhum nível de ensino encontrado. Crie um novo acima.</p>
                )}
              </div>

              {/* Subcategory */}
              {formData.categoryId && (
                <div>
                  <div className="flex justify-between items-end mb-1.5 ml-1">
                    <label className="text-[10px] font-black uppercase text-emerald-900/60 block">Componente Curricular *</label>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingNewSubCategory(!isAddingNewSubCategory)}
                      className="text-[9px] font-black uppercase text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      {isAddingNewSubCategory ? "✕ Cancelar" : "➕ Nova Disciplina"}
                    </button>
                  </div>

                  {isAddingNewSubCategory ? (
                    <div className="flex flex-col sm:flex-row gap-2 animate-in slide-in-from-right-2 duration-300">
                      <input
                        type="text"
                        value={newSubName}
                        onChange={e => setNewSubName(e.target.value.toUpperCase())}
                        className="flex-1 bg-emerald-50/50 border-2 border-emerald-300 p-4 rounded-2xl focus:border-emerald-500 transition-all outline-none font-black text-emerald-900 uppercase placeholder:text-emerald-200 text-sm"
                        placeholder="EX: ROBÓTICA"
                        autoFocus
                      />
                      <button 
                        type="button"
                        onClick={handleCreateSubCategory}
                        className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-xs hover:bg-emerald-600 active:scale-95 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                      >
                        SALVAR DISCIPLINA
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                       <select
                        required
                        value={formData.subcategoryId}
                        onChange={e => setFormData({ ...formData, subcategoryId: e.target.value })}
                        className="flex-1 bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-2xl focus:border-[#009660] transition-all outline-none font-black text-emerald-900 uppercase cursor-pointer"
                      >
                        <option value="">— Selecione a disciplina —</option>
                        {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>

                      {formData.subcategoryId && subcategories.find(s => String(s.id) === String(formData.subcategoryId))?.isDefault === false && (
                        <button
                          type="button"
                          onClick={handleDeleteSubCategory}
                          className="w-14 h-14 flex items-center justify-center bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl border-2 border-red-100 transition-all active:scale-90 flex-shrink-0"
                          title="Excluir Disciplina"
                        >
                          <span className="text-xl">🗑️</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Visibility */}
              <div>
                <label className="text-[10px] font-black uppercase text-emerald-900/60 mb-1.5 block ml-1">Visibilidade</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isPublic: true })}
                    className={`flex-1 p-3 rounded-2xl font-black text-xs transition-all border-2 cursor-pointer ${formData.isPublic ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'}`}
                  >
                    PÚBLICO ✅
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isPublic: false })}
                    className={`flex-1 p-3 rounded-2xl font-black text-xs transition-all border-2 cursor-pointer ${!formData.isPublic ? 'bg-slate-800 text-white border-slate-900 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'}`}
                  >
                    PRIVADO 🔒
                  </button>
                </div>
                <p className={`text-[9px] mt-1.5 ml-1 font-black uppercase tracking-widest ${formData.isPublic ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {formData.isPublic ? 'Visível para todos na plataforma' : 'Visível apenas para você'}
                </p>
              </div>
            </section>

            {/* Right Column — Images */}
            <section>
              <label className="text-[10px] font-black uppercase text-emerald-900/60 mb-2 block ml-1 text-center">
                Imagens das Peças * <span className="text-emerald-300">(pontos 1 a 6)</span>
              </label>
              <div className="grid grid-cols-3 gap-2 bg-emerald-50/30 p-3 rounded-3xl border-2 border-emerald-100/50">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square relative group rounded-xl border-2 border-dashed transition-all overflow-hidden flex items-center justify-center cursor-pointer ${previews[i] ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-100 bg-white hover:border-emerald-300'}`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileChange(i, e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    {previews[i] ? (
                      <img src={previews[i]} alt={`Peça ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-2xl font-black text-emerald-200">{i + 1}</span>
                        <span className="text-[8px] font-black text-emerald-200 uppercase">PONTO</span>
                      </div>
                    )}
                    {previews[i] && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <span className="text-white text-xs font-black opacity-0 group-hover:opacity-100">✏️ Trocar</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-3 gap-1">
                {symbols.map((s, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-all ${s ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-[9px] text-center mt-1.5 font-black text-emerald-900/30 uppercase tracking-widest italic">
                O ponto '0' (zero) será vazio por padrão
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 sm:p-6 bg-white border-t-2 border-emerald-50 flex gap-3 flex-shrink-0 sticky bottom-0 z-[210] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all active:scale-95 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] py-4 rounded-2xl bg-[#FFCE00] text-[#009660] font-black uppercase tracking-widest text-sm shadow-[0_6px_0_#d1a900] hover:brightness-105 transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? '⏳ Salvando...' : '🚀 Criar Tema!'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ThemeCreator;
