    const config = db.prepare("SELECT * FROM ticket_config WHERE guild_id = ?").get(guild.id);
    await logAction(guild, config, `🔒 Ticket fermé`, `Fermé par: <@${user.id}>\nSalon: <#${interaction.channel.id}>`, user);
    return;
  }

  // ── Supprimer ──────────────────────────────────────────────────────────────
  if (customId === "delete_ticket") {
    const isOwner = user.id === OWNER_ID;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
    if (!isOwner && !isAdmin && !isStaff) {
      return interaction.reply({ content: "❌ Seul le staff peut supprimer ce ticket.", ephemeral: true });
    }
    const embed = new EmbedBuilder()
      .setDescription("🗑️ Ce ticket sera supprimé dans **3 secondes**...")
      .setColor(0xff0000);
    await interaction.reply({ embeds: [embed] });
    const config = db.prepare("SELECT * FROM ticket_config WHERE guild_id = ?").get(guild.id);
    await logAction(guild, config, `🗑️ Ticket supprimé`, `Supprimé par: <@${user.id}>\nSalon: **${interaction.channel.name}**`, user);
    db.prepare("DELETE FROM tickets WHERE channel_id = ?").run(interaction.channel.id);
    await sleep(3000);
    await interaction.channel.delete("Ticket supprimé").catch(() => {});
    return;
  }
}

async function handleSelectMenu(interaction) {}

// ── Suppression messages non-claimer ─────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const ticket = db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(message.channel.id);
  if (!ticket || !ticket.claimer_id) return;
  const isOwner = message.author.id === OWNER_ID;
  const isTicketOwner = message.author.id === ticket.owner_id;
  const isClaimer = message.author.id === ticket.claimer_id;
  const hasManage = message.member?.permissions.has(PermissionFlagsBits.ManageMessages);
  if (!isOwner && !isTicketOwner && !isClaimer && !hasManage) {
    await message.delete().catch(() => {});
  }
});

async function logAction(guild, config, title, description, user) {
  if (!config?.log_channel_id) return;
  const logChannel = guild.channels.cache.get(config.log_channel_id);
  if (!logChannel) return;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(COLOR)
    .setTimestamp()
    .setFooter({ text: user.tag, iconURL: user.displayAvatarURL() });
  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN manquant !");
  process.exit(1);
}
client.login(TOKEN);
