const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketspawn')
        .setDescription('Create a ticket panel')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to show above the ticket menu')
                .setRequired(true))
        .addStringOption(option => option.setName('option1').setDescription('Ticket option 1').setRequired(false))
        .addStringOption(option => option.setName('option2').setDescription('Ticket option 2').setRequired(false))
        .addStringOption(option => option.setName('option3').setDescription('Ticket option 3').setRequired(false))
        .addStringOption(option => option.setName('option4').setDescription('Ticket option 4').setRequired(false))
        .addStringOption(option => option.setName('option5').setDescription('Ticket option 5').setRequired(false))
        .addStringOption(option => option.setName('option6').setDescription('Ticket option 6').setRequired(false))
        .addStringOption(option => option.setName('option7').setDescription('Ticket option 7').setRequired(false))
        .addStringOption(option => option.setName('option8').setDescription('Ticket option 8').setRequired(false))
        .addStringOption(option => option.setName('option9').setDescription('Ticket option 9').setRequired(false)),

    async execute(interaction) {
        const messageText = interaction.options.getString('message');
        const options = [];

        for (let i = 1; i <= 9; i++) {
            const option = interaction.options.getString(`option${i}`);
            if (option) {
                options.push({
                    label: option,
                    value: `ticket_${i}`,
                    description: `Create a ${option.toLowerCase()} ticket`
                });
            }
        }

        if (options.length === 0) {
            return interaction.reply({ content: 'You must provide at least one option!', ephemeral: true });
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('Select a ticket type...')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🎟️ Support Tickets')
            .setDescription(messageText)
            .setTimestamp();

        await interaction.reply({ content: 'Ticket panel created!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }
};