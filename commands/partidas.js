const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDB } = require('../database');

const ONLY_REC_ROLE_NAME = 'only rec';
const PLAYERS_PER_PAGE = 10;

const normalizeRoleName = name => name
    .trim()
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');

const isOnlyRecRole = role => normalizeRoleName(role.name) === ONLY_REC_ROLE_NAME;

module.exports = {
    name: 'partidas',
    description: 'Lista os jogadores onlyrec por quantidade de partidas',

    async execute(message, args = []) {
        try {
            await message.guild.members.fetch();

            const onlyRecMembers = [...message.guild.members.cache.values()]
                .filter(member => !member.user.bot)
                .filter(member => member.roles.cache.some(isOnlyRecRole));

            if (onlyRecMembers.length === 0) {
                return message.channel.send('⚠️ Nenhum jogador com o cargo **(ONLY REC)** foi encontrado.');
            }

            const db = getDB();
            const statsByPlayer = new Map(
                db.prepare(`
                    SELECT discordId, COALESCE(SUM(wins), 0) + COALESCE(SUM(losses), 0) AS games
                    FROM players
                    GROUP BY discordId
                `).all().map(player => [player.discordId, player.games])
            );

            const players = onlyRecMembers.map(member => ({
                member,
                games: statsByPlayer.get(member.id) || 0
            }));

            const mostGames = [...players].sort((a, b) =>
                b.games - a.games || a.member.displayName.localeCompare(b.member.displayName)
            );
            const fewestGames = [...players].sort((a, b) =>
                a.games - b.games || a.member.displayName.localeCompare(b.member.displayName)
            );

            const totalPages = Math.max(
                1,
                Math.ceil(Math.max(mostGames.length, fewestGames.length) / PLAYERS_PER_PAGE)
            );
            const requestedPage = Number.parseInt(args[0], 10) || 1;
            const page = Math.min(Math.max(requestedPage, 1), totalPages);
            const pageStart = (page - 1) * PLAYERS_PER_PAGE;

            const formatList = list => list.slice(pageStart, pageStart + PLAYERS_PER_PAGE)
                .map((player, index) => `**${pageStart + index + 1}º** ${player.member.displayName} — **${player.games}** ${player.games === 1 ? 'partida' : 'partidas'}`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle('🏀 Partidas dos jogadores (ONLY REC)')
                .setColor('#3498db')
                .setDescription(`Todos os jogadores com o cargo **(ONLY REC)**, incluindo quem ainda não possui registro.\nPágina **${page}/${totalPages}**`)
                .setThumbnail(message.guild.iconURL({ dynamic: true }));

            embed.addFields(
                { name: '🔥 Mais partidas', value: formatList(mostGames) || 'Nenhum jogador nesta página.', inline: false },
                { name: '📉 Menos partidas', value: formatList(fewestGames) || 'Nenhum jogador nesta página.', inline: false }
            );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`btn_partidas_prev_${page}`)
                    .setLabel('Anterior')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId(`btn_partidas_next_${page}`)
                    .setLabel('Próxima')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages)
            );

            const response = { embeds: [embed], components: [row] };
            if (message.isInteractionMock) {
                await message.replyObj(response);
            } else {
                await message.channel.send(response);
            }
        } catch (error) {
            console.error('Erro ao listar partidas:', error);
            await message.channel.send('❌ Ocorreu um erro ao buscar a lista de partidas.');
        }
    },
};