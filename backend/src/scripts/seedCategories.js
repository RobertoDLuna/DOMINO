require('dotenv').config();
const { getPrisma } = require('../config/prismaClient');

/**
 * Seed script: populates initial educational categories and subcategories.
 * Run once after first migration.
 */
async function seed() {
  const prisma = getPrisma();
  console.log('🧹 Limpando dados antigos (Temas, Subcategorias, Categorias)...');
  
  // Excluir em ordem reversa para respeitar chaves estrangeiras
  await prisma.theme.deleteMany({});
  await prisma.subCategory.deleteMany({});
  await prisma.category.deleteMany({});

  console.log('🌱 Populando categorias iniciais...');

  const commonSubs = [
    'Matemática',
    'Ciências',
    'Língua Portuguesa',
    'Geografia',
    'História',
    'Inglês',
    'Artes',
    'Educação Física',
    'Geral'
  ];

  const categories = [
    {
      name: 'Educação Infantil',
      subs: commonSubs
    },
    {
      name: 'Anos Iniciais',
      subs: commonSubs
    },
    {
      name: 'Anos Finais',
      subs: commonSubs
    }
  ];

  for (const cat of categories) {
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        isDefault: true,
        subs: {
          create: cat.subs.map(name => ({ name, isDefault: true }))
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
