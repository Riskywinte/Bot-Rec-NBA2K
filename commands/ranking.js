const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../database');
const { generateRankingImage } = require('../utils/canvasGen');
const { deferReply, respond } = require('../utils/interactionResponse');

module.exports = {
    name: 'ranking',
    description: 'Mostra os maiores paneleiros do servidor ou filtra por posição',
    data: new SlashCommandBuilder()
        .setName('ranking')
        .setDescription('Mostra o ranking geral ou filtra por posição')
        .addStringOption(option => option
            .setName('posicao')
            .setDescription('Filtra o ranking por posição')
            .setRequired(false)
            .addChoices(
                { name: 'PG', value: 'PG' },
                { name: 'SG', value: 'SG' },
                { name: 'SF', value: 'SF' },
                { name: 'PF', value: 'PF' },
                { name: 'C', value: 'C' }
            )),

    async execute(interaction, positionOverride = null) {
        const selectedPosition = positionOverride ||
            (interaction.isChatInputCommand() ? interaction.options.getString('posicao') : null);
        const positionFilter = selectedPosition?.toUpperCase();
        const validPositions = ['PG', 'SG', 'SF', 'PF', 'C'];
        const filteredPosition = validPositions.includes(positionFilter) ? positionFilter : null;

        await deferReply(interaction);

        try {
            const db = getDB();
            const players = filteredPosition
                ? db.prepare(`
                    SELECT discordId, wins, losses
                    FROM players
                    WHERE position = ?
                    ORDER BY wins DESC, losses ASC
                    LIMIT 10
                `).all(filteredPosition)
                : db.prepare(`
                    SELECT discordId, SUM(wins) as wins, SUM(losses) as losses
                    FROM players
                    GROUP BY discordId
                    ORDER BY wins DESC, losses ASC
                    LIMIT 10
                `).all();
            const summary = filteredPosition
                ? db.prepare(`
                    SELECT COUNT(DISTINCT discordId) as playerCount,
                        COALESCE(SUM(wins + losses), 0) as totalGames
                    FROM players
                    WHERE position = ?
                `).get(filteredPosition)
                : db.prepare(`
                    SELECT COUNT(DISTINCT discordId) as playerCount,
                        COALESCE(SUM(wins + losses), 0) as totalGames
                    FROM players
                `).get();
            const seasonRow = db.prepare(
                "SELECT value FROM server_config WHERE key = 'current_season'"
            ).get();

            if (players.length > 0) {
                const playerIds = players.map(player => player.discordId);
                await interaction.guild.members.fetch({ user: playerIds }).catch(console.error);
            }

            const leaderboard = players.map(player => {
                const member = interaction.guild.members.cache.get(player.discordId);
                const games = player.wins + player.losses;
                return {
                    name: member ? member.displayName : 'Jogador Desconhecido',
                    wins: player.wins,
                    losses: player.losses,
                    games,
                    winRate: games > 0 ? Math.round((player.wins / games) * 100) : 0
                };
            });
            const image = await generateRankingImage({
                position: filteredPosition,
                season: seasonRow ? seasonRow.value : 1,
                playerCount: summary.playerCount,
                totalGames: summary.totalGames,
                players: leaderboard
            });
            const attachment = new AttachmentBuilder(image, { name: 'ranking.png' });
            const embed = new EmbedBuilder()
                .setColor('#ff6b24')
                .setImage('attachment://ranking.png');

            const selectedLabel = filteredPosition
                ? `**${filteredPosition}**`
                : '**Geral (todas as posições)**';
            const rowFiltros = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_rank_geral').setLabel('GERAL').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_rank_pg').setLabel('PG').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_rank_sg').setLabel('SG').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_rank_sf').setLabel('SF').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_rank_pf').setLabel('PF').setStyle(ButtonStyle.Primary)
            );
            const rowFiltros2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_rank_c').setLabel('C').setStyle(ButtonStyle.Primary)
            );

            await interaction.editReply({
                content: `🏆 **Ranking por posição**\nVendo agora: ${selectedLabel}\nEscolha uma posição para filtrar vitórias, derrotas e aproveitamento.`,
                embeds: [embed],
                files: [attachment],
                components: [rowFiltros, rowFiltros2]
            });
        } catch (error) {
            console.error('Erro ao gerar ranking:', error);
            await respond(interaction, '❌ Erro ao buscar o ranking no banco de dados.');
        }
    },
};
