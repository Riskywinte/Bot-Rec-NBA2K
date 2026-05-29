const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'painel',
    description: 'Gera o painel de botões para o servidor (Apenas Admins)',
    
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send('⚠️ Apenas administradores podem criar o painel.');
        }

        const embed = new EmbedBuilder()
            .setTitle('🏀 Painel de Controle - Panela Velha')
            .setColor('#e67e22')
            .setDescription('Use os botões abaixo para gerenciar as partidas do REC!')
            .setImage('https://i.imgur.com/YOUR_IMAGE_URL_HERE.png') // Opcional: coloque um banner legal aqui
            .setFooter({ text: 'Clique na ação desejada' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_sorteio')
                .setLabel('Sorteio (Lobby)')
                .setEmoji('🎲')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('btn_cancelar')
                .setLabel('Cancelar Partida')
                .setEmoji('🛑')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('btn_ranking')
                .setLabel('Ver Ranking')
                .setEmoji('🏆')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    },
};