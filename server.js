const express = require("express");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const API_KEY = process.env.API_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;
const RESET_VERSION = process.env.RESET_VERSION || "";

const ADMINS = ["inanks000"];

const BLOCKED_USERS = [
  // "exampleuser"
];

const BANNERS = require("./banners");
const PERSONNEL = require("./personnel");
const createChronicleService = require("./services/chronicle");

const {
  renderPersonnelDirectory,
  renderPersonnelProfile
} = require("./views/personnel");

const {
  renderChroniclePage
} = require("./views/chronicle");

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
const chronicle = createChronicleService(db);

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

db.prepare(`
  CREATE TABLE IF NOT EXISTS pity (
    username TEXT NOT NULL,
    banner_id TEXT NOT NULL,
    purple_pity INTEGER DEFAULT 0,
    pink_pity INTEGER DEFAULT 0,
    PRIMARY KEY (username, banner_id)
  )
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS chronicle_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  username TEXT,
  item_id TEXT,
  banner_id TEXT,
  announced INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

const chronicleCount = db.prepare(`
  SELECT COUNT(*) AS count
  FROM chronicle_entries
`).get().count;

if (chronicleCount === 0) {

    chronicle.record({
        category: "history",
        title: "Chronicle Opened",
        message: "The Sanctuary Chronicle has been established.",
        announced: 1
    });

    chronicle.record({
        category: "threshold",
        title: "Late Beta",
        message: "The Sanctuary entered late beta with persistent records, banners, pity, and the Chronicle.",
        announced: 1
    });

}


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

db.prepare(`DELETE FROM pity`).run();

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

function isHypeActive() {
  return getSetting("hype_mode") === "on";
}

function isDeveloperModeActive(username) {
  return (
    username === "inanks000" &&
    getSetting("developer_mode_inanks000") === "on"
  );
}

function isGachaPaused() {
  return getSetting("gacha_paused") === "on";
}

function getPity(username, bannerId) {
  let row = db.prepare(`
    SELECT purple_pity, pink_pity
    FROM pity
    WHERE username = ? AND banner_id = ?
  `).get(username, bannerId);

  if (!row) {
    db.prepare(`
      INSERT INTO pity (username, banner_id, purple_pity, pink_pity)
      VALUES (?, ?, 0, 0)
    `).run(username, bannerId);

    row = { purple_pity: 0, pink_pity: 0 };
  }

  return row;
}

function savePity(username, bannerId, purplePity, pinkPity) {
  db.prepare(`
    INSERT INTO pity (username, banner_id, purple_pity, pink_pity)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(username, banner_id)
    DO UPDATE SET
      purple_pity = excluded.purple_pity,
      pink_pity = excluded.pink_pity
  `).run(username, bannerId, purplePity, pinkPity);
}

function bannerHasPurple(bannerId) {
  return BANNERS[bannerId].items.some(item => item.tier === 6);
}

function bannerHasPink(bannerId) {
  return BANNERS[bannerId].items.some(item => item.tier === 7);
}

function updatePityAfterPull(username, bannerId, item) {
  const pity = getPity(username, bannerId);

  let purplePity = bannerHasPurple(bannerId)
    ? pity.purple_pity + 1
    : 0;

  let pinkPity = bannerHasPink(bannerId)
    ? pity.pink_pity + 1
    : 0;

  if (item.tier === 6) {
    purplePity = 0;
  }

  if (item.tier === 7) {
    purplePity = 0;
    pinkPity = 0;
  }

  savePity(username, bannerId, purplePity, pinkPity);
}

function weightedChoice(weightedItems) {
  const totalWeight = weightedItems.reduce(
    (total, entry) => total + entry.weight,
    0
  );

  let roll = Math.random() * totalWeight;

  for (const entry of weightedItems) {
    roll -= entry.weight;

    if (roll < 0) {
      return entry.item;
    }
  }

  return weightedItems[0].item;
}

function pullItem(bannerId, options = {}) {
  const items = BANNERS[bannerId].items;
  const hypeActive = isHypeActive();

  if (options.forcePurple) {
    const purpleItems = items.filter(item => item.tier === 6);

    return purpleItems[
      Math.floor(Math.random() * purpleItems.length)
    ];
  }

  const pinkItems = items.filter(item => item.tier === 7);

  if (
    options.pinkBoost &&
    pinkItems.length > 0 &&
    Math.random() < 0.05
  ) {
    return pinkItems[
      Math.floor(Math.random() * pinkItems.length)
    ];
  }

  const eligibleItems = options.pinkBoost
    ? items.filter(item => item.tier !== 7)
    : items;

  const weightedItems = eligibleItems.map(item => {
    let multiplier = 1;

    if (hypeActive && item.tier === 6) {
      multiplier = 2;
    }

    if (hypeActive && item.tier === 7) {
      multiplier = 3;
    }

    return {
      item,
      weight: item.weight * multiplier
    };
  });

  return weightedChoice(weightedItems);
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

if (isGachaPaused() && !isAdmin(username)) {
  return res.send("Gacha is currently paused.");
}

  if (
    !isAdmin(username) &&
    onCooldown(username, "gacha", 120000)
  ) {
    return res.send(
      `@${username}, please wait before using !gacha again.`
    );
  }

const bannerId = getActiveBannerId();
const pity = getPity(username, bannerId);

const item = pullItem(bannerId, {
  forcePurple: bannerHasPurple(bannerId) && pity.purple_pity >= 149,
  pinkBoost: bannerHasPink(bannerId) && pity.pink_pity >= 300
});

if (!isDeveloperModeActive(username)) {
  savePull(username, item, "gacha");
  updatePityAfterPull(username, bannerId, item);
}

  res.send(
    `@${username} pulled ${item.display}`
  );
});

app.get("/10pull", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const username = getUsernameOrReply(req, res);

  if (!username) return;

if (isGachaPaused() && !isAdmin(username)) {
  return res.send("Gacha is currently paused.");
}

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
    const pity = getPity(username, bannerId);

const item = pullItem(bannerId, {
  forcePurple: bannerHasPurple(bannerId) && pity.purple_pity >= 149,
  pinkBoost: bannerHasPink(bannerId) && pity.pink_pity >= 300
});

results.push(item.compact);

if (!isDeveloperModeActive(username)) {
  savePull(username, item, "tenpull");
  updatePityAfterPull(username, bannerId, item);
}

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

app.get("/pity", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const username = getUsernameOrReply(req, res);
  if (!username) return;

  const bannerId = getActiveBannerId();
  const pity = getPity(username, bannerId);

  const purpleText = bannerHasPurple(bannerId)
    ? `💜 ${pity.purple_pity} / 150`
    : "💜 N/A";

  const pinkText = bannerHasPink(bannerId)
    ? `🩷 ${pity.pink_pity} / 300`
    : "🩷 N/A";

  res.send(
    `@${username} pity on ${BANNERS[bannerId].name}: ${purpleText}, ${pinkText}`
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

  const banner = (req.query.banner || "").trim().toLowerCase();

  if (!banner) {
    return res.send("Please specify a banner.");
  }

  if (!BANNERS[banner]) {
    return res.send("Unknown banner.");
  }

  setSetting("active_banner", banner);

  res.send(
    `@${admin} set the active banner to ${BANNERS[banner].name}.`
  );
});

app.get("/transfer", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const admin = getAdminOrReply(req, res);
  if (!admin) return;

if (admin !== "inanks000") {
  return res.send("Owner access required.");
}

  const oldUsername = cleanUsername(req.query.old);
  const newUsername = cleanUsername(req.query.new);

  if (!oldUsername || !newUsername) {
    return res.send("Usage: !transfer oldname newname");
  }

  if (oldUsername === newUsername) {
    return res.send("Old username and new username are the same.");
  }

  const transferData = db.transaction(() => {
    const oldPulls = db.prepare(`
      SELECT COUNT(*) AS count
      FROM pulls
      WHERE username = ?
    `).get(oldUsername).count;

    const oldPityRows = db.prepare(`
      SELECT COUNT(*) AS count
      FROM pity
      WHERE username = ?
    `).get(oldUsername).count;

    if (oldPulls === 0 && oldPityRows === 0) {
      return {
        transferred: false,
        reason: "not_found"
      };
    }

    db.prepare(`
      UPDATE pulls
      SET username = ?
      WHERE username = ?
    `).run(newUsername, oldUsername);

    db.prepare(`
      INSERT INTO pity (username, banner_id, purple_pity, pink_pity)
      SELECT ?, banner_id, purple_pity, pink_pity
      FROM pity
      WHERE username = ?
      ON CONFLICT(username, banner_id)
      DO UPDATE SET
        purple_pity = MAX(pity.purple_pity, excluded.purple_pity),
        pink_pity = MAX(pity.pink_pity, excluded.pink_pity)
    `).run(newUsername, oldUsername);

    db.prepare(`
      DELETE FROM pity
      WHERE username = ?
    `).run(oldUsername);

    return {
      transferred: true,
      pulls: oldPulls,
      pityRows: oldPityRows
    };
  });

  const result = transferData();

  if (!result.transferred) {
    return res.send(`No data found for ${oldUsername}.`);
  }

  res.send(
    `Transferred ${oldUsername} to ${newUsername}: ${result.pulls} pulls and ${result.pityRows} pity records.`
  );
});

app.get("/hypeon", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const admin = getAdminOrReply(req, res);
  if (!admin) return;

  setSetting("hype_mode", "on");

 res.send("Hype mode enabled.");
});

app.get("/hypeoff", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const admin = getAdminOrReply(req, res);
  if (!admin) return;

  setSetting("hype_mode", "off");

  res.send("Hype mode disabled.");
});

app.get("/developeron", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const admin = getAdminOrReply(req, res);
  if (!admin) return;

  setSetting("developer_mode_inanks000", "on");

  res.send("Developer mode enabled.");
});

app.get("/developeroff", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const admin = getAdminOrReply(req, res);
  if (!admin) return;

  setSetting("developer_mode_inanks000", "off");

  res.send("Developer mode disabled.");
});

app.get("/gachapause", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const admin = getAdminOrReply(req, res);
  if (!admin) return;

  setSetting("gacha_paused", "on");

  res.send("Gacha paused.");
});

app.get("/gacharesume", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const admin = getAdminOrReply(req, res);
  if (!admin) return;

  setSetting("gacha_paused", "off");

  res.send("Gacha resumed.");
});

app.get("/chronicle", (req, res) => {
  const entries = db.prepare(`
    SELECT *
    FROM chronicle_entries
    ORDER BY created_at DESC, id DESC
  `).all();

  res.send(renderChroniclePage("Latest Records", entries));
});

app.get("/chronicle/latest", (req, res) => {
  const entries = db.prepare(`
    SELECT *
    FROM chronicle_entries
    ORDER BY created_at DESC, id DESC
  `).all();

  res.send(renderChroniclePage("Latest Records", entries));
});

app.get("/chronicle/discoveries", (req, res) => {
  const entries = db.prepare(`
    SELECT *
    FROM chronicle_entries
    WHERE category = 'first_discovery'
    ORDER BY created_at DESC, id DESC
  `).all();

  res.send(renderChroniclePage("First Discoveries", entries));
});

app.get("/chronicle/collections", (req, res) => {
  const entries = db.prepare(`
    SELECT *
    FROM chronicle_entries
    WHERE category = 'collection'
    ORDER BY created_at DESC, id DESC
  `).all();

  res.send(renderChroniclePage("Collection Records", entries));
});

app.get("/chronicle/thresholds", (req, res) => {
  const entries = db.prepare(`
    SELECT *
    FROM chronicle_entries
    WHERE category = 'threshold'
    ORDER BY created_at DESC, id DESC
  `).all();

  res.send(renderChroniclePage("Threshold Records", entries));
});

app.get("/chronicle/personnel", (req, res) => {
  res.send(renderPersonnelDirectory(PERSONNEL));
});

app.get("/chronicle/personnel/:person", (req, res) => {
  const person = PERSONNEL[req.params.person];

  if (!person) {
    return res.status(404).send("Personnel file not found.");
  }

  res.send(renderPersonnelProfile(person));
});
app.get("/chronicle/history", (req, res) => {
  const entries = db.prepare(`
    SELECT *
    FROM chronicle_entries
    WHERE category = 'history'
    ORDER BY created_at DESC, id DESC
  `).all();

  res.send(renderChroniclePage("Sanctuary History", entries));
});

app.get("/chronicle.css", (req, res) => {
  res.sendFile(path.join(__dirname, "chronicle.css"));
});

app.get("/chronicle-command", (req, res) => {
  if (!requireApiKey(req, res)) return;

  res.send(
    "📜 Sanctuary Chronicle: https://gacha-api-production.up.railway.app/chronicle"
  );
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
