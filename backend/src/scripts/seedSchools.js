require('dotenv').config();
const { getPrisma } = require('../config/prismaClient');
const fs = require('fs');
const path = require('path');

async function seedSchools() {
  const prisma = getPrisma();
  const csvPath = path.join(__dirname, '../data/template_escolas_pronto.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Erro: Arquivo CSV não encontrado em:', csvPath);
    process.exit(1);
  }

  console.log('🌱 Importando escolas do CSV...');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  // Skip header
  const dataLines = lines.slice(1);
  let count = 0;

  for (const line of dataLines) {
    const [name, inep, address, phone, email, cnpj, director] = line.split(';');
    
    if (!name || !name.trim()) continue;

    try {
      await prisma.school.upsert({
        where: { name: name.trim() },
        update: {
          inep: inep?.trim() || null,
          address: address?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          cnpj: cnpj?.trim() || null,
          director: director?.trim() || null
        },
        create: {
          name: name.trim(),
          inep: inep?.trim() || null,
          address: address?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          cnpj: cnpj?.trim() || null,
          director: director?.trim() || null
        }
      });
      count++;
    } catch (err) {
      console.warn(`  ⚠️ Erro ao importar escola '${name}':`, err.message);
    }
  }

  console.log(`✅ Importação concluída! ${count} escolas cadastradas.`);
  await prisma.$disconnect();
}

seedSchools().catch(e => {
  console.error('❌ Erro no seed de escolas:', e);
  process.exit(1);
});
