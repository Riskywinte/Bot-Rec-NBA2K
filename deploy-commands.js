require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`⏳ A iniciar a atualização de ${commands.length} comados de barra (/).`);

        // Regista os comandos globalmente para todos os servidores onde o bot está
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID), // Adicione o CLIENT_ID (ID do Bot) no seu .env
            { body: commands },
        );

        console.log('✅ Comandos de barra (/) registados com sucesso!');
    } catch (error) {
        console.error(error);
    }
})();