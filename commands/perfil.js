const { EmbedBuilder } = require('discord.js');
const { getDB } = require('../database');

module.exports = {
    name: 'perfil',
    description: 'Mostra o Player Card e as estatísticas de um jogador',
    
    async execute(message, args) {
        const targetUser = message.mentions.users.first() || message.author;
        const db = getDB();

        // Fazemos a soma (SUM) de todas as posições em que esse jogador atuou
        const playerStats = db.prepare(`
            SELECT SUM(wins) as wins, SUM(losses) as losses, SUM(mvps) as mvps 
            FROM players 
            WHERE discordId = ?
        `).get(targetUser.id);

        // Se wins for null, significa que ele não tem nenhuma linha na tabela
        if (!playerStats || playerStats.wins === null) {
            return message.reply(`⚠️ Não encontrei estatísticas para **${targetUser.displayName}**. Vá jogar uma partida primeiro!`);
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
                { name: 'MVPs 🌟', value: `\`${playerStats.mvps}\``, inline: true },
                { name: 'Vitórias (V) 🏆', value: `\`${playerStats.wins}\``, inline: true },
                { name: 'Derrotas (D) 💀', value: `\`${playerStats.losses}\``, inline: true }
            )
            .setFooter({ text: 'REC do Panela Velha' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    },
};