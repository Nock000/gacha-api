function createChronicleService(db) {
  function record({
    category,
    title,
    message,
    username = null,
    itemId = null,
    bannerId = null,
    announced = 0
  }) {
    const result = db.prepare(`
      INSERT INTO chronicle_entries (
        category,
        title,
        message,
        username,
        item_id,
        banner_id,
        announced
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      category,
      title,
      message,
      username,
      itemId,
      bannerId,
      announced
    );

    return result.lastInsertRowid;
  }

  function getPending() {
    return db.prepare(`
      SELECT *
      FROM chronicle_entries
      WHERE announced = 0
      ORDER BY created_at ASC, id ASC
    `).all();
  }

function getNextPending() {
  return db.prepare(`
    SELECT *
    FROM chronicle_entries
    WHERE announced = 0
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  `).get();
  
}
  function markAnnounced(id) {
  return db.prepare(`
    UPDATE chronicle_entries
    SET announced = 1
    WHERE id = ?
  `).run(id);
}

function formatAnnouncement(entry) {
  if (entry.category === "first_discovery") {
    return `📜 ${entry.username} discovered ${entry.message}.`;
  }

  return `📜 ${entry.title}: ${entry.message}`;
}

function announceNext() {
  const entry = getNextPending();

  if (!entry) {
    return null;
  }

  markAnnounced(entry.id);

  return formatAnnouncement(entry);
}

  return {
    record,
    getPending,
    getNextPending,
    markAnnounced,
    announceNext
  };
}

module.exports = createChronicleService;