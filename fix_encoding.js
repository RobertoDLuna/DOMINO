const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/modules/chess/components/chess.css');
let content = fs.readFileSync(file, 'utf8');

const map = {
  'â”€': '-',
  'â€”': '-',
  'Ã£': 'ã',
  'Ã³': 'ó',
  'Ã­': 'í',
  'Ãµ': 'õ',
  'Ã‚': 'Â',
  'Ã‡': 'Ç',
  'Ã§': 'ç',
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã¢': 'â',
  'Ãª': 'ê',
  "ǽ??'": '-',
  "ǽ'??": '-',
  'ǟ': 'ã',
};

for (const [key, val] of Object.entries(map)) {
  content = content.split(key).join(val);
}

// Safely format long lines of dashes in comments
content = content.replace(/\/\* -{4,}/g, '/* ---');
content = content.replace(/-{4,} \*\//g, '--- */');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed encoding correctly.');
