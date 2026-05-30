require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { getDB } = require('./database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
client.activeMatches = new Map();

// Carregar comandos...
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.name) {
        client.commands.set(command.name, command);
    }
}

client.once(Events.ClientReady, () => {
    getDB(); 
    console.log(`✅ Bot online como ${client.user.tag} operando com prefixo (!)`);
});

const PREFIX = '!';

client.on('messageCreate', async message => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('Houve um erro ao executar este comando!');
    }
});

// --- GERENCIADOR DE BOTÕES ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // Ignora os botões de MVP que já funcionam no vitoria.js
    if (interaction.customId.startsWith('mvp_') || interaction.customId.startsWith('ended_')) return;

    // Objeto mockMessage corrigido (sem a duplicata)
    const mockMessage = {
        client: interaction.client,
        guild: interaction.guild,
        channel: interaction.channel, // O channel nativo já possui a função .send()
        member: interaction.member,
        author: interaction.user,
        isInteractionMock: true,
        replyObj: (data) => interaction.editReply(data),
        mentions: { users: new Map() },
        reply: (content) => interaction.reply({ content, ephemeral: true })
    };

    try {
        // --- BOTÕES DO PAINEL DE CONTROLE ---
        if (interaction.customId === 'btn_sorteio') {
            await interaction.deferUpdate();
            const cmd = client.commands.get('sorteio');
            await cmd.execute(mockMessage, []);
        } 
        else if (interaction.customId === 'btn_cancelar') {
            await interaction.deferUpdate();
            const cmd = client.commands.get('cancelar');
            await cmd.execute(mockMessage, []);
        }
        else if (interaction.customId === 'btn_ranking') {
            await interaction.deferUpdate();
            const cmd = client.commands.get('ranking');
            await cmd.execute(mockMessage, []);
        }
        
        // --- BOTÕES DE FILTRO DO RANKING ---
        else if (interaction.customId.startsWith('btn_rank_')) {
            await interaction.deferUpdate(); 
            
            const position = interaction.customId.split('_')[2]; 
            const args = position === 'geral' ? [] : [position.toUpperCase()];
            
            const cmd = client.commands.get('ranking');
            await cmd.execute(mockMessage, args);
        }

        // --- BOTÕES DE VITÓRIA DA PARTIDA ---
        else if (interaction.customId === 'btn_vitoria_time1' || interaction.customId === 'btn_vitoria_time2') {
            
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
            const cmd = client.commands.get('vitoria');
            
            await cmd.execute(mockMessage, [winner]); 
        }

    } catch (error) {
        console.error('Erro na interação do botão:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Ocorreu um erro ao processar o botão.', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);