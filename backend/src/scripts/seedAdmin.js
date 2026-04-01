require('dotenv').config();
const { getPrisma } = require('../config/prismaClient');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  const prisma = getPrisma();
  console.log('🛡️ Criando conta de Administrador...');

  const fullName = "robertoluna";
  const email = "robertocgw@gmail.com";
  const password = "admin123";

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

    console.log(`✅ Conta ADMIN criada com sucesso! Email: ${email}`);
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
