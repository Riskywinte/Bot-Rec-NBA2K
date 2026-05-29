const { EmbedBuilder } = require('discord.js');
const { getDB } = require('../database');

module.exports = {
    name: 'historico',
    description: 'Mostra as últimas 5 partidas disputadas',
    
    async execute(message, args) {
        const db = getDB();
        
        // Pega as últimas 5 partidas ordenadas da mais recente para a mais antiga
        const matches = db.prepare('SELECT * FROM match_history ORDER BY id DESC LIMIT 5').all();

        if (matches.length === 0) {
            return message.channel.send('📖 Ainda não há histórico de partidas. Vão pra quadra!');
        }

        const embed = new EmbedBuilder()
            .setTitle('📖 Últimas Partidas - Panela Velha')
            .setColor('#9b59b6')
            .setDescription('Confira os resultados recentes:');

        for (const match of matches) {
            // Busca o nome do MVP no Discord
            const mvpUser = await message.client.users.fetch(match.mvp_id).catch(() => null);
            const mvpName = mvpUser ? mvpUser.displayName : 'Jogador Desconhecido';
            
            // Converte a data do banco (UTC) para o timestamp nativo do Discord (que se adapta ao fuso do usuário)
            const date = new Date(match.timestamp + 'Z'); 
            const discordTime = `<t:${Math.floor(date.getTime() / 1000)}:R>`; // Mostra como "há X minutos/horas"

            embed.addFields({
                name: `Partida #${match.id} - ${discordTime}`,
                value: `🏆 Vencedor: **${match.winner_team.toUpperCase()}**\n🌟 MVP: **${mvpName}**`,
                inline: false
            });
        }

        await message.channel.send({ embeds: [embed] });
    },
};