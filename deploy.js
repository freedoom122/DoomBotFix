const { REST, Routes, SlashCommandBuilder, PermissionsBitField } = require("discord.js");
require("dotenv").config();

const command = new SlashCommandBuilder()
  .setName("servermake")
  .setDescription("Builds the full studio server structure")
  .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator);

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: [command.toJSON()] }
    );

    console.log("Command deployed.");
  } catch (err) {
    console.error(err);
  }
})();