require('dotenv').config();
const { getPrisma } = require('../config/prismaClient');

/**
 * Seed script: populates initial educational categories and subcategories.
 * Run once after first migration.
 */
async function seed() {
  const prisma = getPrisma();
  console.log('🌱 Populando categorias iniciais...');

  const categories = [
    {
      name: 'Matemática',
      subs: ['Numerais', 'Formas Geométricas', 'Operações', 'Frações']
    },
    {
      name: 'Ciências',
      subs: ['Animais', 'Plantas', 'Corpo Humano', 'Planetas']
    },
    {
      name: 'Língua Portuguesa',
      subs: ['Letras do Alfabeto', 'Sílabas', 'Palavras', 'Sinais de Pontuação']
    },
    {
      name: 'Geografia',
      subs: ['Bandeiras', 'Mapas', 'Países', 'Continentes']
    },
    {
      name: 'História',
      subs: ['Datas Históricas', 'Personalidades', 'Civilizações', 'Arte']
    },
    {
      name: 'Geral',
      subs: ['Cores', 'Profissões', 'Alimentos', 'Objetos do Dia a Dia']
    }
  ];

  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        subs: {
          create: cat.subs.map(name => ({ name }))
        }
      }
    });
    console.log(`  ✅ Categoria '${created.name}' (ID: ${created.id})`);
  }

  console.log('\n🎉 Seed concluído com sucesso!');
  await prisma.$disconnect();
}

seed().catch(e => {
  console.error('❌ Erro no seed:', e);
  process.exit(1);
});
