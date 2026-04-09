const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultThemes = [
  { id: 'animais', name: 'Animais Selvagens' },
  { id: 'matematica', name: 'Matemática Divertida' },
  { id: 'frutas', name: 'Frutas Tropicais' },
  { id: 'espaco', name: 'Espaço Sideral' },
  { id: 'objetos', name: 'Objetos Escolares' },
  { id: 'classico', name: 'Dominó Clássico' }
];

async function main() {
  console.log('Verificando temas padrões no banco...');
  
  // Pega a primeira Categoria (geralmente Geral) do banco
  let cat = await prisma.category.findFirst({
    where: { isApproved: true }
  });
  
  if (!cat) {
    cat = await prisma.category.create({
      data: { name: 'Padrão do Sistema', isDefault: true, isApproved: true }
    });
  }

  for (const t of defaultThemes) {
    try {
      await prisma.theme.upsert({
        where: { id: t.id },
        update: { categoryId: cat.id },
        create: {
          id: t.id,
          name: t.name,
          color: '#009660',
          symbols: [], // vazios porque o front renderiza hardcoded
          isPublic: true,
          isApproved: true,
          categoryId: cat.id
        }
      });
      console.log(`- Upserted: ${t.name}`);
    } catch (e) {
      console.error(`Erro no tema ${t.id}:`, e.message);
    }
  }
  console.log('✅ Concluído. Agora os temas padrões existem no BD!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
