require('dotenv').config();
const { getPrisma } = require('../shared/config/prismaClient');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  const prisma = getPrisma();
  console.log('🛡️ Criando conta de Administrador...');

  const fullName = process.env.ADMIN_SEED_NAME || "Administrador";
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.log('⚠️ ADMIN_SEED_EMAIL e ADMIN_SEED_PASSWORD não configurados no .env. Pulando seed de admin.');
    await prisma.$disconnect();
    return;
  }

  try {
    const existingAdmin = await prisma.user.findUnique({ where: { email } });
    if (existingAdmin) {
      console.log('✅ Administrador já existe no banco.');
      await prisma.$disconnect();
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        mustChangePassword: true
      }
    });

    console.log('✅ Conta ADMIN criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
