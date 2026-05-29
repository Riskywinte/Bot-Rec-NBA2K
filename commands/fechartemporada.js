const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getDB } = require('../database');

module.exports = {
    name: 'fechartemporada',
    description: 'Encerra a temporada atual, salva os dados no Hall da Fama e reseta os status (Apenas Admins)',
    
    async execute(message, args) {
        // Trava de segurança: Apenas administradores podem rodar esse comando
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send('⚠️ **Acesso Negado:** Apenas administradores podem encerrar a temporada.');
        }

        const db = getDB();

        try {
            // Pega qual é a temporada que está rolando agora
            const seasonRow = db.prepare("SELECT value FROM server_config WHERE key = 'current_season'").get();
            const currentSeason = seasonRow ? seasonRow.value : 1;

            // Busca os 3 melhores jogadores da temporada atual para montar o pódio
            const topPlayers = db.prepare(`SELECT * FROM players ORDER BY wins DESC, mvps DESC LIMIT 3`).all();

            if (topPlayers.length === 0) {
                return message.channel.send('⚠️ Nenhuma partida foi registrada nesta temporada ainda! Não há o que encerrar.');
            }

            // Inicia uma transação segura no banco de dados
            const fecharTemporadaTx = db.transaction(() => {
                // 1. Salva os status atuais de todos os jogadores na tabela de arquivo (past_seasons)
                const insertHistory = db.prepare(`
                    INSERT INTO past_seasons (discordId, season, wins, losses, mvps)
                    VALUES (@discordId, @season, @wins, @losses, @mvps)
                    ON CONFLICT(discordId, season) DO REPLACE
                `);
                
                const allPlayers = db.prepare('SELECT * FROM players').all();
                for (const p of allPlayers) {
                    insertHistory.run({
                        discordId: p.discordId,
                        season: currentSeason,
                        wins: p.wins,
                        losses: p.losses,
                        mvps: p.mvps
                    });
                }

                // 2. Reseta a tabela atual (zera vitórias, derrotas e MVPs de todo mundo)
                db.prepare('UPDATE players SET wins = 0, losses = 0, mvps = 0').run();

                // 3. Avança o contador de temporada para a próxima
                db.prepare("UPDATE server_config SET value = value + 1 WHERE key = 'current_season'").run();
            });

            // Executa tudo de uma vez
            fecharTemporadaTx();

            // Monta a mensagem bonita de encerramento
            const embed = new EmbedBuilder()
                .setTitle(`🏆 Fim da Temporada ${currentSeason}!`)
                .setColor('#f1c40f')
                .setDescription(`A **Temporada ${currentSeason}** chegou ao fim! Todos os status foram zerados e arquivados. A **Temporada ${currentSeason + 1}** acaba de começar!`)
                .setThumbnail(message.guild.iconURL({ dynamic: true }));

            // Preenche o Pódio (Top 3)
            let podiumText = '';
            const medalhas = ['🥇', '🥈', '🥉'];
            
            for (let i = 0; i < topPlayers.length; i++) {
                const p = topPlayers[i];
                // Busca o nome do jogador no Discord
                const user = await message.client.users.fetch(p.discordId).catch(() => null);
                const userName = user ? user.displayName : 'Jogador Desconhecido';
                
                podiumText += `${medalhas[i]} **${userName}**\n└ 🏆 ${p.wins} V | 💀 ${p.losses} D | 🌟 ${p.mvps} MVPs\n\n`;
            }

            embed.addFields({ name: '🌟 Pódio da Temporada (Hall da Fama)', value: podiumText });

            // Manda a mensagem marcando todo mundo para gerar o "hype"
            await message.channel.send({ content: '@everyone', embeds: [embed] });

        } catch (error) {
            console.error('Erro ao fechar temporada:', error);
            message.channel.send('❌ Ocorreu um erro no banco de dados ao tentar fechar a temporada.');
        }
    },
};