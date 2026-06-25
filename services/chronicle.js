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

  return {
    record
  };
}

module.exports = createChronicleService;