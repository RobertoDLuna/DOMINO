const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('frontend/src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content
    .replace(/text-emerald-900\/30/g, 'text-emerald-900/70')
    .replace(/text-emerald-900\/40/g, 'text-emerald-900/70')
    .replace(/text-white\/40/g, 'text-white/70');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Updated ' + file);
  }
});

// robots.txt
fs.writeFileSync('frontend/public/robots.txt', 'User-agent: *\nAllow: /\n', 'utf8');
console.log('Created frontend/public/robots.txt');

// index.html
let indexHtml = fs.readFileSync('frontend/index.html', 'utf8');
if (!indexHtml.includes('meta name="description"')) {
  indexHtml = indexHtml.replace('</title>', '</title>\n    <meta name="description" content="EDUGAMES - Plataforma de aprendizagem e jogos educacionais da SEDUC." />');
  fs.writeFileSync('frontend/index.html', indexHtml, 'utf8');
  console.log('Updated frontend/index.html');
}
