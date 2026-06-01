const { ChannelType } = require('discord.js');

module.exports = {
    name: 'cancelar',
    description: 'Cancela a partida em andamento e devolve os jogadores ao LOBBY',
    
    async execute(message, args) {
        const match = message.client.activeMatches.get(message.guild.id);
        
        if (!match) {
            return message.channel.send('⚠️ Não há nenhuma partida em andamento para ser cancelada. Usem o `!sorteio` primeiro.');
        }

        const lobbyChannel = message.guild.channels.cache.find(c => c.name === 'LOBBY' && c.type === ChannelType.GuildVoice);
        const channelTeam1 = message.guild.channels.cache.find(c => c.name === 'TIME 1' && c.type === ChannelType.GuildVoice);
        const channelTeam2 = message.guild.channels.cache.find(c => c.name === 'TIME 2' && c.type === ChannelType.GuildVoice);

        const loadingMessage = await message.channel.send('🛑 **Cancelando a partida...** Nenhum status será alterado no banco de dados. Retornando jogadores para o LOBBY...');

        let movedCount = 0;

        try {
            if (channelTeam1 && lobbyChannel) {
                for (const [memberId, member] of channelTeam1.members) {
                    await member.voice.setChannel(lobbyChannel);
                    movedCount++;
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            if (channelTeam2 && lobbyChannel) {
                for (const [memberId, member] of channelTeam2.members) {
                    await member.voice.setChannel(lobbyChannel);
                    movedCount++;
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            message.client.activeMatches.delete(message.guild.id);

            await loadingMessage.edit(`🛑 **Partida cancelada!** ${movedCount} jogadores voltaram ao LOBBY e o histórico segue intacto. Podem puxar o \`!sorteio\` novamente.`);

        } catch (error) {
            console.error('Erro ao cancelar partida:', error);
            
            message.client.activeMatches.delete(message.guild.id);
            
            await loadingMessage.edit('❌ A partida foi **cancelada no sistema**, mas ocorreu um erro ao tentar mover os jogadores. Verifiquem minhas permissões nos canais de voz.');
        }
    },
};