import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="text-xl font-black italic uppercase text-slate-800 mb-2">
          {title}
        </h2>
        <p className="text-slate-600 text-sm font-medium mb-8">
          {message}
        </p>
        
        <div className="flex gap-3 w-full">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 transition-colors shadow-md shadow-red-500/20"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
