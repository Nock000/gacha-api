const express = require("express");
const Database = require("better-sqlite3");

const API_KEY = process.env.API_KEY;

const BLOCKED_USERS = [
  // "exampleuser"
];

function isBlocked(username) {
  return BLOCKED_USERS.includes(username.toLowerCase());
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

const PORT = process.env.PORT || 3000;

const banner = [
  { items: ["❤️🐶", "❤️🐱"], rate: 40 },
  { items: ["🧡🐰", "🧡🐸"], rate: 30 },
  { items: ["💛🦊", "💛🐺"], rate: 20 },
  { items: ["💚🐻", "💚🦁"], rate: 7 },
  { items: ["💙🦅", "💙🦉"], rate: 2.5 },
  { items: ["💜🐉"], rate: 0.4 },
  { items: ["🩷👰🏻‍♀️"], rate: 0.1 }
];

function cleanUsername(name) {
  if (!name) return null;
  return name.replace("@", "").trim().toLowerCase();
}

function pullItem() {
  const roll = Math.random() * 100;
  let total = 0;

  for (const tier of banner) {
    total += tier.rate;
    if (roll < total) {
      return tier.items[Math.floor(Math.random() * tier.items.length)];
    }
  }

  return "❤️🐶";
}

function savePull(username, item, pullType) {
  db.prepare(`
    INSERT INTO pulls (username, item, pull_type)
    VALUES (?, ?, ?)
  `).run(username, item, pullType);
}

app.get("/", (req, res) => {
  res.send("Gacha API is running!");
});

app.get("/gacha", (req, res) => {

  if (req.query.key !== API_KEY) {
    return res.send("Unauthorized");
  }

  const username = cleanUsername(req.query.user);

if (isBlocked(username)) {
  return res.send("Access denied.");
}

  if (!username) {
    return res.send("Missing username.");
  }

  const item = pullItem();
  savePull(username, item, "gacha");

  res.send(`@${username} pulled ${item}`);
});

app.get("/compendium", (req, res) => {

  if (req.query.key !== API_KEY) {
    return res.send("Unauthorized");
  }

  const username = cleanUsername(req.query.user);

if (isBlocked(username)) {
  return res.send("Access denied.");
}


  if (!username) {
    return res.send("Missing username.");
  }

  const rows = db.prepare(`
    SELECT item, COUNT(*) as count
    FROM pulls
    WHERE username = ?
    GROUP BY item
    ORDER BY
  CASE item
    WHEN '❤️🐶' THEN 1
    WHEN '❤️🐱' THEN 2
    WHEN '🧡🐰' THEN 3
    WHEN '🧡🐸' THEN 4
    WHEN '💛🦊' THEN 5
    WHEN '💛🐺' THEN 6
    WHEN '💚🐻' THEN 7
    WHEN '💚🦁' THEN 8
    WHEN '💙🦅' THEN 9
    WHEN '💙🦉' THEN 10
    WHEN '💜🐉' THEN 11
    WHEN '🩷👰🏻‍♀️' THEN 12
  END
  `).all(username);

  if (rows.length === 0) {
    return res.send(`@${username} has no pulls yet.`);
  }

  const collection = rows
    .map(row => `${row.item}x${row.count}`)
    .join(", ");

  res.send(`@${username}: ${collection}`);
});

app.get("/10pull", (req, res) => {

  if (req.query.key !== API_KEY) {
    return res.send("Unauthorized");
  }

  const username = cleanUsername(req.query.user);

if (isBlocked(username)) {
  return res.send("Access denied.");
}


  if (!username) {
    return res.send("Missing username.");
  }

  const results = [];

  for (let i = 0; i < 10; i++) {
    const item = pullItem();

    results.push(item);

    savePull(username, item, "tenpull");
  }

  res.send(
    `@${username} 10-pull: ${results.join(", ")}`
  );
});
const showcaseItems = [
  "💙🦅",
  "💙🦉",
  "💜🐉",
  "🩷👰🏻‍♀️"
];

app.get("/showcase", (req, res) => {

  if (req.query.key !== API_KEY) {
    return res.send("Unauthorized");
  }

  const username = cleanUsername(req.query.user);

if (isBlocked(username)) {
  return res.send("Access denied.");
}


  if (!username) {
    return res.send("Missing username.");
  }

  const placeholders = showcaseItems.map(() => "?").join(",");

  const rows = db.prepare(`
    SELECT item, COUNT(*) as count
    FROM pulls
    WHERE username = ?
    AND item IN (${placeholders})
    GROUP BY item
    ORDER BY COUNT(*) DESC
  `).all(username, ...showcaseItems);

  if (rows.length === 0) {
    return res.send(`@${username} has nothing to showcase yet.`);
  }

  const showcase = rows
    .map(row => `${row.item}x${row.count}`)
    .join(", ");

  res.send(`@${username} showcase: ${showcase}`);
});

app.get("/pulls", (req, res) => {

  if (req.query.key !== API_KEY) {
    return res.send("Unauthorized");
  }

  const username = cleanUsername(req.query.user);

if (isBlocked(username)) {
  return res.send("Access denied.");
}


  if (!username) {
    return res.send("Missing username.");
  }

  const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM pulls
    WHERE username = ?
  `).get(username);

  res.send(`@${username} has made ${row.count} pulls.`);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
