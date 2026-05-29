require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');

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

// ==========================================
// FUNÇÃO PARA GERAR A IMAGEM DOS TIMES
// ==========================================
async function generateRosterImage(team1, team2) {
    const canvas = Canvas.createCanvas(1000, 700);
    const ctx = canvas.getContext('2d');

    // Fundo escuro
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Título Central
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('REC do Panela Velha', canvas.width / 2, 60);

    // Cabeçalhos dos Times
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#3498db'; // Azul para o TEAM A
    ctx.fillText('TEAM A', 250, 120);
    ctx.fillStyle = '#e74c3c'; // Vermelho para o TEAM B
    ctx.fillText('TEAM B', 750, 120);

    const positionsOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
    const startY = 160;
    const slotHeight = 90;
    const slotWidth = 400;
    const gap = 15;

    const drawSlot = async (x, y, position, player, isTeamB) => {
        // Fundo do Slot e Borda
        ctx.fillStyle = isTeamB ? '#2a1a1a' : '#1a202a';
        ctx.strokeStyle = isTeamB ? '#e74c3c' : '#3498db';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, slotWidth, slotHeight);
        ctx.strokeRect(x, y, slotWidth, slotHeight);

        // Badge da Posição (PG, SG, etc)
        ctx.fillStyle = isTeamB ? '#e74c3c' : '#3498db';
        ctx.fillRect(x + 100, y + 20, 45, 25);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(position, x + 122, y + 38);

        // Dados do Jogador
        ctx.textAlign = 'left';
        ctx.font = 'bold 24px Arial';
        if (player) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText(player.name, x + 100, y + 75);

            try {
                const avatarUrl = player.memberObj.user.displayAvatarURL({ extension: 'png', size: 64 });
                const avatar = await Canvas.loadImage(avatarUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(x + 50, y + 45, 30, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, x + 20, y + 15, 60, 60);
                ctx.restore();
            } catch (e) {
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.arc(x + 50, y + 45, 30, 0, Math.PI * 2, true);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#555555';
            ctx.fillText('VAZIO', x + 100, y + 75);

            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(x + 50, y + 45, 30, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.fillStyle = '#777';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('?', x + 50, y + 52);
        }
    };

    for (let i = 0; i < positionsOrder.length; i++) {
        const pos = positionsOrder[i];
        const playerA = team1.find(p => p.assignedPosition === pos);
        const playerB = team2.find(p => p.assignedPosition === pos);
        
        const currentY = startY + (i * (slotHeight + gap));

        await drawSlot(50, currentY, pos, playerA, false);
        await drawSlot(550, currentY, pos, playerB, true);
    }

    return canvas.toBuffer();
}

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('messageCreate', async message => {
    if (message.content.startsWith('!sorteio')) {
        const lobbyChannel = message.guild.channels.cache.find(channel => channel.name === 'LOBBY' && channel.type === ChannelType.GuildVoice);

        if (!lobbyChannel) {
            return message.channel.send('O canal de voz "LOBBY" não foi encontrado.');
        }

        let members = Array.from(lobbyChannel.members.values());

        if (members.length === 0 || members.length % 2 !== 0) {
            return message.channel.send('O sorteio requer um número PAR de jogadores no canal "LOBBY" (ex: 2, 4, 6, 8, 10...).');
        }

        const teamSize = members.length / 2;
        const players = [];

        members.forEach(member => {
            const roles = member.roles.cache;
            const positionRoles = [];

            roles.forEach(role => {
                // Adicionado toUpperCase() para prevenir erro se o cargo estiver em minúsculo
                if (['PG', 'SG', 'SF', 'PF', 'C'].includes(role.name.toUpperCase())) {
                    positionRoles.push(role.name.toUpperCase());
                }
            });

            if (positionRoles.length > 0) {
                players.push({
                    id: member.id,
                    memberObj: member, 
                    name: member.displayName,
                    positions: positionRoles
                });
            }
        });

        if (players.length !== members.length) {
            return message.channel.send('⚠️ **Aviso:** Nem todos os jogadores na call LOBBY possuem os cargos (PG, SG, SF, PF, C). Todos precisam ter pelo menos uma posição!');
        }

        const loadingMessage = await message.channel.send('🏀 Sorteando times e gerando a imagem da partida...');

        shuffleArray(players);

        // ==========================================
        // NOVA LÓGICA DE DISTRIBUIÇÃO (À PROVA DE FALHAS)
        // ==========================================
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

        ['PG', 'SG', 'SF', 'PF', 'C'].forEach(pos => tryAssignPosition(pos));

        const positionsOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
        
        // Distribui quem sobrou tapando os buracos das posições
        const leftovers = [...unassignedPlayers];
        leftovers.forEach(player => {
            // Joga no time que tiver menos gente
            const targetTeam = (team1.length <= team2.length && team1.length < teamSize) ? team1 : team2;
            
            // Acha a primeira posição vazia nesse time
            let freePos = positionsOrder.find(pos => !targetTeam.some(p => p.assignedPosition === pos));
            if (!freePos) freePos = player.positions[0]; 

            assignPlayer(targetTeam, player, freePos);
        });
        // ==========================================

        try {
            const imageBuffer = await generateRosterImage(team1, team2);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'rec-matchup.png' });
            
            await loadingMessage.delete();
            await message.channel.send({ content: '🔥 **Os times foram definidos!**', files: [attachment] });
        } catch (error) {
            console.error('Erro ao gerar imagem:', error);
            await loadingMessage.edit('❌ Houve um erro ao gerar a imagem dos times, mas os times foram sorteados no sistema.');
        }

        const channelTeam1 = message.guild.channels.cache.find(c => c.name === 'TIME 1' && c.type === ChannelType.GuildVoice);
        const channelTeam2 = message.guild.channels.cache.find(c => c.name === 'TIME 2' && c.type === ChannelType.GuildVoice);

        if (!channelTeam1 || !channelTeam2) {
            return message.channel.send('⚠️ **Aviso:** Os times foram sorteados, mas não movi os jogadores pois não encontrei os canais de voz "TIME 1" e/ou "TIME 2".');
        }

        try {
            for (const player of team1) {
                await player.memberObj.voice.setChannel(channelTeam1);
            }
            for (const player of team2) {
                await player.memberObj.voice.setChannel(channelTeam2);
            }
            message.channel.send('✅ **Jogadores movidos para os canais de voz das equipes! Bom jogo!**');
        } catch (error) {
            console.error(error);
            message.channel.send('❌ Ocorreu um erro ao tentar mover os jogadores. Verifique minhas permissões de "Mover Membros".');
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