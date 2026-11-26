const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../database');
const { respond } = require('../utils/interactionResponse');

module.exports = {
    name: 'historico',
    description: 'Mostra as últimas 5 partidas disputadas',
    data: new SlashCommandBuilder()
        .setName('historico')
        .setDescription('Mostra as últimas 5 partidas disputadas'),
    
    async execute(interaction) {
        const db = getDB();
        
        const matches = db.prepare('SELECT * FROM match_history ORDER BY id DESC LIMIT 5').all();

        if (matches.length === 0) {
            return respond(interaction, '📖 Ainda não há histórico de partidas. Vão pra quadra!');
        }

        const embed = new EmbedBuilder()
            .setTitle('📖 Últimas Partidas - Panela Velha')
            .setColor('#9b59b6')
            .setDescription('Confira os resultados recentes:');

        for (const match of matches) {
            const date = new Date(match.timestamp + 'Z'); 
            const discordTime = `<t:${Math.floor(date.getTime() / 1000)}:R>`;

            const team1 = match.team1_members ? JSON.parse(match.team1_members) : [];
            const team2 = match.team2_members ? JSON.parse(match.team2_members) : [];

            const positionOrder = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };
            const formatTeam = (team) => [...team]
                .sort((a, b) => (positionOrder[a.position] ?? 99) - (positionOrder[b.position] ?? 99))
                .map(player => `• ${player.name} (${player.position})`)
                .join('\n') || 'Nenhum jogador registrado.';

            embed.addFields({
                name: `Partida #${match.id} - ${discordTime}`,
                value: `🏆 Vencedor: **${match.winner_team.toUpperCase()}**\n\n**TIME 1**\n${formatTeam(team1)}\n\n**TIME 2**\n${formatTeam(team2)}`,
                inline: false
            });
        }

        await respond(interaction, { embeds: [embed] });
    },
};
