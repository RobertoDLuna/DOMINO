const cron = require('node-cron');
const { getPrisma } = require('../../shared/config/prismaClient');

const cancelExpiredTournaments = async () => {
    console.log('[CRON] Verificando campeonatos não realizados...');
    const prisma = getPrisma();
    
    // Configura "today" para a meia noite de hoje (em UTC para bater com o BD)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

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
};

// Executa imediatamente ao iniciar o servidor para limpar qualquer pendência
cancelExpiredTournaments();

// Roda a cada hora no minuto zero (ex: 01:00, 02:00, etc) para garantir que rode caso o servidor caia à meia noite
cron.schedule('0 * * * *', cancelExpiredTournaments);

module.exports = {
    cancelExpiredTournaments,
    cron
};
