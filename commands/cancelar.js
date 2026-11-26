const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { deferReply, respond } = require('../utils/interactionResponse');

module.exports = {
    name: 'cancelar',
    description: 'Cancela a partida em andamento e devolve os jogadores ao LOBBY',
    data: new SlashCommandBuilder()
        .setName('cancelar')
        .setDescription('Cancela a partida em andamento e devolve os jogadores ao LOBBY'),
    
    async execute(interaction) {
        const match = interaction.client.activeMatches.get(interaction.guildId);
        
        if (!match) {
            return respond(interaction, '⚠️ Não há nenhuma partida em andamento para ser cancelada. Usem o `/sorteio` primeiro.');
        }

        const lobbyChannel = interaction.guild.channels.cache.find(c => c.name === 'LOBBY' && c.type === ChannelType.GuildVoice);
        const channelTeam1 = interaction.guild.channels.cache.find(c => c.name === 'TIME 1' && c.type === ChannelType.GuildVoice);
        const channelTeam2 = interaction.guild.channels.cache.find(c => c.name === 'TIME 2' && c.type === ChannelType.GuildVoice);

        await deferReply(interaction);
        const loadingMessage = await interaction.editReply('🛑 **Cancelando a partida...** Nenhum status será alterado no banco de dados. Retornando jogadores para o LOBBY...');

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

            interaction.client.activeMatches.delete(interaction.guildId);

            await loadingMessage.edit(`🛑 **Partida cancelada!** ${movedCount} jogadores voltaram ao LOBBY e o histórico segue intacto. Podem usar \`/sorteio\` novamente.`);

        } catch (error) {
            console.error('Erro ao cancelar partida:', error);
            
            interaction.client.activeMatches.delete(interaction.guildId);
            
            await loadingMessage.edit('❌ A partida foi **cancelada no sistema**, mas ocorreu um erro ao tentar mover os jogadores. Verifiquem minhas permissões nos canais de voz.');
        }
    },
};