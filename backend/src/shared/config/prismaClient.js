require('dotenv').config();

/**
 * Lazy Prisma Client singleton.
 * Only instantiates when a DB call is made — server starts even without a DB configured.
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
