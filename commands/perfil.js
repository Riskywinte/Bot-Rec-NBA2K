const { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../database');
const { generateProfileImage } = require('../utils/canvasGen');
const { deferReply, respond } = require('../utils/interactionResponse');

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
        await deferReply(interaction);

        try {
            const db = getDB();
            const seasonRow = db.prepare(
                "SELECT value FROM server_config WHERE key = 'current_season'"
            ).get();
            const season = seasonRow ? seasonRow.value : 1;
            const seasonStats = db.prepare(`
                SELECT COALESCE(SUM(wins), 0) as wins, COALESCE(SUM(losses), 0) as losses
                FROM players
                WHERE discordId = ?
            `).get(targetUser.id);
            const careerStats = db.prepare(`
                SELECT COALESCE(SUM(wins), 0) as wins, COALESCE(SUM(losses), 0) as losses
                FROM (
                    SELECT wins, losses FROM past_seasons WHERE discordId = ?
                    UNION ALL
                    SELECT wins, losses FROM players WHERE discordId = ?
                )
            `).get(targetUser.id, targetUser.id);

            const makeStats = stats => {
                const games = stats.wins + stats.losses;
                return {
                    wins: stats.wins,
                    losses: stats.losses,
                    games,
                    winRate: games > 0 ? Math.round((stats.wins / games) * 100) : 0
                };
            };
            const currentTotals = makeStats(seasonStats);
            const careerTotals = makeStats(careerStats);

            if (careerTotals.games === 0) {
                return respond(interaction, `⚠️ Não encontrei estatísticas para **${targetUser.displayName}**. Vá jogar uma partida primeiro!`);
            }

            const currentPositions = db.prepare(`
                SELECT position, SUM(wins) as wins, SUM(losses) as losses
                FROM players
                WHERE discordId = ?
                GROUP BY position
            `).all(targetUser.id);
            const careerPositions = db.prepare(`
                SELECT position, SUM(wins) as wins, SUM(losses) as losses
                FROM (
                    SELECT position, wins, losses FROM past_seasons WHERE discordId = ?
                    UNION ALL
                    SELECT position, wins, losses FROM players WHERE discordId = ?
                )
                GROUP BY position
            `).all(targetUser.id, targetUser.id);

            const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
            const currentByPosition = Object.fromEntries(
                currentPositions.map(stats => [stats.position, stats])
            );
            const careerByPosition = Object.fromEntries(
                careerPositions.map(stats => [stats.position, stats])
            );
            const positionStats = positions.map(position => ({
                position,
                season: makeStats(currentByPosition[position] || { wins: 0, losses: 0 }),
                career: makeStats(careerByPosition[position] || { wins: 0, losses: 0 })
            }));

            const playedPositions = positionStats.filter(stats => stats.season.games > 0);
            const mostPlayedGames = Math.max(0, ...playedPositions.map(stats => stats.season.games));
            const bestWinRate = Math.max(0, ...playedPositions.map(stats => stats.season.winRate));
            const profile = {
                user: targetUser,
                name: targetUser.displayName,
                season,
                seasonStats: currentTotals,
                careerStats: careerTotals,
                positions: positionStats,
                favoritePosition: playedPositions.length
                    ? playedPositions
                        .filter(stats => stats.season.games === mostPlayedGames)
                        .map(stats => stats.position)
                        .join(' / ')
                    : 'REC',
                mostPlayedPosition: playedPositions.length
                    ? playedPositions
                        .filter(stats => stats.season.games === mostPlayedGames)
                        .map(stats => stats.position)
                        .join(' / ')
                    : 'Ainda sem jogos',
                bestPosition: playedPositions.length
                    ? `${playedPositions
                        .filter(stats => stats.season.winRate === bestWinRate)
                        .map(stats => stats.position)
                        .join(' / ')}: ${bestWinRate}% WR`
                    : 'Ainda sem jogos'
            };

            const image = await generateProfileImage(profile);
            const attachment = new AttachmentBuilder(image, { name: 'perfil.png' });
            const embed = new EmbedBuilder()
                .setColor('#ff6b24')
                .setImage('attachment://perfil.png');

            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (error) {
            console.error('Erro ao gerar imagem do perfil:', error);
            await respond(interaction, '❌ Não foi possível consultar os dados ou gerar a imagem do perfil.');
        }
    },
};