const { getDB } = require('../database');

module.exports = {
    name: 'vitoria',
    description: 'Registra o resultado (Uso: !vitoria time1 ou !vitoria time2)',

    async execute(message, args) {
        const winnerTeam = args[0]?.toLowerCase();

        if (winnerTeam !== 'time1' && winnerTeam !== 'time2') {
            return message.channel.send('⚠️ Uso correto: `!vitoria time1` ou `!vitoria time2`');
        }

        const match = message.client.activeMatches.get(message.guild.id);
        if (!match) {
            return message.channel.send('⚠️ Nenhuma partida ativa encontrada no servidor. Usem o `!sorteio` primeiro.');
        }

        const winnersData = winnerTeam === 'time1' ? match.team1Data : match.team2Data;
        const losersData = winnerTeam === 'time1' ? match.team2Data : match.team1Data;

        try {
            const db = getDB();
            
            for (const p of winnersData) {
                const position = p.position ? p.position.toUpperCase() : 'UNKNOWN';
                db.prepare(
                    `INSERT INTO players (discordId, position, wins, losses) VALUES (?, ?, 1, 0)
                     ON CONFLICT(discordId, position) DO UPDATE SET wins = wins + 1`
                ).run(p.id, position);
            }

            for (const p of losersData) {
                const position = p.position ? p.position.toUpperCase() : 'UNKNOWN';
                db.prepare(
                    `INSERT INTO players (discordId, position, wins, losses) VALUES (?, ?, 0, 1)
                     ON CONFLICT(discordId, position) DO UPDATE SET losses = losses + 1`
                ).run(p.id, position);
            }

            const team1Members = JSON.stringify(match.team1Data.map(p => ({ name: p.name, position: p.position || 'UNKNOWN' })));
            const team2Members = JSON.stringify(match.team2Data.map(p => ({ name: p.name, position: p.position || 'UNKNOWN' })));

            db.prepare(`INSERT INTO match_history (winner_team, team1_members, team2_members) VALUES (?, ?, ?)`).run(winnerTeam, team1Members, team2Members);
            message.client.activeMatches.delete(message.guild.id);

            await message.channel.send(`🏆 O **${winnerTeam.toUpperCase()}** levou a vitória e o resultado foi salvo! Mandem um \`!gg\` para voltar ao lobby.`);
        } catch (error) {
            console.error('Erro ao registrar a partida:', error);
            await message.channel.send('❌ Houve um erro ao processar o resultado da partida.');
        }
    },
};