require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Events } = require("discord.js");
const { loadDB, saveDB, guild } = require("./storage");
const { run, escapeRegex, ms } = require("./commands");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
});

const db = loadDB();

function applyTemplate(text, user, guildName) {
  return String(text || "")
    .replaceAll("{user}", `<@${user.id}>`)
    .replaceAll("{username}", user.username)
    .replaceAll("{guild}", guildName);
}

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  const g = guild(db, member.guild.id);

  if (g.config.autoroleId) {
    const role = member.guild.roles.cache.get(g.config.autoroleId);
    if (role) await member.roles.add(role).catch(() => {});
  }

  if (g.config.welcome) {
    await member.send(applyTemplate(g.config.welcome, member.user, member.guild.name)).catch(() => {});
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  const g = guild(db, member.guild.id);
  if (g.config.goodbye) {
    await member.user.send(applyTemplate(g.config.goodbye, member.user, member.guild.name)).catch(() => {});
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;
  const g = guild(db, message.guild.id);

  if (g.afk[message.author.id]) {
    delete g.afk[message.author.id];
    await message.reply(`👋 Welcome back ${message.author.tag}. AFK removed.`).catch(() => {});
    saveDB();
  }

  const mentions = [...message.mentions.users.values()];
  for (const u of mentions) {
    const afk = g.afk[u.id];
    if (afk) {
      await message.reply(`💤 ${u.tag} is AFK: ${afk.reason}`).catch(() => {});
      break;
    }
  }

  for (const rule of g.chatFilters) {
    const re = new RegExp(`\\b${escapeRegex(rule.word)}\\b`, "i");
    if (re.test(message.content)) {
      const member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (!member) break;
      const currentCount = (rule.count || 0) + 1;
      rule.count = currentCount;

      const timeoutMs = rule.duration + Math.max(0, currentCount - 1) * rule.extension;
      await member.timeout(timeoutMs, `Chat restrict matched: ${rule.word}`).catch(() => {});
      message.channel.send(`⚠️ ${message.author} used a restricted word. Timeout applied.`).catch(() => {});
      saveDB();
      break;
    }
  }

  saveDB();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await run(interaction, db, client);
      saveDB();
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (!interaction.customId.startsWith("ticketspawn:")) return;

      const g = guild(interaction.guild.id);
      const choice = interaction.values[0];
      const label = choice.split("_").slice(2).join("_") || "ticket";
      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        type: 0,
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone.id, deny: ["ViewChannel"] },
          { id: interaction.user.id, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] },
          { id: interaction.guild.members.me.id, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "ManageChannels"] }
        ]
      });

      g.tickets[channel.id] = {
        ownerId: interaction.user.id,
        type: label,
        openedAt: Date.now()
      };

      const ticketLog = g.config.ticketLogChannelId ? interaction.guild.channels.cache.get(g.config.ticketLogChannelId) : null;
      if (ticketLog) ticketLog.send(`🎫 Ticket opened by <@${interaction.user.id}>: **${label}**`).catch(() => {});

      await channel.send(`🎫 <@${interaction.user.id}> opened a ticket for **${label}**`).catch(() => {});
      await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true }).catch(() => {});
      saveDB();
    }
  } catch (err) {
    console.error(err);
    if (interaction.isRepliable()) {
      const payload = { content: "❌ Something broke.", ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(process.env.BOT_TOKEN);