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

        const team1 = [];
        const team2 = [];
        let unassignedPlayers = [...players];

        const assignPlayer = (team, player, position) => {
            team.push({ ...player, assignedPosition: position });
            unassignedPlayers = unassignedPlayers.filter(p => p.id !== player.id);
        };

        const tryAssignPosition = (pos) => {
            if (team1.length < teamSize && !team1.some(p => p.assignedPosition === pos)) {
                const playerA = unassignedPlayers.find(p => p.positions.includes(pos));
                if (playerA) assignPlayer(team1, playerA, pos);
            }
            if (team2.length < teamSize && !team2.some(p => p.assignedPosition === pos)) {
                const playerB = unassignedPlayers.find(p => p.positions.includes(pos));
                if (playerB) assignPlayer(team2, playerB, pos);
            }
        };

        // Conta a quantidade de jogadores disponíveis para cada posição
        const positionCounts = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
        players.forEach(p => p.positions.forEach(pos => positionCounts[pos]++));

        const positionsOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
        shuffleArray(positionsOrder);
        // Prioriza as posições que os jogadores no lobby mais jogam
        positionsOrder.sort((a, b) => positionCounts[b] - positionCounts[a]);
        
        // Pega exatamente a quantidade de posições baseada no tamanho do time (ex: 4)
        const matchPositions = positionsOrder.slice(0, teamSize);

        // Prioriza jogadores com menos opções de cargos (menos flexíveis) para que peguem suas roles primeiro
        unassignedPlayers.sort((a, b) => a.positions.length - b.positions.length);

        matchPositions.forEach(pos => tryAssignPosition(pos));

        const leftovers = [...unassignedPlayers];

        leftovers.forEach(player => {
            const targetTeam = (team1.length <= team2.length && team1.length < teamSize) ? team1 : team2;
            
            // Tenta encaixar o jogador em uma das posições espelhadas que ainda falta no time
            let freePos = player.positions.find(pos => matchPositions.includes(pos) && !targetTeam.some(p => p.assignedPosition === pos));
            // Se ele não tiver a role exata, aloca-o forçadamente na posição espelhada que sobrou
            if (!freePos) {
                freePos = matchPositions.find(pos => !targetTeam.some(p => p.assignedPosition === pos));
            }
            if (!freePos) freePos = player.positions[0];
            
            assignPlayer(targetTeam, player, freePos);
        });

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