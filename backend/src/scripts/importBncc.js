require('dotenv').config();
const { getPrisma } = require('../shared/config/prismaClient');
const fs = require('fs');
const path = require('path');

// Utilitário para divisão de linhas de CSV estilo máquina de estados
function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function importBncc() {
  const prisma = getPrisma();
  console.log('🔄 Iniciando importação de habilidades da BNCC...');

  // Caminhos dos arquivos
  const computacaoPath = path.join(__dirname, '..', '..', '..', 'BNCC_Computacao_CG_Atividades.xlsx - BNCC COMPUTAÇÃO.csv');
  const artePath = path.join(__dirname, '..', '..', '..', 'BNCC_Base_Atividades.xlsx - Arte.csv');

  let importedCount = 0;

  // 1. Processar bncc_computacao.csv
  if (fs.existsSync(computacaoPath)) {
    console.log(`📖 Carregando Computação de: ${computacaoPath}`);
    const content = fs.readFileSync(computacaoPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // Pular cabeçalho
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      if (cols.length < 5 || !cols[2]) continue; // Código é essencial

      const [stage, axis, code, topic, description, pedagogical, activity] = cols;

      await prisma.bnccSkill.upsert({
        where: { code },
        update: {
          stage,
          component: 'Computação',
          axis,
          topic,
          description,
          pedagogical: pedagogical || null,
          activity: activity || null
        },
        create: {
          code,
          stage,
          component: 'Computação',
          axis,
          topic,
          description,
          pedagogical: pedagogical || null,
          activity: activity || null
        }
      });
      importedCount++;
    }
    console.log('✅ Habilidades de Computação importadas.');
  } else {
    console.log(`⚠️ Arquivo de Computação não encontrado em: ${computacaoPath}`);
  }

  // 2. Processar BNCC_Base_Atividades.xlsx - Arte.csv
  if (fs.existsSync(artePath)) {
    console.log(`📖 Carregando Arte de: ${artePath}`);
    const content = fs.readFileSync(artePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    // Pular cabeçalho
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      if (cols.length < 6 || !cols[2]) continue; // Código é essencial

      const [stage, component, code, axis, topic, description, pedagogical, activity] = cols;

      await prisma.bnccSkill.upsert({
        where: { code },
        update: {
          stage,
          component,
          axis,
          topic,
          description,
          pedagogical: pedagogical || null,
          activity: activity || null
        },
        create: {
          code,
          stage,
          component,
          axis,
          topic,
          description,
          pedagogical: pedagogical || null,
          activity: activity || null
        }
      });
      importedCount++;
    }
    console.log('✅ Habilidades de Arte importadas.');
  } else {
    console.log(`⚠️ Arquivo de Arte não encontrado em: ${artePath}`);
  }

  console.log(`🎉 Importação finalizada! Total de ${importedCount} habilidades processadas.`);
  await prisma.$disconnect();
}

importBncc().catch(err => {
  console.error('❌ Erro durante a importação da BNCC:', err);
  process.exit(1);
});
