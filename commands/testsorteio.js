const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { generateRosterImage } = require('../utils/canvasGen');
const { shuffleArray, assignPositions, chooseBalancedTeams } = require('./sorteio');
const { deferReply } = require('../utils/interactionResponse');

module.exports = {
    name: 'testsorteio',
    description: 'Gera uma imagem de sorteio usando jogadores fictícios',
    data: new SlashCommandBuilder()
        .setName('testsorteio')
        .setDescription('Gera uma imagem de sorteio com jogadores fictícios'),

    async execute(interaction) {
        await deferReply(interaction);
        const positionSets = [
            ['PG', 'SG'],
            ['PG', 'SF'],
            ['SG', 'SF'],
            ['SF', 'PF'],
            ['PF', 'C'],
            ['C', 'PG'],
            ['PG', 'SG'],
            ['SG', 'PF'],
            ['SF', 'C'],
            ['PF', 'C']
        ];
        const players = positionSets.map((positions, index) => ({
            id: `test-${index + 1}`,
            name: `Teste ${String(index + 1).padStart(2, '0')} (${positions.join('/')})`,
            positions
        }));

        shuffleArray(players);

        const balancedTeams = chooseBalancedTeams(players, 5);
        if (!balancedTeams) {
            throw new Error('Não foi possível dividir os jogadores fictícios em dois times válidos.');
        }

        const team1 = assignPositions(balancedTeams.team1, balancedTeams.missingPosition);
        const team2 = assignPositions(balancedTeams.team2, balancedTeams.missingPosition);
        if (!team1 || !team2) {
            throw new Error('Não foi possível atribuir posições aos times fictícios.');
        }

        const imageBuffer = await generateRosterImage(team1, team2);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'rec-matchup-teste.png' });

        await interaction.editReply({
            content: '🧪 **Imagem de teste do sorteio**\nJogadores fictícios; ninguém será movido de canal.',
            files: [attachment]
        });
    }
};
