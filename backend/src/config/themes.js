/**
 * Educational themes for the Domino game.
 * Each theme has a set of 7 symbols (Double-6 set logic).
 */
const themes = {
  animais: {
    id: 'animais',
    name: 'Animais Selvagens 🦁',
    description: 'Aprenda sobre os bichinhos da floresta!',
    symbols: ["", "🐱", "🐰", "🦊", "🐨", "🦁", "🐯"],
    color: '#009660'
  },
  matematica: {
    id: 'matematica',
    name: 'Matemática Divertida 🔢',
    description: 'Vamos praticar os numerais de 0 a 6.',
    symbols: ["", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"],
    color: '#3B82F6'
  },
  frutas: {
    id: 'frutas',
    name: 'Frutas Tropicais 🍎',
    description: 'Descubra as frutas mais deliciosas!',
    symbols: ["", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇"],
    color: '#EF4444'
  },
  espaco: {
    id: 'espaco',
    name: 'Espaço Sideral 🚀',
    description: 'Uma aventura incrível pelo universo!',
    symbols: ["", "👩‍🚀", "🌕", "🛰️", "🪐", "🌌", "👽"],
    color: '#6366F1'
  },
  objetos: {
    id: 'objetos',
    name: 'Objetos Escolares 🎒',
    description: 'O que levamos na nossa mochila?',
    symbols: ["", "📚", "✏️", "📐", "🖍️", "🎨", "📝"],
    color: '#F59E0B'
  },
  classico: {
    id: 'classico',
    name: 'Dominó Clássico 🎲',
    description: 'O jogo tradicional com a peça vazia e números de 1 a 6.',
    symbols: ["", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"],
    color: '#1E293B'
  }
};

module.exports = themes;
