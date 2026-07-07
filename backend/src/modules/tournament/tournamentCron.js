const cron = require('node-cron');
const { getPrisma } = require('../../shared/config/prismaClient');

// Roda todos os dias à meia-noite
cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Verificando campeonatos não realizados...');
    const prisma = getPrisma();
    
    // Configura "today" para a meia noite de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const result = await prisma.tournament.updateMany({
            where: {
                status: 'OPEN',
                startsAt: {
                    lt: today // Data de início é estritamente menor (passado) que hoje
                }
            },
            data: {
                status: 'CANCELLED'
            }
        });

        if (result.count > 0) {
            console.log(`[CRON] ${result.count} campeonatos expirados foram marcados como CANCELADOS.`);
        } else {
            console.log(`[CRON] Nenhum campeonato expirado encontrado.`);
        }
    } catch (error) {
        console.error('[CRON] Erro ao cancelar campeonatos expirados:', error);
    }
});

module.exports = cron;
