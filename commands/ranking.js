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
            const allPlayers = db.prepare(`SELECT * FROM players ORDER BY wins DESC, mvps DESC`).all();

            if (allPlayers.length === 0) {
                if (loadingMessage) return loadingMessage.edit('Ainda não há partidas registradas. Joguem o primeiro jogo!');
                return message.reply('Ainda não há partidas registradas. Joguem o primeiro jogo!');
            }

            const embed = new EmbedBuilder()
                .setColor(positionFilter ? '#3498db' : '#f39c12')
                .setThumbnail(message.guild.iconURL({ dynamic: true }));

            let rankingText = '';
            let count = 0;

            // ⚡ A GRANDE CORREÇÃO ⚡
            // Em vez de baixar o servidor inteiro (Opcode 8) ou usar loop, pedimos ao Discord 
            // para trazer apenas os membros que estão na nossa tabela do banco de dados, tudo de uma vez.
            const playersIds = allPlayers.map(p => p.discordId);
            await message.guild.members.fetch({ user: playersIds }).catch(console.error);

            if (positionFilter && validPositions.includes(positionFilter)) {
                embed.setTitle(`🏀 Top 10 - Posição: ${positionFilter}`);
                embed.setDescription(`Os melhores **${positionFilter}** do servidor:`);
                
                for (const p of allPlayers) {
                    if (count >= 10) break;
                    
                    // Como já fizemos o fetch ali em cima, isso agora puxa direto da memória (super rápido)
                    const member = message.guild.members.cache.get(p.discordId);
                    
                    if (member) {
                        const hasRole = member.roles.cache.some(role => role.name.toUpperCase() === positionFilter);
                        if (hasRole) {
                            const totalGames = p.wins + p.losses;
                            const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : 0;
                            
                            rankingText += `**${count + 1}º** ${member.displayName}\n`;
                            rankingText += `└ 🏆 ${p.wins} V | 💀 ${p.losses} D | 📊 ${winRate}% WR | 🌟 ${p.mvps} MVPs\n\n`;
                            count++;
                        }
                    }
                }
            } else {
                // Comportamento original (Ranking Geral) otimizado
                embed.setTitle('🏀 Leaderboard Geral - REC do Panela Velha');
                embed.setDescription('Os maiores paneleiros do servidor:');
                
                for (let i = 0; i < Math.min(allPlayers.length, 10); i++) {
                    const p = allPlayers[i];
                    
                    // Pega da memória em vez de fazer client.users.fetch dentro do loop
                    const member = message.guild.members.cache.get(p.discordId);
                    const userName = member ? member.displayName : 'Jogador Desconhecido';
                    
                    const totalGames = p.wins + p.losses;
                    const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : 0;

                    rankingText += `**${i + 1}º** ${userName}\n`;
                    rankingText += `└ 🏆 ${p.wins} V | 💀 ${p.losses} D | 📊 ${winRate}% WR | 🌟 ${p.mvps} MVPs\n\n`;
                    count++;
                }
            }

            if (count === 0) {
                rankingText = `Nenhum jogador com partidas registradas possui o cargo de **${positionFilter}**.`;
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

            // Adicionado um .catch() para evitar erro caso a mensagem já tenha sido apagada
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