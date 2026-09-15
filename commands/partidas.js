const { EmbedBuilder } = require('discord.js');
const { getDB } = require('../database');

const MAX_FIELD_LENGTH = 1024;
const ONLY_REC_ROLE_NAME = '(only rec)';

module.exports = {
    name: 'partidas',
    description: 'Lista os jogadores onlyrec por quantidade de partidas',

    async execute(message) {
        try {
            await message.guild.members.fetch();

            const onlyRecMembers = [...message.guild.members.cache.values()]
                .filter(member => !member.user.bot)
                .filter(member => member.roles.cache.some(role => role.name.trim().toLowerCase() === ONLY_REC_ROLE_NAME));

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

            const formatList = list => list
                .map((player, index) => `**${index + 1}º** ${player.member.displayName} — **${player.games}** ${player.games === 1 ? 'partida' : 'partidas'}`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle('🏀 Partidas dos jogadores (ONLY REC)')
                .setColor('#3498db')
                .setDescription('Todos os jogadores com o cargo **(ONLY REC)**, incluindo quem ainda não possui registro.')
                .setThumbnail(message.guild.iconURL({ dynamic: true }));

            addChunkedFields(embed, '🔥 Mais partidas', formatList(mostGames));
            addChunkedFields(embed, '📉 Menos partidas', formatList(fewestGames));

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao listar partidas:', error);
            await message.channel.send('❌ Ocorreu um erro ao buscar a lista de partidas.');
        }
    },
};

function addChunkedFields(embed, name, text) {
    let chunk = '';
    let part = 1;

    for (const line of text.split('\n')) {
        if (chunk && `${chunk}\n${line}`.length > MAX_FIELD_LENGTH) {
            embed.addFields({
                name: part === 1 ? name : `${name} (continuação)`,
                value: chunk,
                inline: false
            });
            chunk = '';
            part++;
        }

        chunk += `${chunk ? '\n' : ''}${line}`;
    }

    if (chunk) {
        embed.addFields({
            name: part === 1 ? name : `${name} (continuação)`,
            value: chunk,
            inline: false
        });
    }
}