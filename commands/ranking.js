const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../database');
const { deferReply, respond } = require('../utils/interactionResponse');

module.exports = {
    name: 'ranking',
    description: 'Mostra os maiores paneleiros do servidor ou filtra por posição',
    data: new SlashCommandBuilder()
        .setName('ranking')
        .setDescription('Mostra o ranking geral ou filtra por posição')
        .addStringOption(option => option
            .setName('posicao')
            .setDescription('Filtra o ranking por posição')
            .setRequired(false)
            .addChoices(
                { name: 'PG', value: 'PG' },
                { name: 'SG', value: 'SG' },
                { name: 'SF', value: 'SF' },
                { name: 'PF', value: 'PF' },
                { name: 'C', value: 'C' }
            )),
    
    async execute(interaction, positionOverride = null) {
        const selectedPosition = positionOverride ||
            (interaction.isChatInputCommand() ? interaction.options.getString('posicao') : null);
        const positionFilter = selectedPosition?.toUpperCase();
        const validPositions = ['PG', 'SG', 'SF', 'PF', 'C'];

        await deferReply(interaction);

        try {
            const db = getDB(); 
            let allPlayers = [];
            const embed = new EmbedBuilder().setThumbnail(interaction.guild.iconURL({ dynamic: true }));
            let rankingText = '';
            let count = 0;

            if (positionFilter && validPositions.includes(positionFilter)) {
                embed.setColor('#3498db');
                embed.setTitle(`🏀 Top 10 - Posição: ${positionFilter}`);
                embed.setDescription(`Os melhores **${positionFilter}** do servidor:`);
                
                allPlayers = db.prepare(`SELECT * FROM players WHERE position = ? ORDER BY wins DESC LIMIT 10`).all(positionFilter);
                
                if (allPlayers.length > 0) {
                    const playersIds = allPlayers.map(p => p.discordId);
                    await interaction.guild.members.fetch({ user: playersIds }).catch(console.error);

                    for (const p of allPlayers) {
                        const member = interaction.guild.members.cache.get(p.discordId);
                        const userName = member ? member.displayName : 'Jogador Desconhecido';
                        
                        const totalGames = p.wins + p.losses;
                        const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : 0;
                        
                        rankingText += `**${count + 1}º** ${userName}\n`;
                        rankingText += `└ 🏆 ${p.wins} V | 💀 ${p.losses} D | 📊 ${winRate}% WR\n\n`;
                        count++;
                    }
                }

            } else {
                embed.setColor('#f39c12');
                embed.setTitle('🏀 Leaderboard Geral - REC do Panela Velha');
                embed.setDescription('Os maiores paneleiros do servidor:');
                
                allPlayers = db.prepare(`
                    SELECT discordId, SUM(wins) as wins, SUM(losses) as losses 
                    FROM players 
                    GROUP BY discordId 
                    ORDER BY wins DESC 
                    LIMIT 10
                `).all();

                if (allPlayers.length > 0) {
                    const playersIds = allPlayers.map(p => p.discordId);
                    await interaction.guild.members.fetch({ user: playersIds }).catch(console.error);

                    for (const p of allPlayers) {
                        const member = interaction.guild.members.cache.get(p.discordId);
                        const userName = member ? member.displayName : 'Jogador Desconhecido';
                        
                        const totalGames = p.wins + p.losses;
                        const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : 0;

                        rankingText += `**${count + 1}º** ${userName}\n`;
                        rankingText += `└ 🏆 ${p.wins} V | 💀 ${p.losses} D | 📊 ${winRate}% WR\n\n`;
                        count++;
                    }
                }
            }

            if (count === 0) {
                rankingText = positionFilter 
                    ? `Nenhum jogador possui partidas registradas jogando de **${positionFilter}**.` 
                    : `Ainda não há partidas registradas. Joguem o primeiro jogo!`;
            }

            embed.addFields({ name: 'Top Jogadores', value: rankingText });

            const rowFiltros = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_rank_geral').setLabel('GERAL').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_rank_pg').setLabel('PG').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_rank_sg').setLabel('SG').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_rank_sf').setLabel('SF').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_rank_pf').setLabel('PF').setStyle(ButtonStyle.Primary)
            );

            const rowFiltros2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_rank_c').setLabel('C').setStyle(ButtonStyle.Primary)
            );

            await interaction.editReply({ embeds: [embed], components: [rowFiltros, rowFiltros2] });

        } catch (error) {
            console.error('Erro ao gerar ranking:', error);
            await respond(interaction, '❌ Erro ao buscar o ranking no banco de dados.');
        }
    },
};