require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

async function deployCommands() {
    const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
    if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
        throw new Error('Defina DISCORD_TOKEN, DISCORD_CLIENT_ID e DISCORD_GUILD_ID no arquivo .env.');
    }

    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    const commands = commandFiles.map(file => {
        const command = require(path.join(commandsPath, file));
        if (!command.data) {
            throw new Error(`O comando em ${file} não exporta uma definição slash.`);
        }
        return command.data.toJSON();
    });

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
        { body: commands }
    );

    console.log(`${commands.length} comandos slash registrados no servidor.`);
}

deployCommands().catch(error => {
    console.error('Erro ao registrar comandos slash:', error);
    process.exitCode = 1;
});
