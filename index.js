require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const token = process.env.DISCORD_TOKEN;

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('messageCreate', async message => {
    if (message.content.startsWith('!sorteio')) {
        // 1. Busca o canal do LOBBY
        const lobbyChannel = message.guild.channels.cache.find(channel => channel.name === 'LOBBY' && channel.type === ChannelType.GuildVoice);

        if (!lobbyChannel) {
            message.channel.send('O canal de voz "LOBBY" não foi encontrado.');
            return;
        }

        let members = Array.from(lobbyChannel.members.values());

        if (members.length === 0 || members.length % 2 !== 0) {
            message.channel.send('O sorteio requer um número PAR de jogadores no canal "LOBBY" (ex: 2, 4, 6, 8, 10...).');
            return;
        }

        const teamSize = members.length / 2;
        const players = [];

        members.forEach(member => {
            const roles = member.roles.cache;
            const positionRoles = [];

            roles.forEach(role => {
                if (['PG', 'SG', 'SF', 'PF', 'C'].includes(role.name)) {
                    positionRoles.push(role.name);
                }
            });

            if (positionRoles.length > 0) {
                players.push({
                    id: member.id,
                    memberObj: member, // <-- SALVANDO O OBJETO DO MEMBRO PARA MOVER DEPOIS
                    name: member.displayName,
                    positions: positionRoles
                });
            }
        });

        if (players.length !== members.length) {
            message.channel.send('Nem todos os jogadores no canal têm os cargos de posição (PG, SG, SF, PF, C) atribuídos.');
            return;
        }

        shuffleArray(players);

        const team1 = [];
        const team2 = [];

        const assignPlayerToTeam = (player, team, position) => {
            if (!team.some(p => p.id === player.id) && team.length < teamSize) {
                team.push({ ...player, assignedPosition: position });
            }
        };

        const getPlayersByPosition = (players, position) => {
            return players.filter(player => player.positions.includes(position));
        };

        const assignPositions = (team1, team2, players, positions) => {
            const remainingPlayers = [...players]; 
            positions.forEach(position => {
                const availablePlayers = getPlayersByPosition(remainingPlayers, position);
                if (availablePlayers.length > 0) {
                    assignPlayerToTeam(availablePlayers[0], team1, position);
                    remainingPlayers.splice(remainingPlayers.indexOf(availablePlayers[0]), 1);
                    if (availablePlayers.length > 1) {
                        assignPlayerToTeam(availablePlayers[1], team2, position);
                        remainingPlayers.splice(remainingPlayers.indexOf(availablePlayers[1]), 1);
                    }
                }
            });
            return remainingPlayers;
        };

        let remainingPlayers = assignPositions(team1, team2, players, ['PG']);
        remainingPlayers = assignPositions(team1, team2, remainingPlayers, ['SG']);
        remainingPlayers = assignPositions(team1, team2, remainingPlayers, ['SF']);
        remainingPlayers = assignPositions(team1, team2, remainingPlayers, ['PF']);
        remainingPlayers = assignPositions(team1, team2, remainingPlayers, ['C']);

        const remainingPositions = ['PG', 'SG', 'SF', 'PF', 'C'];
        remainingPlayers.forEach(player => {
            const team = team1.length < teamSize ? team1 : team2;
            const position = remainingPositions.find(pos => !team.some(p => p.assignedPosition === pos)) || player.positions[0];
            assignPlayerToTeam(player, team, position);
        });

        const formatTeamOutput = (team) => {
            return team.map(p => `🏀 **${p.name}** (Vai jogar de: **${p.assignedPosition}**)`).join('\n');
        };

        // Envia as mensagens com os times formados
        await message.channel.send(`### 🔴 Team 1\n${formatTeamOutput(team1)}`);
        await message.channel.send(`### 🔵 Team 2\n${formatTeamOutput(team2)}`);

        // ==========================================
        // LÓGICA PARA MOVER OS JOGADORES DE CALL
        // ==========================================
        
        // 2. Busca os canais de destino (Lembre-se de criar esses canais no Discord ou mudar o nome aqui!)
        const channelTeam1 = message.guild.channels.cache.find(c => c.name === 'TIME 1' && c.type === ChannelType.GuildVoice);
        const channelTeam2 = message.guild.channels.cache.find(c => c.name === 'TIME 2' && c.type === ChannelType.GuildVoice);

        if (!channelTeam1 || !channelTeam2) {
            message.channel.send('⚠️ **Aviso:** Os times foram sorteados, mas não consegui mover os jogadores porque não encontrei os canais de voz "TIME 1" e/ou "TIME 2".');
            return;
        }

        try {
            // Move jogadores do time 1
            for (const player of team1) {
                await player.memberObj.voice.setChannel(channelTeam1);
            }
            // Move jogadores do time 2
            for (const player of team2) {
                await player.memberObj.voice.setChannel(channelTeam2);
            }
            
            message.channel.send('✅ **Todos os jogadores foram movidos para as calls de seus times!** Bom jogo!');
        } catch (error) {
            console.error(error);
            message.channel.send('❌ Ocorreu um erro ao tentar mover os jogadores. Verifique se eu tenho as permissões necessárias.');
        }
    }
});

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

client.login(token);