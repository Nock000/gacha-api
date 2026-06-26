function createCommunicationsService({ db, chronicle, itemsById }) {
  function discoveryChannelForTier(tier) {
    if (tier === 1) return "common_discovery";
    if (tier >= 2 && tier <= 4) return "uncommon_discovery";
    if (tier === 5) return "rare_discovery";
    return "legendary_discovery";
  }

  function labelForChannel(channel) {
    const labels = {
      common_discovery: "📜 Common Discovery",
      uncommon_discovery: "📜 Uncommon Discovery",
      rare_discovery: "📜 Rare Discovery",
      legendary_discovery: "📜 Legendary Discovery",

      wizard: "🧙🏼‍♂️💬",
      scientist: "🧑🏻‍🔬💬",
      lily: "🤵🏾‍♀️💬",
      astronaut: "👩🏼‍🚀💬",
      expedition_master: "🕵🏽‍♂️💬",
      mitan: "👸🏻💬"
    };

    return labels[channel] || channel;
  }

  function normalizeChannel(input) {
    const aliases = {
      common: "common_discovery",
      uncommon: "uncommon_discovery",
      rare: "rare_discovery",
      legendary: "legendary_discovery"
    };

    return aliases[input] || input;
  }

  function queueDiscovery(username, item, bannerId) {
    const channel = discoveryChannelForTier(item.tier);

    return chronicle.record({
      category: "first_discovery",
      channel,
      title: `First Discovery: ${item.name}`,
      message: item.display,
      username,
      itemId: item.id,
      bannerId,
      announced: 0
    });
  }

  function getPendingSummary() {
    const rows = db.prepare(`
      SELECT channel, COUNT(*) AS count
      FROM chronicle_entries
      WHERE announced = 0
      GROUP BY channel
      ORDER BY MIN(created_at) ASC, MIN(id) ASC
    `).all();

    if (rows.length === 0) {
      return "No pending Chronicle announcements.";
    }

    return rows
      .map(row => `${labelForChannel(row.channel)} ×${row.count}`)
      .join(", ");
  }

  function formatAnnouncement(entry) {
    if (entry.category === "first_discovery") {
      return `📜 ${entry.username} discovered ${entry.message}.`;
    }

    return `📜 ${entry.title}: ${entry.message}`;
  }

  function announceNext(channelInput) {
    const channel = normalizeChannel(channelInput || "");

    const entry = db.prepare(`
      SELECT *
      FROM chronicle_entries
      WHERE announced = 0
        AND channel = ?
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `).get(channel);

    if (!entry) {
      return null;
    }

    db.prepare(`
      UPDATE chronicle_entries
      SET announced = 1
      WHERE id = ?
    `).run(entry.id);

    return formatAnnouncement(entry);
  }

  function clearChannel(channelInput) {
    const channel = normalizeChannel(channelInput);

    const clearable = [
      "common_discovery",
      "uncommon_discovery"
    ];

    if (!clearable.includes(channel)) {
      return null;
    }

    const result = db.prepare(`
      UPDATE chronicle_entries
      SET announced = 1
      WHERE announced = 0
        AND channel = ?
    `).run(channel);

    return result.changes;
  }

  return {
    discoveryChannelForTier,
    labelForChannel,
    queueDiscovery,
    getPendingSummary,
    announceNext,
    clearChannel
  };
}

module.exports = createCommunicationsService;