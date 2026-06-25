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

  return {
    record,
    getPending
  };
}

module.exports = createChronicleService;