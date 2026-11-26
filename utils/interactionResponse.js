async function deferReply(interaction) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }
}

async function respond(interaction, payload) {
    if (interaction.deferred || interaction.replied) {
        return interaction.editReply(payload);
    }

    return interaction.reply(payload);
}

async function followUp(interaction, payload) {
    if (interaction.isChatInputCommand()) {
        return interaction.followUp(payload);
    }

    return interaction.channel.send(payload);
}

module.exports = { deferReply, respond, followUp };
