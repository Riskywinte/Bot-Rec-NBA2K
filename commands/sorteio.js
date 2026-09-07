const { ChannelType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateRosterImage } = require('../utils/canvasGen');

module.exports = {
    name: 'sorteio',
    description: 'Sorteia os times automaticamente',

    async execute(message, args) {
        const lobbyChannel = message.guild.channels.cache.find(
            channel => channel.name === 'LOBBY' && channel.type === ChannelType.GuildVoice
        );

        if (!lobbyChannel) {
            return message.channel.send('O canal de voz "LOBBY" não foi encontrado.');
        }

        let members = Array.from(lobbyChannel.members.values());

        if (members.length === 0 || members.length % 2 !== 0) {
            return message.channel.send('O sorteio requer um número PAR de jogadores no canal "LOBBY" (ex: 2, 4, 6, 8, 10...).');
        }

        const teamSize = members.length / 2;
        const players = [];

        for (const member of members) {
            const positionRoles = member.roles.cache
                .map(role => role.name.toUpperCase())
                .filter(name => ['PG', 'SG', 'SF', 'PF', 'C'].includes(name));

            if (positionRoles.length > 0) {
                players.push({
                    id: member.id,
                    memberObj: member,
                    name: member.displayName,
                    positions: positionRoles
                });
            }
        }

        if (players.length !== members.length) {
            return message.channel.send('⚠️ **Aviso:** Nem todos os jogadores na call LOBBY possuem os cargos (PG, SG, SF, PF, C).');
        }

        const loadingMessage = await message.channel.send('🏀 Sorteando times e gerando a imagem da partida...');

        shuffleArray(players);

        const assignPositions = teamPlayers => {
            const orderedPlayers = [...teamPlayers]
                .sort((a, b) => a.positions.length - b.positions.length)
            const findUniqueAssignment = (index, usedPositions, assignments) => {
                if (index === orderedPlayers.length) return assignments;

                const player = orderedPlayers[index];
                for (const position of player.positions) {
                    if (usedPositions.has(position)) continue;

                    const nextAssignments = findUniqueAssignment(
                        index + 1,
                        new Set([...usedPositions, position]),
                        [...assignments, position]
                    );
                    if (nextAssignments) return nextAssignments;
                }

                return null;
            };

            const uniqueAssignments = findUniqueAssignment(0, new Set(), []);
            const fallbackAssignments = [];
            const usedFallbackPositions = new Set();

            orderedPlayers.forEach(player => {
                const position = player.positions.find(pos => !usedFallbackPositions.has(pos)) || player.positions[0];
                fallbackAssignments.push(position);
                usedFallbackPositions.add(position);
            });

            const assignments = uniqueAssignments || fallbackAssignments;

            return orderedPlayers.map((player, index) => ({
                ...player,
                assignedPosition: assignments[index]
            }));
        };

        const balancedTeams = chooseBalancedTeams(players, teamSize);
        const team1 = assignPositions(balancedTeams.team1);
        const team2 = assignPositions(balancedTeams.team2);

        try {
            const imageBuffer = await generateRosterImage(team1, team2);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'rec-matchup.png' });
            await loadingMessage.delete();
            await message.channel.send({ content: '🔥 **Os times foram definidos!**', files: [attachment] });
        } catch (error) {
            console.error('Erro ao gerar imagem:', error);
            await loadingMessage.edit('❌ Houve um erro ao gerar a imagem dos times, mas o sorteio foi concluído no sistema.');
        }

        const channelTeam1 = message.guild.channels.cache.find(c => c.name === 'TIME 1' && c.type === ChannelType.GuildVoice);
        const channelTeam2 = message.guild.channels.cache.find(c => c.name === 'TIME 2' && c.type === ChannelType.GuildVoice);

        if (channelTeam1 && channelTeam2) {
            let moveErrors = 0;
            const movePlayer = async (player, channel) => {
                try {
                    await player.memberObj.voice.setChannel(channel);
                    await new Promise(resolve => setTimeout(resolve, 200)); // Delay para evitar Rate Limit
                } catch (error) {
                    console.error(`Erro ao mover o jogador ${player.name}:`, error);
                    moveErrors++;
                }
            };

            for (const player of team1) {
                await movePlayer(player, channelTeam1);
            }
            for (const player of team2) {
                await movePlayer(player, channelTeam2);
            }

            if (moveErrors > 0) {
                await message.channel.send(`⚠️ **Aviso:** Não foi possível mover ${moveErrors} jogador(es). É provável que tenham saído da call de voz.`);
            }
        }

        message.client.activeMatches.set(message.guild.id, {
            team1Data: team1.map(p => ({ id: p.id, name: p.name, position: p.assignedPosition })),
            team2Data: team2.map(p => ({ id: p.id, name: p.name, position: p.assignedPosition }))
        });

        const rowVitoria = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_vitoria_time1')
                .setLabel('Vitória do TIME 1')
                .setEmoji('🔵')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('btn_vitoria_time2')
                .setLabel('Vitória do TIME 2')
                .setEmoji('🔴')
                .setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({
            content: '✅ **Jogadores movidos! Bom jogo!**\n\n👇 *Quando a partida acabar, cliquem no botão abaixo para registrar o vencedor:*',
            components: [rowVitoria]
        });
    },
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function chooseBalancedTeams(players, teamSize) {
    const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
    let bestTeam1 = players.slice(0, teamSize);
    let bestScore = Infinity;

    const evaluateTeam = team => positions.map(position =>
        team.filter(player => player.positions.includes(position)).length
    );

    const search = (start, selected) => {
        if (selected.length === teamSize) {
            const team1 = selected.map(index => players[index]);
            const selectedIds = new Set(selected);
            const team2 = players.filter((_, index) => !selectedIds.has(index));
            const team1Profile = evaluateTeam(team1);
            const team2Profile = evaluateTeam(team2);
            const score = team1Profile.reduce((total, count, index) =>
                total + Math.abs(count - team2Profile[index]), 0
            );

            if (score < bestScore) {
                bestScore = score;
                bestTeam1 = team1;
            }
            return;
        }

        const remaining = teamSize - selected.length;
        for (let index = start; index <= players.length - remaining; index++) {
            selected.push(index);
            search(index + 1, selected);
            selected.pop();
        }
    };

    search(0, []);

    const team1Ids = new Set(bestTeam1);
    return {
        team1: bestTeam1,
        team2: players.filter(player => !team1Ids.has(player))
    };
}