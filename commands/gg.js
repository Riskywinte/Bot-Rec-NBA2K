const { ChannelType } = require('discord.js');

module.exports = {
    name: 'gg',
    description: 'Finaliza os jogos e traz todos de volta para o LOBBY',
    
    async execute(message, args) {
        const lobbyChannel = message.guild.channels.cache.find(c => c.name === 'LOBBY' && c.type === ChannelType.GuildVoice);
        const channelTeam1 = message.guild.channels.cache.find(c => c.name === 'TIME 1' && c.type === ChannelType.GuildVoice);
        const channelTeam2 = message.guild.channels.cache.find(c => c.name === 'TIME 2' && c.type === ChannelType.GuildVoice);

        if (message.client.activeMatches.has(message.guild.id)) {
            return message.channel.send('⚠️ **A partida ainda não teve vencedor declarado.** Declare um Vencedor antes de `!gg` ou `!fim`.');
        }

        if (!lobbyChannel || !channelTeam1 || !channelTeam2) {
            return message.channel.send('⚠️ **Erro:** Não encontrei os canais de voz necessários (LOBBY, TIME 1 ou TIME 2).');
        }

        const loadingMessage = await message.channel.send('🏁 **Partida finalizada!** Trazendo os times de volta para a resenha no LOBBY...');
        let movedCount = 0;

        try {
            for (const [memberId, member] of channelTeam1.members) {
                await member.voice.setChannel(lobbyChannel);
                movedCount++;
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            for (const [memberId, member] of channelTeam2.members) {
                await member.voice.setChannel(lobbyChannel);
                movedCount++;
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            if (movedCount === 0) {
                await loadingMessage.edit('⚠️ Os canais TIME 1 e TIME 2 já estavam vazios.');
            } else {
                await loadingMessage.edit(`✅ **GG WP!** ${movedCount} jogadores retornaram ao LOBBY. Quem vai ser o próximo capitão? 🏀`);
            }
        } catch (error) {
            console.error(error);
            await loadingMessage.edit('❌ Ocorreu um erro ao tentar mover os jogadores. Verifique se tenho a permissão "Mover Membros".');
        }
    },
};