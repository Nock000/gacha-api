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

      { id: "standard_lion", symbol: "💚", emoji: "🦁", name: "Lion", tier: 4, weight: 3.5, category: "animal" },
      { id: "standard_bear", symbol: "💚", emoji: "🐻", name: "Bear", tier: 4, weight: 3.5, category: "animal" },

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

      { id: "anniversary_fox", symbol: "💛", emoji: "🦊", name: "Fox", tier: 3, weight: 9, category: "animal" },
      { id: "anniversary_wolf", symbol: "💛", emoji: "🐺", name: "Wolf", tier: 3, weight: 9, category: "animal" },

      { id: "anniversary_lion", symbol: "💚", emoji: "🦁", name: "Lion", tier: 4, weight: 3.5, category: "animal" },
      { id: "anniversary_bear", symbol: "💚", emoji: "🐻", name: "Bear", tier: 4, weight: 3.5, category: "animal" },

      { id: "anniversary_whale", symbol: "💙", emoji: "🐳", name: "Whale", tier: 5, weight: 1.5, category: "animal" },
      { id: "anniversary_stallion", symbol: "💙", emoji: "🐎", name: "Stallion", tier: 5, weight: 1.5, category: "animal" },

      { id: "anniversary_mibot", symbol: "💜", emoji: "🤖", name: "Mi-Bot", tier: 6, weight: 1.5, category: "character" },
      { id: "anniversary_forehead_girl", symbol: "🩷", emoji: "🦸🏻‍♀️", name: "Forehead Girl", tier: 7, weight: 0.5, category: "character" }
    ]
  },

  halloween: {
    name: "Halloween",
    items: [
      { id: "halloween_jackolantern", symbol: "❤️", emoji: "🎃", name: "Jack-o-Lantern", tier: 1, weight: 40, category: "special" },

      { id: "halloween_black_cat", symbol: "🧡", emoji: "🐈‍⬛", name: "Black Cat", tier: 2, weight: 15, category: "animal" },
      { id: "halloween_bat", symbol: "🧡", emoji: "🦇", name: "Bat", tier: 2, weight: 15, category: "animal" },

      { id: "halloween_ghost", symbol: "🤎", emoji: "👻", name: "Ghost", tier: 3, weight: 7.5, category: "special" },
      { id: "halloween_spider", symbol: "🤎", emoji: "🕷️", name: "Spider", tier: 3, weight: 7.5, category: "animal" },

      { id: "halloween_troll", symbol: "🖤", emoji: "🧌", name: "Troll", tier: 4, weight: 5, category: "character" },
      { id: "halloween_oni", symbol: "🖤", emoji: "👹", name: "Oni", tier: 4, weight: 5, category: "character" },

      { id: "halloween_skeleton", symbol: "💜", emoji: "💀", name: "Skeleton", tier: 6, weight: 4.9, category: "special" },
      { id: "halloween_zombie", symbol: "🩷", emoji: "🧟‍♀️", name: "Cute Zombie", tier: 7, weight: 0.1, category: "character" }
    ]
  },

  christmas: {
    name: "Christmas",
    items: [
      { id: "christmas_snow_hare", symbol: "❄️❤️", emoji: "🐇", name: "Snow Hare", tier: 1, weight: 40, category: "animal" },

      { id: "christmas_snowman", symbol: "❄️🤍", emoji: "⛄", name: "Snowman", tier: 2, weight: 15, category: "special" },
      { id: "christmas_reindeer", symbol: "❄️🤍", emoji: "🦌", name: "Reindeer", tier: 2, weight: 15, category: "animal" },

      { id: "christmas_penguin", symbol: "❄️🩵", emoji: "🐧", name: "Penguin", tier: 3, weight: 15, category: "animal" },

      { id: "christmas_polar_bear", symbol: "❄️💙", emoji: "🐻‍❄️", name: "Polar Bear", tier: 4, weight: 5, category: "animal" },
      { id: "christmas_owl", symbol: "❄️💙", emoji: "🦉", name: "Owl", tier: 4, weight: 5, category: "animal" },

      { id: "christmas_frosty", symbol: "❄️💜", emoji: "☃️", name: "Frosty", tier: 6, weight: 2.45, category: "special" },
      { id: "christmas_olaf", symbol: "❄️💜", emoji: "☃️", name: "Olaf", tier: 6, weight: 2.45, category: "special" },

      { id: "christmas_santa", symbol: "❄️🩷", emoji: "🎅🏻", name: "Santa Claus", tier: 7, weight: 0.1, category: "character" }
    ]
  },

  valentines: {
    name: "Valentines",
    items: [
      { id: "valentines_rabbit", symbol: "❤️", emoji: "🐰", name: "Rabbit", tier: 1, weight: 22.5, category: "animal" },
      { id: "valentines_cat", symbol: "❤️", emoji: "🐈", name: "Cat", tier: 1, weight: 22.5, category: "animal" },

      { id: "valentines_dove", symbol: "🤍", emoji: "🕊️", name: "Dove", tier: 2, weight: 15, category: "animal" },
      { id: "valentines_swan", symbol: "🤍", emoji: "🦢", name: "Swan", tier: 2, weight: 15, category: "animal" },

      { id: "valentines_red_fairy", symbol: "💖", emoji: "🧚‍♀️", name: "Red Fairy", tier: 3, weight: 6, category: "character" },
      { id: "valentines_green_fairy", symbol: "💖", emoji: "🧚", name: "Green Fairy", tier: 3, weight: 6, category: "character" },
      { id: "valentines_blue_fairy", symbol: "💖", emoji: "🧚‍♂️", name: "Blue Fairy", tier: 3, weight: 6, category: "character" },

      { id: "valentines_unicorn", symbol: "💝", emoji: "🦄", name: "Unicorn", tier: 6, weight: 5, category: "animal" },
      { id: "valentines_cupid", symbol: "💘", emoji: "👼🏻", name: "Cupid", tier: 7, weight: 2, category: "character" }
    ]
  },

  ocean: {
    name: "Ocean",
    items: [
      { id: "ocean_fish", symbol: "❤️", emoji: "🐟", name: "Fish", tier: 1, weight: 18.3333, category: "animal" },
      { id: "ocean_shrimp", symbol: "❤️", emoji: "🦐", name: "Shrimp", tier: 1, weight: 18.3333, category: "animal" },
      { id: "ocean_crab", symbol: "❤️", emoji: "🦀", name: "Crab", tier: 1, weight: 18.3334, category: "animal" },

      { id: "ocean_turtle", symbol: "🩵", emoji: "🐢", name: "Turtle", tier: 2, weight: 6, category: "animal" },
      { id: "ocean_tropical_fish", symbol: "🩵", emoji: "🐠", name: "Tropical Fish", tier: 2, weight: 6, category: "animal" },
      { id: "ocean_puffer_fish", symbol: "🩵", emoji: "🐡", name: "Puffer Fish", tier: 2, weight: 6, category: "animal" },
      { id: "ocean_dolphin", symbol: "🩵", emoji: "🐬", name: "Dolphin", tier: 2, weight: 6, category: "animal" },
      { id: "ocean_seal", symbol: "🩵", emoji: "🦭", name: "Seal", tier: 2, weight: 6, category: "animal" },

      { id: "ocean_squid", symbol: "💙", emoji: "🦑", name: "Squid", tier: 3, weight: 2, category: "animal" },
      { id: "ocean_octopus", symbol: "💙", emoji: "🐙", name: "Octopus", tier: 3, weight: 2, category: "animal" },
      { id: "ocean_shark", symbol: "💙", emoji: "🦈", name: "Shark", tier: 3, weight: 2, category: "animal" },
      { id: "ocean_beluga", symbol: "💙", emoji: "🐋", name: "Beluga", tier: 3, weight: 2, category: "animal" },
      { id: "ocean_jellyfish", symbol: "💙", emoji: "🪼", name: "Jellyfish", tier: 3, weight: 2, category: "animal" },

      { id: "ocean_mermaid", symbol: "💜", emoji: "🧜‍♀️", name: "Mermaid", tier: 6, weight: 4.9, category: "character" },
      { id: "ocean_genie", symbol: "🩷", emoji: "🧞", name: "Genie", tier: 7, weight: 0.1, category: "character" }
    ]
  },

  bug: {
    name: "Bug",
    items: [
      { id: "bug_fly", symbol: "❤️", emoji: "🪰", name: "Fly", tier: 1, weight: 18.3333, category: "animal" },
      { id: "bug_mosquito", symbol: "❤️", emoji: "🦟", name: "Mosquito", tier: 1, weight: 18.3333, category: "animal" },
      { id: "bug_cockroach", symbol: "❤️", emoji: "🪳", name: "Cockroach", tier: 1, weight: 18.3334, category: "animal" },

      { id: "bug_ladybug", symbol: "💛", emoji: "🐞", name: "Ladybug", tier: 2, weight: 7.5, category: "animal" },
      { id: "bug_bumblebee", symbol: "💛", emoji: "🐝", name: "Bumblebee", tier: 2, weight: 7.5, category: "animal" },
      { id: "bug_grasshopper", symbol: "💛", emoji: "🦗", name: "Grasshopper", tier: 2, weight: 7.5, category: "animal" },
      { id: "bug_beetle", symbol: "💛", emoji: "🪲", name: "Beetle", tier: 2, weight: 7.5, category: "animal" },

      { id: "bug_spider", symbol: "🤎", emoji: "🕷️", name: "Spider", tier: 3, weight: 4, category: "animal" },
      { id: "bug_scorpion", symbol: "🤎", emoji: "🦂", name: "Scorpion", tier: 3, weight: 4, category: "animal" },
      { id: "bug_ant", symbol: "🤎", emoji: "🐜", name: "Ant", tier: 3, weight: 4, category: "animal" },

      { id: "bug_butterfly", symbol: "💙", emoji: "🦋", name: "Butterfly", tier: 5, weight: 3, category: "animal" }
    ]
  },

  spring: {
    name: "Spring",
    items: [
      { id: "spring_gerbil", symbol: "❤️", emoji: "🐹", name: "Gerbil", tier: 1, weight: 20, category: "animal" },
      { id: "spring_rabbit", symbol: "❤️", emoji: "🐰", name: "Rabbit", tier: 1, weight: 20, category: "animal" },

      { id: "spring_duck", symbol: "🧡", emoji: "🦆", name: "Duck", tier: 2, weight: 15, category: "animal" },
      { id: "spring_goose", symbol: "🧡", emoji: "🪿", name: "Goose", tier: 2, weight: 15, category: "animal" },

      { id: "spring_cow", symbol: "💛", emoji: "🐮", name: "Cow", tier: 3, weight: 9, category: "animal" },
      { id: "spring_horse", symbol: "💛", emoji: "🐴", name: "Horse", tier: 3, weight: 9, category: "animal" },

      { id: "spring_raccoon", symbol: "💚", emoji: "🦝", name: "Raccoon", tier: 4, weight: 4, category: "animal" },
      { id: "spring_hedgehog", symbol: "💚", emoji: "🦔", name: "Hedgehog", tier: 4, weight: 4, category: "animal" },

      { id: "spring_butterfly", symbol: "💙", emoji: "🦋", name: "Butterfly", tier: 5, weight: 1.5, category: "animal" },
      { id: "spring_snake", symbol: "💙", emoji: "🐍", name: "Snake", tier: 5, weight: 1.5, category: "animal" },

      { id: "spring_phoenix", symbol: "❤️‍🔥", emoji: "🐦‍🔥", name: "Phoenix", tier: 6, weight: 0.8, category: "animal" },
      { id: "spring_wind_spirit", symbol: "🩷", emoji: "🌬️", name: "Spirit of the Wind", tier: 7, weight: 0.2, category: "phenomenon" }
    ]
  },

  jungle: {
    name: "Jungle",
    items: [
      { id: "jungle_sloth", symbol: "❤️", emoji: "🦥", name: "Sloth", tier: 1, weight: 20, category: "animal" },
      { id: "jungle_monkey", symbol: "❤️", emoji: "🐵", name: "Monkey", tier: 1, weight: 20, category: "animal" },

      { id: "jungle_flamingo", symbol: "🧡", emoji: "🦩", name: "Flamingo", tier: 2, weight: 15, category: "animal" },
      { id: "jungle_parrot", symbol: "🧡", emoji: "🦜", name: "Parrot", tier: 2, weight: 15, category: "animal" },

      { id: "jungle_leopard", symbol: "💛", emoji: "🐆", name: "Leopard", tier: 3, weight: 7.5, category: "animal" },
      { id: "jungle_gorilla", symbol: "💛", emoji: "🦍", name: "Gorilla", tier: 3, weight: 7.5, category: "animal" },

      { id: "jungle_elephant", symbol: "💚", emoji: "🐘", name: "Elephant", tier: 4, weight: 4, category: "animal" },
      { id: "jungle_rhino", symbol: "💚", emoji: "🦏", name: "Rhino", tier: 4, weight: 4, category: "animal" },

      { id: "jungle_tiger", symbol: "💙", emoji: "🐅", name: "Tiger", tier: 5, weight: 2, category: "animal" },
      { id: "jungle_orangutan", symbol: "💙", emoji: "🦧", name: "Orangutan", tier: 5, weight: 2, category: "animal" },

      { id: "jungle_sauropod", symbol: "💜", emoji: "🦕", name: "Sauropod", tier: 6, weight: 1.5, category: "animal" },
      { id: "jungle_tyrannosaurus", symbol: "💜", emoji: "🦖", name: "Tyrannosaurus", tier: 6, weight: 1.5, category: "animal" }
    ]
  },

  savannah: {
    name: "Savannah",
    items: [
      { id: "savannah_ram", symbol: "❤️", emoji: "🐏", name: "Ram", tier: 1, weight: 20, category: "animal" },
      { id: "savannah_sheep", symbol: "❤️", emoji: "🐑", name: "Sheep", tier: 1, weight: 20, category: "animal" },

      { id: "savannah_camel", symbol: "🧡", emoji: "🐪", name: "Camel", tier: 2, weight: 15, category: "animal" },
      { id: "savannah_bactrian_camel", symbol: "🧡", emoji: "🐫", name: "Bactrian Camel", tier: 2, weight: 15, category: "animal" },

      { id: "savannah_zebra", symbol: "💛", emoji: "🦓", name: "Zebra", tier: 3, weight: 7.5, category: "animal" },
      { id: "savannah_hippo", symbol: "💛", emoji: "🦛", name: "Hippo", tier: 3, weight: 7.5, category: "animal" },

      { id: "savannah_kangaroo", symbol: "💚", emoji: "🦘", name: "Kangaroo", tier: 4, weight: 4, category: "animal" },
      { id: "savannah_giraffe", symbol: "💚", emoji: "🦒", name: "Giraffe", tier: 4, weight: 4, category: "animal" },

      { id: "savannah_bison", symbol: "💙", emoji: "🦬", name: "Bison", tier: 5, weight: 2, category: "animal" },
      { id: "savannah_koala", symbol: "💙", emoji: "🐨", name: "Koala", tier: 5, weight: 2, category: "animal" },

      { id: "savannah_mammoth", symbol: "💜", emoji: "🦣", name: "Mammoth", tier: 6, weight: 3, category: "animal" }
    ]
  },

  woodland: {
    name: "Woodland",
    items: [
      { id: "woodland_squirrel", symbol: "❤️", emoji: "🐿️", name: "Squirrel", tier: 1, weight: 20, category: "animal" },
      { id: "woodland_skunk", symbol: "❤️", emoji: "🦨", name: "Skunk", tier: 1, weight: 20, category: "animal" },

      { id: "woodland_pig", symbol: "🧡", emoji: "🐷", name: "Pig", tier: 2, weight: 15, category: "animal" },
      { id: "woodland_chicken", symbol: "🧡", emoji: "🐔", name: "Chicken", tier: 2, weight: 15, category: "animal" },

      { id: "woodland_donkey", symbol: "💛", emoji: "🫏", name: "Donkey", tier: 3, weight: 7.5, category: "animal" },
      { id: "woodland_llama", symbol: "💛", emoji: "🦙", name: "Llama", tier: 3, weight: 7.5, category: "animal" },

      { id: "woodland_boar", symbol: "💚", emoji: "🐗", name: "Boar", tier: 4, weight: 4, category: "animal" },
      { id: "woodland_otter", symbol: "💚", emoji: "🦦", name: "Otter", tier: 4, weight: 4, category: "animal" },

      { id: "woodland_grizzly", symbol: "💙", emoji: "🐻", name: "Grizzly", tier: 5, weight: 2, category: "animal" },
      { id: "woodland_raven", symbol: "💙", emoji: "🐦‍⬛", name: "Raven", tier: 5, weight: 2, category: "animal" },

      { id: "woodland_dodo", symbol: "💜", emoji: "🦤", name: "Dodo", tier: 6, weight: 3, category: "animal" }
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

 if (!banner) {
  return res.send("Please specify a banner.");
}

if (!BANNERS[banner]) {
  return res.send("Unknown banner.");
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
