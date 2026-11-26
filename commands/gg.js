const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { deferReply, respond } = require('../utils/interactionResponse');

module.exports = {
    name: 'gg',
    description: 'Finaliza os jogos e traz todos de volta para o LOBBY',
    data: new SlashCommandBuilder()
        .setName('gg')
        .setDescription('Finaliza os jogos e traz todos de volta para o LOBBY'),
    
    async execute(interaction) {
        const lobbyChannel = interaction.guild.channels.cache.find(c => c.name === 'LOBBY' && c.type === ChannelType.GuildVoice);
        const channelTeam1 = interaction.guild.channels.cache.find(c => c.name === 'TIME 1' && c.type === ChannelType.GuildVoice);
        const channelTeam2 = interaction.guild.channels.cache.find(c => c.name === 'TIME 2' && c.type === ChannelType.GuildVoice);

        if (interaction.client.activeMatches.has(interaction.guildId)) {
            return respond(interaction, '⚠️ **A partida ainda não teve vencedor declarado.** Declare um vencedor antes de `/gg` ou `/fechartemporada`.');
        }

        if (!lobbyChannel || !channelTeam1 || !channelTeam2) {
            return respond(interaction, '⚠️ **Erro:** Não encontrei os canais de voz necessários (LOBBY, TIME 1 ou TIME 2).');
        }

        await deferReply(interaction);
        const loadingMessage = await interaction.editReply('🏁 **Partida finalizada!** Trazendo os times de volta para a resenha no LOBBY...');
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