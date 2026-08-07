require('dotenv').config();

/**
 * Singleton preguiçoso (lazy) do Prisma Client.
 * Apenas instancia quando uma consulta ao banco é realizada.
 */
let _prisma = null;

function getPrisma() {
  if (!_prisma) {
    const { PrismaClient } = require('@prisma/client');
    _prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }
  return _prisma;
}

module.exports = { getPrisma };
