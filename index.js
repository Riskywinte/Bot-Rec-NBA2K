require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { getDB } = require('./database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();
client.activeMatches = new Map();


const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && typeof command.execute === 'function') {
        client.commands.set(command.data.name, command);
    }
}

client.once(Events.ClientReady, () => {
    getDB();
    console.log(`✅ Bot online como ${client.user.tag} com comandos slash.`);
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                return interaction.reply({ content: 'Comando não encontrado.', ephemeral: true });
            }

            await command.execute(interaction);
            return;
        }

        if (!interaction.isButton()) return;

        if (interaction.customId === 'btn_sorteio') {
            await interaction.deferUpdate();
            await client.commands.get('sorteio').execute(interaction);
        } else if (interaction.customId === 'btn_cancelar') {
            await interaction.deferUpdate();
            await client.commands.get('cancelar').execute(interaction);
        } else if (interaction.customId === 'btn_ranking') {
            await interaction.deferUpdate();
            await client.commands.get('ranking').execute(interaction);
        } else if (interaction.customId.startsWith('btn_rank_')) {
            await interaction.deferUpdate();

            const position = interaction.customId.split('_')[2];
            await client.commands.get('ranking').execute(
                interaction,
                position === 'geral' ? null : position.toUpperCase()
            );
        } else if (interaction.customId === 'btn_vitoria_time1' || interaction.customId === 'btn_vitoria_time2') {
            const match = client.activeMatches.get(interaction.guild.id);
            if (!match) {
                return interaction.reply({ content: '⚠️ Não há nenhuma partida ativa no momento para registrar vitória.', ephemeral: true });
            }

            const isPlayer = match.team1Data.some(p => p.id === interaction.user.id) ||
                match.team2Data.some(p => p.id === interaction.user.id);

            if (!isPlayer) {
                return interaction.reply({ content: '⛔ **Acesso Negado:** Apenas os jogadores que estão na partida podem registrar o resultado!', ephemeral: true });
            }

            await interaction.deferUpdate();
            await interaction.editReply({ components: [] });

            const winner = interaction.customId === 'btn_vitoria_time1' ? 'time1' : 'time2';
            await client.commands.get('vitoria').execute(interaction, winner);
        }
    } catch (error) {
        console.error('Erro ao processar interação:', error);
        if (interaction.isRepliable()) {
            const response = { content: '❌ Ocorreu um erro ao processar esta interação.', ephemeral: true };
            if (interaction.isChatInputCommand() && interaction.deferred) {
                await interaction.editReply(response);
            } else if (interaction.replied || interaction.deferred) {
                await interaction.followUp(response);
            } else {
                await interaction.reply(response);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);