const { EmbedBuilder } = require('discord.js');
const { getDB } = require('../database');

module.exports = {
    name: 'perfil',
    description: 'Mostra o Player Card e as estatísticas de um jogador',
    
    async execute(message, args) {
        // Pega o usuário mencionado ou o próprio autor da mensagem
        const targetUser = message.mentions.users.first() || message.author;
        const db = getDB();

        // Busca o jogador no banco de dados
        const player = db.prepare('SELECT * FROM players WHERE discordId = ?').get(targetUser.id);

        if (!player) {
            return message.reply(`⚠️ Não encontrei estatísticas para **${targetUser.displayName}**. Vá jogar uma partida primeiro!`);
        }

        // Cálculos de aproveitamento
        const totalGames = player.wins + player.losses;
        const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;

        // Monta o Embed (Player Card)
        const embed = new EmbedBuilder()
            .setTitle(`🏀 Player Card: ${targetUser.displayName}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .setColor('#3498db')
            .addFields(
                { name: 'Partidas Jogadas', value: `\`${totalGames}\``, inline: true },
                { name: 'Win Rate (WR)', value: `\`${winRate}%\``, inline: true },
                { name: 'MVPs 🌟', value: `\`${player.mvps}\``, inline: true },
                { name: 'Vitórias (V) 🏆', value: `\`${player.wins}\``, inline: true },
                { name: 'Derrotas (D) 💀', value: `\`${player.losses}\``, inline: true }
            )
            .setFooter({ text: 'REC do Panela Velha' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    },
};