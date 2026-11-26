const { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../database');
const { generateHistoryImage } = require('../utils/canvasGen');
const { deferReply, respond } = require('../utils/interactionResponse');

module.exports = {
    name: 'historico',
    description: 'Mostra as últimas 5 partidas disputadas',
    data: new SlashCommandBuilder()
        .setName('historico')
        .setDescription('Mostra as últimas 5 partidas disputadas'),

    async execute(interaction) {
        await deferReply(interaction);

        try {
            const db = getDB();
            const matches = db.prepare('SELECT * FROM match_history ORDER BY id DESC LIMIT 5').all();
            const imageMatches = matches.map(match => {
                const timestamp = new Date(`${match.timestamp}Z`);
                return {
                    id: match.id,
                    date: Number.isNaN(timestamp.getTime())
                        ? String(match.timestamp || '')
                        : timestamp.toLocaleString('pt-BR'),
                    winner: match.winner_team,
                    team1: match.team1_members ? JSON.parse(match.team1_members) : [],
                    team2: match.team2_members ? JSON.parse(match.team2_members) : []
                };
            });
            const image = await generateHistoryImage(imageMatches);
            const attachment = new AttachmentBuilder(image, { name: 'historico.png' });
            const embed = new EmbedBuilder()
                .setColor('#ff6b24')
                .setImage('attachment://historico.png');

            await interaction.editReply({
                content: '📖 **Últimas partidas disputadas**',
                embeds: [embed],
                files: [attachment]
            });
        } catch (error) {
            console.error('Erro ao gerar histórico de partidas:', error);
            await respond(interaction, '❌ Não foi possível consultar os resultados ou gerar a imagem do histórico.');
        }
    },
};
