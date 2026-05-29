const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getDB } = require('../database');

module.exports = {
    name: 'vitoria',
    description: 'Registra o resultado (Uso: !vitoria time1 ou !vitoria time2)',

    async execute(message, args) {
        const winnerTeam = args[0]?.toLowerCase();

        if (winnerTeam !== 'time1' && winnerTeam !== 'time2') {
            return message.channel.send('⚠️ Uso correto: `!vitoria time1` ou `!vitoria time2`');
        }

        const match = message.client.activeMatches.get(message.guild.id);
        if (!match) {
            return message.channel.send('⚠️ Nenhuma partida ativa encontrada no servidor. Usem o `!sorteio` primeiro.');
        }

        const winnersData = winnerTeam === 'time1' ? match.team1Data : match.team2Data;
        const losersData = winnerTeam === 'time1' ? match.team2Data : match.team1Data;

        try {
            // Removido o "await" porque o better-sqlite3 é síncrono
            const db = getDB();

            for (const p of winnersData) {
                // Utilizado .prepare().run()
                db.prepare(
                    `INSERT INTO players (discordId, wins, losses, mvps) VALUES (?, 1, 0, 0)
                     ON CONFLICT(discordId) DO UPDATE SET wins = wins + 1`
                ).run(p.id);
            }

            for (const p of losersData) {
                // Utilizado .prepare().run()
                db.prepare(
                    `INSERT INTO players (discordId, wins, losses, mvps) VALUES (?, 0, 1, 0)
                     ON CONFLICT(discordId) DO UPDATE SET losses = losses + 1`
                ).run(p.id);
            }

            message.client.activeMatches.delete(message.guild.id);

            const row = new ActionRowBuilder();
            winnersData.forEach(p => {
                row.addComponents(
                    new ButtonBuilder().setCustomId(`mvp_${p.id}`).setLabel(p.name).setStyle(ButtonStyle.Primary)
                );
            });

            const mvpMsg = await message.channel.send({
                content: `🏆 O **${winnerTeam.toUpperCase()}** levou a vitória e o resultado foi salvo! \n\n🌟 **VOTAÇÃO DE MVP:** Quem carregou a panela? Vocês têm 60 segundos para votar:`,
                components: [row]
            });

            const filter = i => i.customId.startsWith('mvp_');
            const collector = mvpMsg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

            const votes = {};
            const votedUsers = new Set();

            collector.on('collect', async i => {
                if (votedUsers.has(i.user.id)) {
                    return i.reply({ content: 'Você já votou nesta partida!', ephemeral: true });
                }
                votedUsers.add(i.user.id);
                const votedId = i.customId.split('_')[1];
                votes[votedId] = (votes[votedId] || 0) + 1;
                await i.reply({ content: '✅ Voto registrado!', ephemeral: true });
            });

            collector.on('end', async () => {
                if (Object.keys(votes).length === 0) {
                    return message.channel.send('Ninguém votou no MVP dessa vez. Vacilaram! 🤷‍♂️');
                }

                let mvpId = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
                let mvpName = winnersData.find(p => p.id === mvpId).name;

                // Utilizado .prepare().run()
                // ... código anterior onde o MVP ganha +1 no banco de dados ...
                db.prepare(
                    `INSERT INTO players (discordId, wins, losses, mvps) VALUES (?, 0, 0, 1)
                    ON CONFLICT(discordId) DO UPDATE SET mvps = mvps + 1`
                ).run(mvpId);

                // 🆕 ADICIONE ESTA LINHA AQUI: Registra a partida no histórico
                db.prepare(`INSERT INTO match_history (winner_team, mvp_id) VALUES (?, ?)`).run(winnerTeam, mvpId);

                await message.channel.send(`🌟 **O MVP da partida foi:** **${mvpName}** com ${votes[mvpId]} voto(s)! Mandem um \`!gg\` para voltar ao lobby.`);
                // ... resto do código ...

                await message.channel.send(`🌟 **O MVP da partida foi:** **${mvpName}** com ${votes[mvpId]} voto(s)! Mandem um \`!gg\` para voltar ao lobby.`);

                const disabledRow = new ActionRowBuilder();
                winnersData.forEach(p => {
                    disabledRow.addComponents(
                        new ButtonBuilder().setCustomId(`ended_${p.id}`).setLabel(p.name).setStyle(ButtonStyle.Secondary).setDisabled(true)
                    );
                });
                await mvpMsg.edit({ components: [disabledRow] });
            });

        } catch (error) {
            console.error(error);
            await message.channel.send('❌ Houve um erro ao processar o resultado da partida.');
        }
    },
};