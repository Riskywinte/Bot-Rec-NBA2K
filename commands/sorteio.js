const { ChannelType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { generateRosterImage } = require('../utils/canvasGen');
const { deferReply, followUp, respond } = require('../utils/interactionResponse');

module.exports = {
    name: 'sorteio',
    description: 'Sorteia os times automaticamente',
    data: new SlashCommandBuilder()
        .setName('sorteio')
        .setDescription('Sorteia os times automaticamente'),

    async execute(interaction) {
        const lobbyChannel = interaction.guild.channels.cache.find(
            channel => channel.name === 'LOBBY' && channel.type === ChannelType.GuildVoice
        );

        if (!lobbyChannel) {
            return respond(interaction, 'O canal de voz "LOBBY" não foi encontrado.');
        }

        let members = Array.from(lobbyChannel.members.values());

        if (members.length !== 8 && members.length !== 10) {
            return respond(interaction, 'O sorteio requer 8 jogadores para REC com 2 bots ou 10 jogadores para REC completo.');
        }

        const teamSize = members.length / 2;
        const players = [];

        for (const member of members) {
            const positionRoles = member.roles.cache
                .map(role => role.name.trim().toUpperCase())
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
            return respond(interaction, '⚠️ **Aviso:** Nem todos os jogadores na call LOBBY possuem os cargos (PG, SG, SF, PF, C).');
        }

        await deferReply(interaction);
        const loadingMessage = await interaction.editReply('🏀 Sorteando times e gerando a imagem da partida...');

        shuffleArray(players);

        const balancedTeams = chooseBalancedTeams(players, teamSize);
        if (!balancedTeams) {
            const missingInfo = getMissingPositions(players);
            const missingText = missingInfo.missingPositions.length
                ? `
Falta(m) a(s) posição(ões): ${missingInfo.missingPositions.join(', ')}.`
                : missingInfo.scarcityText
                    ? `
${missingInfo.scarcityText}`
                    : '';

            await loadingMessage.edit(`❌ Não foi possível montar dois times sem repetir posições. É necessário ter jogadores suficientes para preencher PG, SG, SF, PF e C em cada time.${missingText}`);
            return;
        }

        const team1 = assignPositions(balancedTeams.team1, balancedTeams.missingPosition);
        const team2 = assignPositions(balancedTeams.team2, balancedTeams.missingPosition);

        try {
            const imageBuffer = await generateRosterImage(team1, team2);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'rec-matchup.png' });
            await loadingMessage.edit({ content: '🔥 **Os times foram definidos!**', files: [attachment] });
        } catch (error) {
            console.error('Erro ao gerar imagem:', error);
            await loadingMessage.edit('❌ Houve um erro ao gerar a imagem dos times, mas o sorteio foi concluído no sistema.');
        }

        const channelTeam1 = interaction.guild.channels.cache.find(c => c.name === 'TIME 1' && c.type === ChannelType.GuildVoice);
        const channelTeam2 = interaction.guild.channels.cache.find(c => c.name === 'TIME 2' && c.type === ChannelType.GuildVoice);

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
                await followUp(interaction, `⚠️ **Aviso:** Não foi possível mover ${moveErrors} jogador(es). É provável que tenham saído da call de voz.`);
            }
        }

        interaction.client.activeMatches.set(interaction.guildId, {
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

        await followUp(interaction, {
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

function assignPositions(teamPlayers, missingPosition) {
    const assignments = findPositionAssignment(teamPlayers, missingPosition, false);
    if (!assignments) return null;

    return assignments.players.map((player, index) => ({
        ...player,
        assignedPosition: assignments.positions[index]
    }));
}

function getMissingPositions(players) {
    const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
    const counts = Object.fromEntries(positions.map(position => [position, 0]));

    for (const player of players) {
        for (const position of player.positions) {
            counts[position] += 1;
        }
    }

    const missingPositions = positions.filter(position => counts[position] < 2);

    if (missingPositions.length > 0) {
        return {
            missingPositions,
            scarcityText: null
        };
    }

    const lowestCount = Math.min(...positions.map(position => counts[position]));
    const scarcePositions = positions.filter(position => counts[position] === lowestCount);

    return {
        missingPositions: [],
        scarcityText: `Nenhuma posição está diretamente faltando. As mais escassas são: ${scarcePositions.join(', ')} (${lowestCount} jogador(es) com esse cargo cada). A falha ocorreu na combinação dos cargos entre os times.`
    };
}

function findPositionAssignment(team, missingPosition = null, ignorePositionRules = false) {
    const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
    const players = [...team].sort((a, b) => a.positions.length - b.positions.length);

    const search = (index, usedPositions, assignments) => {
        if (index === players.length) return assignments;

        const player = players[index];
        const availablePositions = ignorePositionRules ? positions : player.positions;
        for (const position of availablePositions) {
            if (position === missingPosition || (!ignorePositionRules && usedPositions.has(position))) continue;

            const result = search(
                index + 1,
                new Set([...usedPositions, position]),
                [...assignments, position]
            );
            if (result) return result;
        }

        return null;
    };

    const assignedPositions = search(0, new Set(), []);
    if (!assignedPositions) return null;

    return { players, positions: assignedPositions };
}

function chooseBalancedTeams(players, teamSize) {
    const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
    let bestTeam1 = players.slice(0, teamSize);
    let bestMissingPosition = null;
    let bestScore = Infinity;

    const evaluateTeam = team => positions.map(position =>
        team.filter(player => player.positions.includes(position)).length
    );

    const search = (start, selected) => {
        if (selected.length === teamSize) {
            const team1 = selected.map(index => players[index]);
            const selectedIds = new Set(selected);
            const team2 = players.filter((_, index) => !selectedIds.has(index));
            const possibleMissingPositions = teamSize === 4 ? positions : [null];

            for (const missingPosition of possibleMissingPositions) {
                const team1Assignment = findPositionAssignment(team1, missingPosition, false);
                const team2Assignment = findPositionAssignment(team2, missingPosition, false);
                if (!team1Assignment || !team2Assignment) continue;

                const team1Profile = evaluateTeam(team1);
                const team2Profile = evaluateTeam(team2);
                const positionDifference = team1Profile.reduce((total, count, index) =>
                    total + Math.abs(count - team2Profile[index]), 0
                );

                if (positionDifference < bestScore) {
                    bestScore = positionDifference;
                    bestTeam1 = team1;
                    bestMissingPosition = missingPosition;
                }
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

    if (bestScore === Infinity) return null;

    const team1Ids = new Set(bestTeam1);
    return {
        team1: bestTeam1,
        team2: players.filter(player => !team1Ids.has(player)),
        missingPosition: bestMissingPosition
    };
}

module.exports.shuffleArray = shuffleArray;
module.exports.assignPositions = assignPositions;
module.exports.chooseBalancedTeams = chooseBalancedTeams;