require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// helper
async function makeRole(guild, data) {
  return guild.roles.create(data);
}

async function makeCategory(guild, name, perms) {
  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: perms
  });
}

async function makeChannel(guild, name, type, parent, perms) {
  return guild.channels.create({
    name,
    type,
    parent,
    permissionOverwrites: perms
  });
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "servermake") return;

  const guild = interaction.guild;
  const everyone = guild.roles.everyone.id;

  await interaction.reply({ content: "Building server...", ephemeral: true });

  // =========================
  // ROLES
  // =========================

  const roles = {};

  const roleData = [
    ["👑 Founder", [PermissionsBitField.Flags.Administrator]],
    ["🖤 Co-Owner", [PermissionsBitField.Flags.Administrator]],
    ["🛡️ Head Admin", [
      PermissionsBitField.Flags.ManageGuild,
      PermissionsBitField.Flags.ManageRoles,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.BanMembers,
      PermissionsBitField.Flags.KickMembers
    ]],
    ["💻 Developer", []],
    ["🎨 Artist", []],
    ["🔍 Moderator", [
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.BanMembers,
      PermissionsBitField.Flags.ManageMessages
    ]],
    ["🎮 Tester", []],
    ["📢 Community", []],
    ["👤 Member", []],
    ["✅ Verified", []],
  ];

  for (const [name, perms] of roleData) {
    roles[name] = await makeRole(guild, {
      name,
      permissions: perms,
      mentionable: true
    });
  }

  // =========================
  // PERMISSIONS SHORTCUTS
  // =========================

  const staffOnly = [
    { id: everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: roles["👑 Founder"].id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: roles["🖤 Co-Owner"].id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: roles["🛡️ Head Admin"].id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: roles["🔍 Moderator"].id, allow: [PermissionsBitField.Flags.ViewChannel] },
  ];

  const devOnly = [
    { id: everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: roles["👑 Founder"].id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: roles["🖤 Co-Owner"].id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: roles["💻 Developer"].id, allow: [PermissionsBitField.Flags.ViewChannel] },
  ];

  const publicPerms = [
    { id: everyone, allow: [PermissionsBitField.Flags.ViewChannel] }
  ];

  // =========================
  // CATEGORIES
  // =========================

  const info = await makeCategory(guild, "📌 INFORMATION", publicPerms);
  const community = await makeCategory(guild, "💬 COMMUNITY", publicPerms);
  const dev = await makeCategory(guild, "💻 DEVELOPMENT", devOnly);
  const art = await makeCategory(guild, "🎨 ART", publicPerms);
  const staff = await makeCategory(guild, "🔒 STAFF", staffOnly);

  // =========================
  // CHANNELS
  // =========================

  await makeChannel(guild, "welcome", ChannelType.GuildText, info.id, publicPerms);
  await makeChannel(guild, "rules", ChannelType.GuildText, info.id, publicPerms);
  await makeChannel(guild, "announcements", ChannelType.GuildText, info.id, publicPerms);

  await makeChannel(guild, "general", ChannelType.GuildText, community.id, publicPerms);
  await makeChannel(guild, "ideas", ChannelType.GuildText, community.id, publicPerms);
  await makeChannel(guild, "bug-reports", ChannelType.GuildText, community.id, publicPerms);

  await makeChannel(guild, "dev-chat", ChannelType.GuildText, dev.id, devOnly);
  await makeChannel(guild, "builds", ChannelType.GuildText, dev.id, devOnly);
  await makeChannel(guild, "playtests", ChannelType.GuildText, dev.id, devOnly);

  await makeChannel(guild, "concept-art", ChannelType.GuildText, art.id, publicPerms);
  await makeChannel(guild, "screenshots", ChannelType.GuildText, art.id, publicPerms);

  await makeChannel(guild, "staff-chat", ChannelType.GuildText, staff.id, staffOnly);
  await makeChannel(guild, "logs", ChannelType.GuildText, staff.id, staffOnly);

  await interaction.editReply("Server structure complete.");
});

client.login(process.env.BOT_TOKEN);