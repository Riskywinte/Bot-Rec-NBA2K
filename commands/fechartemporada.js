const { EmbedBuilder } = require('discord.js');
const { getDB } = require('../database');

module.exports = {
    name: 'fechartemporada',
    description: 'Encerra a temporada atual, salva os dados no Hall da Fama e reseta os status',
    
    async execute(message, args) {
        const db = getDB();

        try {
            const seasonRow = db.prepare("SELECT value FROM server_config WHERE key = 'current_season'").get();
            const currentSeason = seasonRow ? seasonRow.value : 1;

            
            const topPlayers = db.prepare(`
                SELECT discordId, SUM(wins) as wins, SUM(losses) as losses
                FROM players 
                GROUP BY discordId
                ORDER BY wins DESC
                LIMIT 3
            `).all();

            if (topPlayers.length === 0) {
                return message.channel.send('⚠️ Nenhuma partida foi registrada nesta temporada ainda! Não há o que encerrar.');
            }

            const fecharTemporadaTx = db.transaction(() => {
                
                const insertHistory = db.prepare(`
                    INSERT INTO past_seasons (discordId, position, season, wins, losses)
                    VALUES (@discordId, @position, @season, @wins, @losses)
                    ON CONFLICT(discordId, position, season) DO UPDATE SET
                        wins = excluded.wins,
                        losses = excluded.losses
                `);
                
                const allPlayersLines = db.prepare('SELECT * FROM players').all();
                for (const p of allPlayersLines) {
                    insertHistory.run({
                        discordId: p.discordId,
                        position: p.position,
                        season: currentSeason,
                        wins: p.wins,
                        losses: p.losses
                    });
                }

                db.prepare('DELETE FROM players').run();

                db.prepare("UPDATE server_config SET value = value + 1 WHERE key = 'current_season'").run();
            });

            fecharTemporadaTx();

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Fim da Temporada ${currentSeason}!`)
                .setColor('#f1c40f')
                .setDescription(`A **Temporada ${currentSeason}** chegou ao fim! Todos os status foram zerados e arquivados. A **Temporada ${currentSeason + 1}** acaba de começar!`)
                .setThumbnail(message.guild.iconURL({ dynamic: true }));

            let podiumText = '';
            const medalhas = ['🥇', '🥈', '🥉'];
            
            for (let i = 0; i < topPlayers.length; i++) {
                const p = topPlayers[i];
                const user = await message.client.users.fetch(p.discordId).catch(() => null);
                const userName = user ? user.displayName : 'Jogador Desconhecido';
                
                podiumText += `${medalhas[i]} **${userName}**\n└ 🏆 ${p.wins} V | 💀 ${p.losses} D\n\n`;
            }

            embed.addFields({ name: '🌟 Pódio da Temporada (Hall da Fama)', value: podiumText });

            await message.channel.send({ content: '@everyone', embeds: [embed] });

        } catch (error) {
            console.error('Erro ao fechar temporada:', error);
            message.channel.send('❌ Ocorreu um erro no banco de dados ao tentar fechar a temporada.');
        }
    },
};