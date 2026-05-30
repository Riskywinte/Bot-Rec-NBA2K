const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDB } = require('../database');

module.exports = {
    name: 'ranking',
    description: 'Mostra os maiores paneleiros do servidor ou filtra por posição',
    
    async execute(message, args) {
        const positionFilter = args[0]?.toUpperCase();
        const validPositions = ['PG', 'SG', 'SF', 'PF', 'C'];

        let loadingMessage;
        if (message.channel && !message.isInteractionMock) {
            loadingMessage = await message.channel.send('📊 Buscando dados na panela...');
        }

        try {
            const db = getDB(); 
            let allPlayers = [];
            const embed = new EmbedBuilder().setThumbnail(message.guild.iconURL({ dynamic: true }));
            let rankingText = '';
            let count = 0;

            // 1. LÓGICA DE FILTRO POR POSIÇÃO
            if (positionFilter && validPositions.includes(positionFilter)) {
                embed.setColor('#3498db');
                embed.setTitle(`🏀 Top 10 - Posição: ${positionFilter}`);
                embed.setDescription(`Os melhores **${positionFilter}** do servidor:`);
                
                // Busca no banco APENAS as vitórias que o jogador teve NESSA posição
                allPlayers = db.prepare(`SELECT * FROM players WHERE position = ? ORDER BY wins DESC, mvps DESC LIMIT 10`).all(positionFilter);
                
                if (allPlayers.length > 0) {
                    const playersIds = allPlayers.map(p => p.discordId);
                    await message.guild.members.fetch({ user: playersIds }).catch(console.error);

                    for (const p of allPlayers) {
                        const member = message.guild.members.cache.get(p.discordId);
                        const userName = member ? member.displayName : 'Jogador Desconhecido';
                        
                        const totalGames = p.wins + p.losses;
                        const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : 0;
                        
                        rankingText += `**${count + 1}º** ${userName}\n`;
                        rankingText += `└ 🏆 ${p.wins} V | 💀 ${p.losses} D | 📊 ${winRate}% WR | 🌟 ${p.mvps} MVPs\n\n`;
                        count++;
                    }
                }

            } else {
                // 2. LÓGICA DO RANKING GERAL (Soma as posições de cada jogador)
                embed.setColor('#f39c12');
                embed.setTitle('🏀 Leaderboard Geral - REC do Panela Velha');
                embed.setDescription('Os maiores paneleiros do servidor:');
                
                // Agrupa as linhas do mesmo jogador e soma vitórias, derrotas e mvps
                allPlayers = db.prepare(`
                    SELECT discordId, SUM(wins) as wins, SUM(losses) as losses, SUM(mvps) as mvps 
                    FROM players 
                    GROUP BY discordId 
                    ORDER BY wins DESC, mvps DESC 
                    LIMIT 10
                `).all();

                if (allPlayers.length > 0) {
                    const playersIds = allPlayers.map(p => p.discordId);
                    await message.guild.members.fetch({ user: playersIds }).catch(console.error);

                    for (const p of allPlayers) {
                        const member = message.guild.members.cache.get(p.discordId);
                        const userName = member ? member.displayName : 'Jogador Desconhecido';
                        
                        const totalGames = p.wins + p.losses;
                        const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : 0;

                        rankingText += `**${count + 1}º** ${userName}\n`;
                        rankingText += `└ 🏆 ${p.wins} V | 💀 ${p.losses} D | 📊 ${winRate}% WR | 🌟 ${p.mvps} MVPs\n\n`;
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

            if (loadingMessage) await loadingMessage.delete().catch(() => null);
            
            if (message.isInteractionMock) {
                await message.replyObj({ embeds: [embed], components: [rowFiltros, rowFiltros2] });
            } else {
                await message.channel.send({ embeds: [embed], components: [rowFiltros, rowFiltros2] });
            }

        } catch (error) {
            console.error('Erro ao gerar ranking:', error);
            if (loadingMessage) await loadingMessage.edit('❌ Erro ao buscar o ranking no banco de dados.').catch(() => null);
        }
    },
};