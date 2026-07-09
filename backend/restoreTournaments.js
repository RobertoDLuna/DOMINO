const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restore() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const result = await prisma.tournament.updateMany({
        where: {
            status: 'CANCELLED',
            startsAt: {
                gte: today // se a data de início for HOJE ou no futuro
            }
        },
        data: {
            status: 'OPEN'
        }
    });

    console.log(`Restaurados ${result.count} campeonatos que foram cancelados indevidamente.`);
}

restore().finally(() => prisma.$disconnect());
