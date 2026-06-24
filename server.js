const express = require("express");
const Database = require("better-sqlite3");

const API_KEY = process.env.API_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;
const RESET_VERSION = process.env.RESET_VERSION || "";

const ADMINS = ["inanks000"];

const BLOCKED_USERS = [
  // "exampleuser"
];

const BANNERS = {
  standard: {
    name: "Standard",
    items: [
      { id: "standard_dog", symbol: "❤️", emoji: "🐶", name: "Dog", tier: 1, weight: 20, category: "animal" },
      { id: "standard_cat", symbol: "❤️", emoji: "🐱", name: "Cat", tier: 1, weight: 20, category: "animal" },

      { id: "standard_bunny", symbol: "🧡", emoji: "🐰", name: "Bunny", tier: 2, weight: 15, category: "animal" },
      { id: "standard_frog", symbol: "🧡", emoji: "🐸", name: "Frog", tier: 2, weight: 15, category: "animal" },

      { id: "standard_fox", symbol: "💛", emoji: "🦊", name: "Fox", tier: 3, weight: 10, category: "animal" },
      { id: "standard_wolf", symbol: "💛", emoji: "🐺", name: "Wolf", tier: 3, weight: 10, category: "animal" },

      { id: "standard_bear", symbol: "💚", emoji: "🐻", name: "Bear", tier: 4, weight: 3.5, category: "animal" },
      { id: "standard_lion", symbol: "💚", emoji: "🦁", name: "Lion", tier: 4, weight: 3.5, category: "animal" },

      { id: "standard_eagle", symbol: "💙", emoji: "🦅", name: "Eagle", tier: 5, weight: 1.25, category: "animal" },
      { id: "standard_raven", symbol: "💙", emoji: "🐦‍⬛", name: "Raven", tier: 5, weight: 1.25, category: "animal" },

      { id: "standard_dragon", symbol: "💜", emoji: "🐉", name: "Dragon", tier: 6, weight: 0.4, category: "animal" },
      { id: "standard_bride", symbol: "🩷", emoji: "👰🏻‍♀️", name: "Bride", tier: 7, weight: 0.1, category: "character" }
    ]
  },

  anniversary: {
    name: "Anniversary",
    items: [
      { id: "anniversary_poodle", symbol: "❤️", emoji: "🐩", name: "Poodle", tier: 1, weight: 20, category: "animal" },
      { id: "anniversary_cat", symbol: "❤️", emoji: "🐱", name: "Cat", tier: 1, weight: 20, category: "animal" },

      { id: "anniversary_bunny", symbol: "🧡", emoji: "🐰", name: "Bunny", tier: 2, weight: 15, category: "animal" },
      { id: "anniversary_frog", symbol: "🧡", emoji: "🐸", name: "Frog", tier: 2, weight: 15, category: "animal" },

      { id: "anniversary_fox", symbol: "💛", emoji: "🦊", name: "Fox", tier: 3, weight: 10, category: "animal" },
      { id: "anniversary_wolf", symbol: "💛", emoji: "🐺", name: "Wolf", tier: 3, weight: 10, category: "animal" },

      { id: "anniversary_lion", symbol: "💚", emoji: "🦁", name: "Lion", tier: 4, weight: 3.5, category: "animal" },
      { id: "anniversary_bear", symbol: "💚", emoji: "🐻", name: "Bear", tier: 4, weight: 3.5, category: "animal" },

      { id: "anniversary_whale", symbol: "💙", emoji: "🐳", name: "Whale", tier: 5, weight: 1.25, category: "animal" },
      { id: "anniversary_stallion", symbol: "💙", emoji: "🐎", name: "Stallion", tier: 5, weight: 1.25, category: "animal" },

      { id: "anniversary_mibot", symbol: "💜", emoji: "🤖", name: "Mi-Bot", tier: 6, weight: 0.4, category: "character" },
      { id: "anniversary_forehead_girl", symbol: "🩷", emoji: "🦸🏻‍♀️", name: "Forehead Girl", tier: 7, weight: 0.1, category: "character" }
    ]
  }
};

const ITEMS_BY_ID = {};
let catalogOrder = 0;

for (const [bannerId, banner] of Object.entries(BANNERS)) {
  for (const item of banner.items) {
    item.bannerId = bannerId;
    item.compact = `${item.symbol}${item.emoji}`;
    item.display = `${item.compact} ${item.name}`;
    item.order = catalogOrder++;

    ITEMS_BY_ID[item.id] = item;
  }
}

function cleanUsername(name) {
  if (!name) return null;

  return name.replace(/^@/, "").trim().toLowerCase();
}

function isBlocked(username) {
  return username &&
    BLOCKED_USERS.includes(username.toLowerCase());
}

function isAdmin(username) {
  return username &&
    ADMINS.includes(username.toLowerCase());
}

const cooldowns = {};

function onCooldown(username, command, cooldownMs) {
  const key = `${username.toLowerCase()}:${command}`;
  const now = Date.now();

  if (
    cooldowns[key] &&
    now - cooldowns[key] < cooldownMs
  ) {
    return true;
  }

  cooldowns[key] = now;
  return false;
}

const app = express();

const dbPath =
  process.env.RAILWAY_ENVIRONMENT
    ? "/data/gacha.db"
    : "./gacha.db";

const db = new Database(dbPath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS pulls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    item TEXT NOT NULL,
    pull_type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(
    `PRAGMA table_info(${tableName})`
  ).all();

  const exists = columns.some(
    column => column.name === columnName
  );

  if (!exists) {
    db.prepare(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
    ).run();
  }
}

ensureColumn("pulls", "item_id", "TEXT");
ensureColumn("pulls", "banner_id", "TEXT");
ensureColumn("pulls", "tier", "INTEGER");

db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`).run();

function getSetting(key) {
  const row = db.prepare(`
    SELECT value
    FROM settings
    WHERE key = ?
  `).get(key);

  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key)
    DO UPDATE SET value = excluded.value
  `).run(key, value);
}

if (!getSetting("active_banner")) {
  setSetting("active_banner", "standard");
}

if (
  RESET_VERSION &&
  getSetting("last_reset_version") !== RESET_VERSION
) {
  const resetBetaData = db.transaction(() => {
    db.prepare(`DELETE FROM pulls`).run();

    setSetting("active_banner", "standard");
    setSetting("last_reset_version", RESET_VERSION);
  });

  resetBetaData();

  console.log(
    `Pull history cleared for reset version: ${RESET_VERSION}`
  );
}

const insertPull = db.prepare(`
  INSERT INTO pulls (
    username,
    item,
    item_id,
    banner_id,
    tier,
    pull_type
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

function savePull(username, item, pullType) {
  insertPull.run(
    username,
    item.compact,
    item.id,
    item.bannerId,
    item.tier,
    pullType
  );
}

function getActiveBannerId() {
  const bannerId = getSetting("active_banner");

  if (!BANNERS[bannerId]) {
    setSetting("active_banner", "standard");
    return "standard";
  }

  return bannerId;
}

function pullItem(bannerId) {
  const items = BANNERS[bannerId].items;

  const totalWeight = items.reduce(
    (total, item) => total + item.weight,
    0
  );

  let roll = Math.random() * totalWeight;

  for (const item of items) {
    roll -= item.weight;

    if (roll < 0) {
      return item;
    }
  }

  return items[0];
}

function itemCompact(itemId, fallbackItem) {
  return ITEMS_BY_ID[itemId]?.compact ||
    fallbackItem ||
    itemId;
}

function requireApiKey(req, res) {
  if (!API_KEY || req.query.key !== API_KEY) {
    res.send("Unauthorized");
    return false;
  }

  return true;
}

function getUsernameOrReply(req, res) {
  const username = cleanUsername(req.query.user);

  if (isBlocked(username)) {
    res.send("Access denied.");
    return null;
  }

  if (!username) {
    res.send("Missing username.");
    return null;
  }

  return username;
}

function getAdminOrReply(req, res) {
  const username = cleanUsername(req.query.user);

  if (!username || !isAdmin(username)) {
    res.send("Admin access required.");
    return null;
  }

  if (!ADMIN_KEY || req.query.adminKey !== ADMIN_KEY) {
    res.send("Unauthorized admin request.");
    return null;
  }

  return username;
}

app.get("/", (req, res) => {
  res.send("Gacha API is running!");
});

app.get("/gacha", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const username = getUsernameOrReply(req, res);

  if (!username) return;

  if (
    !isAdmin(username) &&
    onCooldown(username, "gacha", 120000)
  ) {
    return res.send(
      `@${username}, please wait before using !gacha again.`
    );
  }

  const item = pullItem(getActiveBannerId());

  savePull(username, item, "gacha");

  res.send(
    `@${username} discovered ${item.display}`
  );
});

app.get("/10pull", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const username = getUsernameOrReply(req, res);

  if (!username) return;

  if (
    !isAdmin(username) &&
    onCooldown(username, "10pull", 86400000)
  ) {
    return res.send(
      `@${username}, you have already used today's !10pull.`
    );
  }

  const results = [];
  const bannerId = getActiveBannerId();

  for (let i = 0; i < 10; i++) {
    const item = pullItem(bannerId);

    results.push(item.compact);

    savePull(username, item, "tenpull");
  }

  res.send(
    `@${username} 10-pull: ${results.join(", ")}`
  );
});

app.get("/compendium", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const username = getUsernameOrReply(req, res);

  if (!username) return;

  const rows = db.prepare(`
    SELECT
      COALESCE(item_id, item) AS item_id,
      MIN(item) AS item,
      COUNT(*) AS count,
      MAX(COALESCE(tier, 0)) AS tier
    FROM pulls
    WHERE username = ?
    GROUP BY COALESCE(item_id, item)
  `).all(username);

  if (rows.length === 0) {
    return res.send(
      `@${username} has no discoveries yet.`
    );
  }

  rows.sort((a, b) => {
    const tierDifference = a.tier - b.tier;

    if (tierDifference !== 0) {
      return tierDifference;
    }

    const aOrder = ITEMS_BY_ID[a.item_id]?.order ?? 9999;
    const bOrder = ITEMS_BY_ID[b.item_id]?.order ?? 9999;

    return aOrder - bOrder;
  });

  const collection = rows
    .map(row =>
      `${itemCompact(row.item_id, row.item)}x${row.count}`
    )
    .join(", ");

  res.send(`@${username}: ${collection}`);
});

app.get("/showcase", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const username = getUsernameOrReply(req, res);

  if (!username) return;

  const rows = db.prepare(`
    SELECT
      COALESCE(item_id, item) AS item_id,
      MIN(item) AS item,
      COUNT(*) AS count,
      MAX(COALESCE(tier, 0)) AS tier
    FROM pulls
    WHERE username = ?
    GROUP BY COALESCE(item_id, item)
    HAVING MAX(COALESCE(tier, 0)) >= 5
  `).all(username);

  if (rows.length === 0) {
    return res.send(
      `@${username} has nothing to showcase yet.`
    );
  }

  rows.sort(
    (a, b) =>
      b.tier - a.tier ||
      b.count - a.count
  );

  const showcase = rows
    .map(row =>
      `${itemCompact(row.item_id, row.item)}x${row.count}`
    )
    .join(", ");

  res.send(`@${username} showcase: ${showcase}`);
});

app.get("/pulls", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const username = getUsernameOrReply(req, res);

  if (!username) return;

  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM pulls
    WHERE username = ?
  `).get(username);

  res.send(
    `@${username} has made ${row.count} pulls.`
  );
});

app.get("/banner", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const bannerId = getActiveBannerId();

  res.send(
    `Active banner: ${BANNERS[bannerId].name}`
  );
});

app.get("/setbanner", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const admin = getAdminOrReply(req, res);

  if (!admin) return;

  const bannerId = (
    req.query.banner || ""
  ).trim().toLowerCase();

  if (!BANNERS[bannerId]) {
    return res.send(
      `Unknown banner. Available: ${Object.keys(BANNERS).join(", ")}`
    );
  }

  setSetting("active_banner", bannerId);

  res.send(
    `@${admin} set the active banner to ${BANNERS[bannerId].name}.`
  );
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
