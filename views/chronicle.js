function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderNav() {
  return `
<nav>
  <a href="/chronicle">Home</a>
  <a href="/chronicle/latest">Latest Records</a>
  <a href="/chronicle/discoveries">Discoveries</a>
  <a href="/chronicle/collections">Collections</a>
  <a href="/chronicle/thresholds">Thresholds</a>
  <a href="/chronicle/personnel">Personnel</a>
  <a href="/chronicle/history">History</a>
</nav>
`;
}

function renderChroniclePage(pageTitle, entries) {
  const entryHtml = entries.length
    ? entries.map(entry => `
      <div class="section">
        <h2>${escapeHtml(entry.title)}</h2>
        <p>${escapeHtml(entry.message)}</p>
        <p class="muted">${escapeHtml(entry.category)} · ${escapeHtml(entry.created_at)}</p>
      </div>
    `).join("")
    : `
      <div class="section">
        <h2>No records yet.</h2>
        <p class="muted">This section of the Chronicle is waiting for its first entry.</p>
      </div>
    `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(pageTitle)} - Sanctuary Chronicle</title>
  <link rel="stylesheet" href="/chronicle.css">
</head>
<body>
  <h1>📜 Sanctuary Chronicle</h1>
  <div class="subtitle">${escapeHtml(pageTitle)}</div>

  ${renderNav()}

  ${entryHtml}

  <footer>
    Sanctuary Chronicle · Established during late beta
  </footer>
</body>
</html>
`;
}

module.exports = {
  escapeHtml,
  renderChroniclePage
};