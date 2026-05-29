const { EmbedBuilder } = require('discord.js');
const { getDB } = require('../database');

module.exports = {
    name: 'ranking',
    description: 'Mostra os maiores paneleiros do servidor',
    
    async execute(message, args) {
        const loadingMessage = await message.channel.send('📊 Buscando dados na panela...');

        try {
            // Removido o "await"
            const db = getDB(); 
            
            // Substituído await db.all por db.prepare().all()
            const topPlayers = db.prepare(`SELECT * FROM players ORDER BY wins DESC, mvps DESC LIMIT 10`).all();

            if (topPlayers.length === 0) {
                return loadingMessage.edit('Ainda não há partidas registradas. Joguem o primeiro jogo!');
            }

            const embed = new EmbedBuilder()
                .setTitle('🏀 Leaderboard - REC do Panela Velha')
                .setColor('#f39c12')
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setDescription('Os maiores paneleiros do servidor:');

            let rankingText = '';
            for (let i = 0; i < topPlayers.length; i++) {
                const p = topPlayers[i];
                const user = await message.client.users.fetch(p.discordId).catch(() => null);
                const userName = user ? user.displayName : 'Jogador Desconhecido';
                const totalGames = p.wins + p.losses;
                const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : 0;

                rankingText += `**${i + 1}º** ${userName}\n`;
                rankingText += `└ 🏆 ${p.wins} V | 💀 ${p.losses} D | 📊 ${winRate}% WR | 🌟 ${p.mvps} MVPs\n\n`;
            }

            embed.addFields({ name: 'Top 10', value: rankingText });

            await loadingMessage.delete();
            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao gerar ranking:', error);
            await loadingMessage.edit('❌ Erro ao buscar o ranking no banco de dados.');
        }
    },
};