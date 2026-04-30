require('dotenv').config();
const { getPrisma } = require('../shared/config/prismaClient');
const bcrypt = require('bcryptjs');

async function seed() {
  const prisma = getPrisma();
  console.log('🧪 Populando usuário de teste...');
  
  const hashedPassword = await bcrypt.hash('test123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {
      fullName: 'Admin Teste',
      password: hashedPassword,
      role: 'ADMIN'
    },
    create: {
      fullName: 'Admin Teste',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'ADMIN'
    }
  });

  console.log('✅ Usuário admin@test.com pronto para testes!');
  await prisma.$disconnect();
}

seed().catch(e => {
  console.error('❌ Erro no seed de teste:', e);
  process.exit(1);
});
