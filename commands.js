const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

function ms(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  const m = s.match(/^(\d+)(s|m|h|d|w)$/);
  if (!m) return null;

  const n = Number(m[1]);
  const unit = m[2];
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return n * map[unit];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fmtTime(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

function pushLog(guild, db, embed) {
  const chId = db.config?.logChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId);
  if (ch) ch.send({ embeds: [embed] }).catch(() => {});
}

function addOffense(db, userId, type, reason, extra = {}) {
  db.offenses[userId] ||= [];
  db.offenses[userId].push({
    type,
    reason: reason || "No reason provided",
    at: Date.now(),
    ...extra
  });
}

function addWarning(db, userId, reason) {
  db.warnings[userId] ||= [];
  db.warnings[userId].push({
    reason: reason || "No reason provided",
    at: Date.now()
  });
}

function getMentionName(client, guild, userId) {
  return guild.members.cache.get(userId)?.displayName || client.users.cache.get(userId)?.username || userId;
}

const commands = [
  new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set a user as AFK")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Optional reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send an announcement in a channel")
    .addChannelOption(o => o.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
    .addStringOption(o => o.setName("message").setDescription("Announcement text").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

  new SlashCommandBuilder()
    .setName("birthday")
    .setDescription("Send a birthday message to a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("message").setDescription("Birthday message").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription("Broadcast a message in the current channel")
    .addStringOption(o => o.setName("message").setDescription("Broadcast text").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  new SlashCommandBuilder()
    .setName("channelinfo")
    .setDescription("Show info about a channel")
    .addChannelOption(o => o.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice, ChannelType.GuildForum).setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  new SlashCommandBuilder()
    .setName("chatrestrict")
    .setDescription("Timeout users when they send a specific word")
    .addStringOption(o => o.setName("word").setDescription("Word to restrict").setRequired(true))
    .addStringOption(o => o.setName("duration").setDescription("Timeout like 10m, 1h").setRequired(true))
    .addStringOption(o => o.setName("extension").setDescription("Extra timeout each repeat like 5m").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  new SlashCommandBuilder()
    .setName("clearoffenses")
    .setDescription("Clear all offenses for a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear warnings for a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin")
    .addStringOption(o => o.setName("choice").setDescription("heads or tails").setRequired(false).addChoices(
      { name: "heads", value: "heads" },
      { name: "tails", value: "tails" }
    )),

  new SlashCommandBuilder()
    .setName("dm")
    .setDescription("DM a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("message").setDescription("Message").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  new SlashCommandBuilder()
    .setName("emptychat")
    .setDescription("Delete a number of recent messages in this channel")
    .addIntegerOption(o => o.setName("number").setDescription("How many messages").setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create a giveaway")
    .addStringOption(o => o.setName("prize").setDescription("Prize").setRequired(true))
    .addIntegerOption(o => o.setName("winners").setDescription("Number of winners").setRequired(true).setMinValue(1).setMaxValue(20))
    .addStringOption(o => o.setName("deadline").setDescription("Duration like 10m, 1h, 1d").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("duration").setDescription("Duration like 10m, 1h").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  new SlashCommandBuilder()
    .setName("nickname")
    .setDescription("Change a member nickname")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("nickname").setDescription("New nickname").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageNicknames),

  new SlashCommandBuilder()
    .setName("offenses")
    .setDescription("Show offenses for a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll")
    .addStringOption(o => o.setName("question").setDescription("Question").setRequired(true))
    .addStringOption(o => o.setName("option1").setDescription("Option 1").setRequired(true))
    .addStringOption(o => o.setName("option2").setDescription("Option 2").setRequired(true))
    .addStringOption(o => o.setName("option3").setDescription("Option 3"))
    .addStringOption(o => o.setName("option4").setDescription("Option 4"))
    .addStringOption(o => o.setName("option5").setDescription("Option 5"))
    .addStringOption(o => o.setName("option6").setDescription("Option 6"))
    .addStringOption(o => o.setName("option7").setDescription("Option 7"))
    .addStringOption(o => o.setName("option8").setDescription("Option 8"))
    .addStringOption(o => o.setName("option9").setDescription("Option 9"))
    .addStringOption(o => o.setName("option10").setDescription("Option 10"))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  new SlashCommandBuilder()
    .setName("setautorole")
    .setDescription("Set the auto role for new members")
    .addRoleOption(o => o.setName("role").setDescription("Role").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  new SlashCommandBuilder()
    .setName("setgoodbye")
    .setDescription("Set goodbye DM message")
    .addStringOption(o => o.setName("message").setDescription("Message with {user} placeholder").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  new SlashCommandBuilder()
    .setName("setlogchannel")
    .setDescription("Set the log channel")
    .addChannelOption(o => o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Set welcome DM message")
    .addStringOption(o => o.setName("message").setDescription("Message with {user} placeholder").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  new SlashCommandBuilder()
    .setName("staffapply")
    .setDescription("Show the staff application panel"),

  new SlashCommandBuilder()
    .setName("staffapplyset")
    .setDescription("Set the staff application message and link")
    .addStringOption(o => o.setName("message").setDescription("Application text").setRequired(true))
    .addStringOption(o => o.setName("link").setDescription("Apply link").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  new SlashCommandBuilder()
    .setName("ticketlog")
    .setDescription("Set the ticket log channel")
    .addChannelOption(o => o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  new SlashCommandBuilder()
    .setName("ticketspawn")
    .setDescription("Spawn a ticket panel")
    .addStringOption(o => o.setName("message").setDescription("Panel message").setRequired(true))
    .addStringOption(o => o.setName("option1").setDescription("Option 1").setRequired(true))
    .addStringOption(o => o.setName("option2").setDescription("Option 2"))
    .addStringOption(o => o.setName("option3").setDescription("Option 3"))
    .addStringOption(o => o.setName("option4").setDescription("Option 4"))
    .addStringOption(o => o.setName("option5").setDescription("Option 5"))
    .addStringOption(o => o.setName("option6").setDescription("Option 6"))
    .addStringOption(o => o.setName("option7").setDescription("Option 7"))
    .addStringOption(o => o.setName("option8").setDescription("Option 8"))
    .addStringOption(o => o.setName("option9").setDescription("Option 9"))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user by Discord ID")
    .addStringOption(o => o.setName("id").setDescription("Discord ID").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

  new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Remove a timeout from a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show user info")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(false)),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("message").setDescription("Warning message").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  new SlashCommandBuilder()
    .setName("servermake")
    .setDescription("Build the full studio server")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
];

async function run(interaction, db, client) {
  const name = interaction.commandName;
  const guild = interaction.guild;
  const g = db.guilds[guild.id] || (db.guilds[guild.id] = {
    config: {
      autoroleId: null,
      welcome: null,
      goodbye: null,
      logChannelId: null,
      staffApplyMessage: null,
      staffApplyLink: null,
      ticketLogChannelId: null
    },
    afk: {},
    warnings: {},
    offenses: {},
    chatFilters: [],
    giveaways: [],
    tickets: {}
  });

  const reply = (content, ephemeral = true) => interaction.reply({ content, ephemeral }).catch(() => {});
  const edit = (content) => interaction.editReply({ content }).catch(() => {});

  if (name === "afk") {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "AFK";
    g.afk[user.id] = { reason, setBy: interaction.user.id, at: Date.now() };
    return reply(`✅ ${user.tag} is now AFK: ${reason}`);
  }

  if (name === "announce") {
    const channel = interaction.options.getChannel("channel", true);
    const message = interaction.options.getString("message", true);
    await channel.send({ content: message });
    return reply(`✅ Sent to ${channel}`);
  }

  if (name === "ban") {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    await guild.members.ban(user.id, { reason }).catch(e => { throw e; });
    addOffense(g, user.id, "ban", reason, { moderatorId: interaction.user.id });
    pushLog(guild, g, new EmbedBuilder().setTitle("Ban").setDescription(`${user.tag}\n${reason}`).setColor(0xff0000));
    return reply(`✅ Banned ${user.tag}`);
  }

  if (name === "birthday") {
    const user = interaction.options.getUser("user", true);
    const message = interaction.options.getString("message", true);
    await user.send(`🎉 Happy Birthday, ${user.username}!\n${message}`).catch(() => {});
    return reply(`✅ Birthday message sent to ${user.tag}`);
  }

  if (name === "broadcast") {
    const message = interaction.options.getString("message", true);
    await interaction.channel.send(`📢 **Broadcast**\n${message}`);
    return reply(`✅ Broadcast sent here`);
  }

  if (name === "channelinfo") {
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const embed = new EmbedBuilder()
      .setTitle(`Channel Info: #${channel.name}`)
      .addFields(
        { name: "ID", value: channel.id, inline: true },
        { name: "Type", value: String(channel.type), inline: true },
        { name: "Parent", value: channel.parent?.name || "None", inline: true },
        { name: "Created", value: channel.createdAt ? fmtTime(channel.createdAt) : "Unknown", inline: true }
      )
      .setColor(0x5865f2);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (name === "chatrestrict") {
    const word = interaction.options.getString("word", true).toLowerCase();
    const duration = ms(interaction.options.getString("duration", true));
    const extension = ms(interaction.options.getString("extension", true));
    if (!duration || !extension) return reply("❌ Use durations like 10m, 1h, 1d");
    g.chatFilters.push({ word, duration, extension, count: 0, addedBy: interaction.user.id, at: Date.now() });
    return reply(`✅ Restricted "${word}" with base timeout ${duration}ms and repeat extension ${extension}ms`);
  }

  if (name === "clearoffenses") {
    const user = interaction.options.getUser("user", true);
    delete g.offenses[user.id];
    return reply(`✅ Cleared offenses for ${user.tag}`);
  }

  if (name === "clearwarnings") {
    const user = interaction.options.getUser("user", true);
    delete g.warnings[user.id];
    return reply(`✅ Cleared warnings for ${user.tag}`);
  }

  if (name === "coinflip") {
    const choice = interaction.options.getString("choice");
    const result = Math.random() < 0.5 ? "heads" : "tails";
    return interaction.reply({ content: `🪙 Result: **${result}**${choice ? ` | You picked **${choice}**` : ""}`, ephemeral: true });
  }

  if (name === "dm") {
    const user = interaction.options.getUser("user", true);
    const message = interaction.options.getString("message", true);
    await user.send(message);
    return reply(`✅ DM sent to ${user.tag}`);
  }

  if (name === "emptychat") {
    const number = interaction.options.getInteger("number", true);
    const msgs = await interaction.channel.messages.fetch({ limit: Math.min(number, 100) });
    await interaction.channel.bulkDelete(msgs, true);
    return reply(`✅ Deleted ${msgs.size} messages`);
  }

  if (name === "giveaway") {
    const prize = interaction.options.getString("prize", true);
    const winnersCount = interaction.options.getInteger("winners", true);
    const deadline = ms(interaction.options.getString("deadline", true));
    if (!deadline) return reply("❌ Use deadline like 10m, 1h, 1d");

    const embed = new EmbedBuilder()
      .setTitle("🎉 Giveaway")
      .setDescription(`Prize: **${prize}**\nWinners: **${winnersCount}**\nEnds: ${fmtTime(new Date(Date.now() + deadline))}\nReact with 🎉`)
      .setColor(0xffd700);

    const msg = await interaction.channel.send({ embeds: [embed] });
    await msg.react("🎉");

    setTimeout(async () => {
      const fresh = await interaction.channel.messages.fetch(msg.id).catch(() => null);
      if (!fresh) return;
      const reaction = fresh.reactions.cache.get("🎉");
      if (!reaction) return;

      const users = await reaction.users.fetch();
      const pool = [...users.values()].filter(u => !u.bot);
      if (!pool.length) {
        await interaction.channel.send(`🎉 Giveaway ended for **${prize}**. No valid entries.`);
        return;
      }

      const winners = [];
      while (winners.length < Math.min(winnersCount, pool.length)) {
        const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        winners.push(pick);
      }

      await interaction.channel.send(`🎉 Giveaway ended for **${prize}**. Winner(s): ${winners.map(u => `<@${u.id}>`).join(", ")}`);
    }, deadline);

    return reply(`✅ Giveaway posted`);
  }

  if (name === "kick") {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const member = await guild.members.fetch(user.id);
    await member.kick(reason);
    addOffense(g, user.id, "kick", reason, { moderatorId: interaction.user.id });
    return reply(`✅ Kicked ${user.tag}`);
  }

  if (name === "mute") {
    const user = interaction.options.getUser("user", true);
    const duration = ms(interaction.options.getString("duration", true));
    const reason = interaction.options.getString("reason") || "No reason provided";
    if (!duration) return reply("❌ Use duration like 10m, 1h, 1d");
    const member = await guild.members.fetch(user.id);
    await member.timeout(duration, reason);
    addOffense(g, user.id, "mute", reason, { moderatorId: interaction.user.id, duration });
    return reply(`✅ Timed out ${user.tag}`);
  }

  if (name === "nickname") {
    const user = interaction.options.getUser("user", true);
    const nickname = interaction.options.getString("nickname", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const member = await guild.members.fetch(user.id);
    await member.setNickname(nickname, reason);
    return reply(`✅ Nickname updated for ${user.tag}`);
  }

  if (name === "offenses") {
    const user = interaction.options.getUser("user", true);
    const list = g.offenses[user.id] || [];
    const warns = g.warnings[user.id] || [];
    const text = [
      `**Offenses for ${user.tag}**`,
      list.length ? list.map((o, i) => `${i + 1}. [${o.type}] ${o.reason}`).join("\n") : "No offenses.",
      "",
      `**Warnings**`,
      warns.length ? warns.map((w, i) => `${i + 1}. ${w.reason}`).join("\n") : "No warnings."
    ].join("\n");
    return interaction.reply({ content: text, ephemeral: true });
  }

  if (name === "poll") {
    const question = interaction.options.getString("question", true);
    const options = [];
    for (let i = 1; i <= 10; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }
    const letters = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
    const body = options.map((o, i) => `${letters[i]} ${o}`).join("\n");
    const msg = await interaction.channel.send(`📊 **${question}**\n${body}`);
    for (let i = 0; i < options.length; i++) await msg.react(letters[i]);
    return reply(`✅ Poll sent`);
  }

  if (name === "setautorole") {
    const role = interaction.options.getRole("role", true);
    g.config.autoroleId = role.id;
    return reply(`✅ Auto role set to ${role.name}`);
  }

  if (name === "setgoodbye") {
    g.config.goodbye = interaction.options.getString("message", true);
    return reply(`✅ Goodbye DM saved`);
  }

  if (name === "setlogchannel") {
    const channel = interaction.options.getChannel("channel", true);
    g.config.logChannelId = channel.id;
    return reply(`✅ Log channel set to ${channel}`);
  }

  if (name === "setwelcome") {
    g.config.welcome = interaction.options.getString("message", true);
    return reply(`✅ Welcome DM saved`);
  }

  if (name === "staffapply") {
    const msg = g.config.staffApplyMessage || "No staff application is set yet.";
    const link = g.config.staffApplyLink || "No link set.";
    return interaction.reply({ content: `**Staff Application**\n${msg}\n${link}`, ephemeral: true });
  }

  if (name === "staffapplyset") {
    g.config.staffApplyMessage = interaction.options.getString("message", true);
    g.config.staffApplyLink = interaction.options.getString("link", true);
    return reply(`✅ Staff application saved`);
  }

  if (name === "ticketlog") {
    const channel = interaction.options.getChannel("channel", true);
    g.config.ticketLogChannelId = channel.id;
    return reply(`✅ Ticket log channel set to ${channel}`);
  }

  if (name === "ticketspawn") {
    const message = interaction.options.getString("message", true);
    const opts = [];
    for (let i = 1; i <= 9; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) opts.push(opt);
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`ticketspawn:${interaction.user.id}`)
      .setPlaceholder("Choose a ticket type")
      .addOptions(opts.map((o, i) => ({
        label: o.slice(0, 100),
        value: `ticket_${i}_${o}`.slice(0, 100)
      })));

    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.channel.send({ content: message, components: [row] });
    return reply(`✅ Ticket panel sent`);
  }

  if (name === "unban") {
    const id = interaction.options.getString("id", true);
    await guild.bans.remove(id).catch(() => { throw new Error("Ban not found or no permission"); });
    return reply(`✅ Unbanned ${id}`);
  }

  if (name === "unmute") {
    const user = interaction.options.getUser("user", true);
    const member = await guild.members.fetch(user.id);
    await member.timeout(null);
    return reply(`✅ Timeout removed for ${user.tag}`);
  }

  if (name === "userinfo") {
    const user = interaction.options.getUser("user") || interaction.user;
    const member = await guild.members.fetch(user.id).catch(() => null);
    const embed = new EmbedBuilder()
      .setTitle(`User Info: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "Account Created", value: fmtTime(user.createdAt), inline: true },
        { name: "Joined Server", value: member?.joinedAt ? fmtTime(member.joinedAt) : "Not in server", inline: true },
        { name: "ID", value: user.id, inline: true }
      )
      .setColor(0x2b2d31);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (name === "warn") {
    const user = interaction.options.getUser("user", true);
    const message = interaction.options.getString("message", true);
    addWarning(g, user.id, message);
    addOffense(g, user.id, "warn", message, { moderatorId: interaction.user.id });
    await user.send(`⚠️ You received a warning in **${guild.name}**\nReason: ${message}`).catch(() => {});
    return reply(`✅ Warned ${user.tag}`);
  }

  if (name === "servermake") {
    const everyoneId = guild.roles.everyone.id;

    const ensureRole = async (name, perms = [], color = null, hoist = true, mentionable = true) => {
      const existing = guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      return guild.roles.create({ name, permissions: perms, color: color || undefined, hoist, mentionable });
    };

    const roles = {};
    roles.founder = await ensureRole("👑 Founder", [PermissionsBitField.Flags.Administrator], 0x111111);
    roles.coowner = await ensureRole("🖤 Co-Owner", [PermissionsBitField.Flags.Administrator], 0x1f1f1f);
    roles.headadmin = await ensureRole("🛡️ Head Admin", [
      PermissionsBitField.Flags.ManageGuild,
      PermissionsBitField.Flags.ManageRoles,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.ViewAuditLog,
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.BanMembers,
      PermissionsBitField.Flags.ModerateMembers
    ], 0x2b2d31);
    roles.pm = await ensureRole("📋 Project Manager", [PermissionsBitField.Flags.ManageGuild, PermissionsBitField.Flags.ManageMessages], 0x0ea5e9);
    roles.studio = await ensureRole("🧠 Studio Director", [PermissionsBitField.Flags.ManageGuild], 0x6366f1);

    roles.leaddev = await ensureRole("💻 Lead Developer", [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ReadMessageHistory], 0x2f80ed);
    roles.gameplay = await ensureRole("⚙️ Gameplay Developer", [], 0x3b82f6);
    roles.network = await ensureRole("🌐 Network Developer", [], 0x6366f1);
    roles.tools = await ensureRole("🧰 Tools/Backend Developer", [], 0x8b5cf6);
    roles.qa = await ensureRole("🧪 QA Tester", [], 0xa3e635);
    roles.bughunter = await ensureRole("🐞 Bug Hunter", [], 0x84cc16);

    roles.artdir = await ensureRole("🎨 Art Director", [], 0xf59e0b);
    roles.concept = await ensureRole("🖼️ Concept Artist", [], 0xfb7185);
    roles.artist3d = await ensureRole("🧱 3D Artist", [], 0xec4899);
    roles.anim = await ensureRole("🎞️ Animator", [], 0xf97316);
    roles.vfx = await ensureRole("✨ VFX Artist", [], 0x22c55e);
    roles.audio = await ensureRole("🎧 Sound Designer", [], 0x14b8a6);
    roles.composer = await ensureRole("🎼 Composer", [], 0x06b6d4);
    roles.lore = await ensureRole("📝 Lore Writer", [], 0xe879f9);
    roles.level = await ensureRole("🧩 Level Designer", [], 0x4ade80);
    roles.ui = await ensureRole("🖥️ UI/UX Designer", [], 0x64748b);

    roles.community = await ensureRole("📢 Community Manager", [PermissionsBitField.Flags.ManageMessages], 0xfb7185);
    roles.social = await ensureRole("📱 Social Media Manager", [], 0xf43f5e);
    roles.editor = await ensureRole("🎬 Video Editor", [], 0x94a3b8);
    roles.event = await ensureRole("🎟️ Event Host", [], 0x10b981);
    roles.support = await ensureRole("💬 Support Team", [PermissionsBitField.Flags.ManageMessages], 0x22c55e);
    roles.mod = await ensureRole("🔍 Moderator", [PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers, PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ViewAuditLog], 0xef4444);

    roles.verified = await ensureRole("✅ Verified", [], 0x4b5563, false, false);
    roles.member = await ensureRole("👤 Member", [], 0x374151, false, false);
    roles.contributor = await ensureRole("🌟 Contributor", [], 0xeab308);
    roles.playtester = await ensureRole("🚧 Playtester", [], 0xf97316);

    const publicView = [{ id: everyoneId, allow: [PermissionsBitField.Flags.ViewChannel] }];
    const noView = [{ id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] }];

    const infoCat = await guild.channels.create({ name: "📌 INFORMATION", type: ChannelType.GuildCategory, permissionOverwrites: publicView });
    const commCat = await guild.channels.create({ name: "💬 COMMUNITY", type: ChannelType.GuildCategory, permissionOverwrites: publicView });
    const devCat = await guild.channels.create({ name: "💻 DEVELOPMENT", type: ChannelType.GuildCategory, permissionOverwrites: noView });
    const artCat = await guild.channels.create({ name: "🎨 ART & AUDIO", type: ChannelType.GuildCategory, permissionOverwrites: publicView });
    const staffCat = await guild.channels.create({ name: "🔒 STAFF ZONE", type: ChannelType.GuildCategory, permissionOverwrites: noView });
    const voiceCat = await guild.channels.create({ name: "🔊 VOICE", type: ChannelType.GuildCategory, permissionOverwrites: publicView });

    const allowTalk = [{ id: everyoneId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }];
    const publicText = [{ id: everyoneId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.ReadMessageHistory] }];
    const devOnly = [
      { id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: roles.founder.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.coowner.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.headadmin.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.pm.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.studio.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.leaddev.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.gameplay.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.network.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.tools.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.qa.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
    ];
    const staffOnly = [
      { id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: roles.founder.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.coowner.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.headadmin.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.pm.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.studio.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.mod.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.community.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: roles.support.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
    ];

    const mk = async (name, type, parent, perms, topic = null) => guild.channels.create({ name, type, parent, permissionOverwrites: perms, topic: topic || undefined });

    await mk("welcome", ChannelType.GuildText, infoCat.id, allowTalk, "Welcome channel.");
    await mk("rules", ChannelType.GuildText, infoCat.id, allowTalk, "Rules.");
    await mk("announcements", ChannelType.GuildText, infoCat.id, allowTalk, "Announcements.");
    await mk("roadmap", ChannelType.GuildText, infoCat.id, allowTalk, "Roadmap.");
    await mk("faq", ChannelType.GuildText, infoCat.id, allowTalk, "FAQ.");

    await mk("general", ChannelType.GuildText, commCat.id, publicText, "General chat.");
    await mk("ideas", ChannelType.GuildText, commCat.id, publicText, "Ideas.");
    await mk("polls", ChannelType.GuildText, commCat.id, publicText, "Polls.");
    await mk("bug-reports", ChannelType.GuildText, commCat.id, publicText, "Bug reports.");
    await mk("clips", ChannelType.GuildText, commCat.id, publicText, "Clips.");

    await mk("dev-chat", ChannelType.GuildText, devCat.id, devOnly, "Dev discussion.");
    await mk("builds", ChannelType.GuildText, devCat.id, devOnly, "Builds.");
    await mk("playtests", ChannelType.GuildText, devCat.id, devOnly, "Playtests.");
    await mk("tasks", ChannelType.GuildText, devCat.id, devOnly, "Task board.");
    await mk("logs", ChannelType.GuildText, devCat.id, staffOnly, "Logs.");

    await mk("concept-art", ChannelType.GuildText, artCat.id, publicText, "Concept art.");
    await mk("screenshots", ChannelType.GuildText, artCat.id, publicText, "Screenshots.");
    await mk("audio", ChannelType.GuildText, artCat.id, publicText, "Audio.");
    await mk("trailers", ChannelType.GuildText, artCat.id, publicText, "Trailers.");

    await mk("staff-chat", ChannelType.GuildText, staffCat.id, staffOnly, "Private staff.");
    await mk("staff-announcements", ChannelType.GuildText, staffCat.id, staffOnly, "Staff announcements.");
    await mk("hiring", ChannelType.GuildText, staffCat.id, staffOnly, "Hiring.");
    await mk("server-logs", ChannelType.GuildText, staffCat.id, staffOnly, "Server logs.");

    await mk("general-vc", ChannelType.GuildVoice, voiceCat.id, [{ id: everyoneId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] }], null);
    await mk("dev-vc", ChannelType.GuildVoice, voiceCat.id, devOnly, null);
    await mk("playtest-vc", ChannelType.GuildVoice, voiceCat.id, [{ id: everyoneId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] }], null);
    await mk("staff-vc", ChannelType.GuildVoice, voiceCat.id, staffOnly, null);

    return reply("✅ Server builder finished");
  }
}

module.exports = {
  commands,
  run,
  ms,
  escapeRegex,
  pushLog,
  addOffense,
  addWarning,
  getMentionName
};