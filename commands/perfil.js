const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../database');
const { respond } = require('../utils/interactionResponse');

module.exports = {
    name: 'perfil',
    description: 'Mostra o Player Card e as estatísticas de um jogador',
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Mostra as estatísticas de um jogador')
        .addUserOption(option => option
            .setName('jogador')
            .setDescription('Jogador que deseja consultar; vazio para ver seu próprio perfil')
            .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('jogador') || interaction.user;
        const db = getDB();

        const playerStats = db.prepare(`
            SELECT SUM(wins) as wins, SUM(losses) as losses 
            FROM players 
            WHERE discordId = ?
        `).get(targetUser.id);

        if (!playerStats || playerStats.wins === null) {
            return respond(interaction, `⚠️ Não encontrei estatísticas para **${targetUser.displayName}**. Vá jogar uma partida primeiro!`);
        }

        const totalGames = playerStats.wins + playerStats.losses;
        const winRate = totalGames > 0 ? Math.round((playerStats.wins / totalGames) * 100) : 0;

        const embed = new EmbedBuilder()
            .setTitle(`🏀 Player Card: ${targetUser.displayName}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .setColor('#3498db')
            .addFields(
                { name: 'Partidas Jogadas', value: `\`${totalGames}\``, inline: true },
                { name: 'Win Rate (WR)', value: `\`${winRate}%\``, inline: true },
                { name: 'Vitórias (V) 🏆', value: `\`${playerStats.wins}\``, inline: true },
                { name: 'Derrotas (D) 💀', value: `\`${playerStats.losses}\``, inline: true }
            )
            .setFooter({ text: 'REC do Panela Velha' })
            .setTimestamp();

        await respond(interaction, { embeds: [embed] });
    },
};