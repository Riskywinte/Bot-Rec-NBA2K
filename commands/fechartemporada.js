const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../database');
const { deferReply, respond } = require('../utils/interactionResponse');

module.exports = {
    name: 'fechartemporada',
    description: 'Encerra a temporada atual, salva os dados no Hall da Fama e reseta os status',
    data: new SlashCommandBuilder()
        .setName('fechartemporada')
        .setDescription('Encerra a temporada, salva o Hall da Fama e zera os status'),
    
    async execute(interaction) {
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
                return respond(interaction, '⚠️ Nenhuma partida foi registrada nesta temporada ainda! Não há o que encerrar.');
            }

            const overallLeader = db.prepare(`
                SELECT discordId, SUM(wins) as wins
                FROM players
                GROUP BY discordId
                ORDER BY wins DESC
            `).all();
            const mostOverallWins = overallLeader[0].wins;
            const overallLeaders = overallLeader.filter(player => player.wins === mostOverallWins);

            const positionStats = db.prepare(`
                SELECT position, discordId, SUM(wins) as wins
                FROM players
                WHERE position IN ('PG', 'SG', 'SF', 'PF', 'C')
                GROUP BY position, discordId
            `).all();
            const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
            const positionLeaders = positions.map(position => {
                const players = positionStats.filter(player => player.position === position);
                if (players.length === 0) return { position, leaders: [] };

                const mostWins = Math.max(...players.map(player => player.wins));
                return {
                    position,
                    leaders: players.filter(player => player.wins === mostWins)
                };
            });

            await deferReply(interaction);
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
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            let podiumText = '';
            const medalhas = ['🥇', '🥈', '🥉'];
            
            for (let i = 0; i < topPlayers.length; i++) {
                const p = topPlayers[i];
                const user = await interaction.client.users.fetch(p.discordId).catch(() => null);
                const userName = user ? user.displayName : 'Jogador Desconhecido';
                
                podiumText += `${medalhas[i]} **${userName}**\n└ 🏆 ${p.wins} V | 💀 ${p.losses} D\n\n`;
            }

            embed.addFields({ name: '🌟 Pódio da Temporada (Hall da Fama)', value: podiumText });

            const formatLeaders = async leaders => {
                const names = await Promise.all(leaders.map(async player => {
                    const user = await interaction.client.users.fetch(player.discordId).catch(() => null);
                    return user ? user.displayName : 'Jogador Desconhecido';
                }));
                return names.map(name => `**${name}**`).join(', ');
            };

            const awardLines = [
                `**Geral (${mostOverallWins} V):** ${await formatLeaders(overallLeaders)}`
            ];
            for (const { position, leaders } of positionLeaders) {
                const mostWins = leaders.length > 0 ? leaders[0].wins : 0;
                const leaderNames = leaders.length > 0
                    ? await formatLeaders(leaders)
                    : 'Nenhuma partida registrada';
                awardLines.push(`**${position} (${mostWins} V):** ${leaderNames}`);
            }

            embed.addFields({
                name: '👑 Líderes de vitórias por posição e geral',
                value: awardLines.join('\n')
            });

            await interaction.editReply({ content: '@everyone', embeds: [embed] });

        } catch (error) {
            console.error('Erro ao fechar temporada:', error);
            await respond(interaction, '❌ Ocorreu um erro no banco de dados ao tentar fechar a temporada.');
        }
    },
};