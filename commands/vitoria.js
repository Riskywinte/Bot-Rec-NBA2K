const { SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../database');
const { respond } = require('../utils/interactionResponse');

module.exports = {
    name: 'vitoria',
    description: 'Registra o resultado da partida',
    data: new SlashCommandBuilder()
        .setName('vitoria')
        .setDescription('Registra o resultado da partida')
        .addStringOption(option => option
            .setName('vencedor')
            .setDescription('Time vencedor')
            .setRequired(true)
            .addChoices(
                { name: 'TIME 1', value: 'time1' },
                { name: 'TIME 2', value: 'time2' }
            )),

    async execute(interaction, winnerOverride = null) {
        const winnerTeam = winnerOverride ||
            (interaction.isChatInputCommand() ? interaction.options.getString('vencedor') : null);

        if (winnerTeam !== 'time1' && winnerTeam !== 'time2') {
            return respond(interaction, '⚠️ Escolha `time1` ou `time2` como vencedor.');
        }

        const match = interaction.client.activeMatches.get(interaction.guildId);
        if (!match) {
            return respond(interaction, '⚠️ Nenhuma partida ativa encontrada no servidor. Usem o `/sorteio` primeiro.');
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
            interaction.client.activeMatches.delete(interaction.guildId);

            await respond(interaction, `🏆 O **${winnerTeam.toUpperCase()}** levou a vitória e o resultado foi salvo! Usem \`/gg\` para voltar ao lobby.`);
        } catch (error) {
            console.error('Erro ao registrar a partida:', error);
            await respond(interaction, '❌ Houve um erro ao processar o resultado da partida.');
        }
    },
};