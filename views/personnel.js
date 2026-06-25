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

function renderPersonnelDirectory(PERSONNEL) {
  const cards = Object.entries(PERSONNEL).map(([key, person]) => `
    <div class="card">
      <h3>${person.emoji} ${person.name}</h3>
      <p><strong>${person.role}</strong></p>
      <p><a href="/chronicle/personnel/${key}">View Profile</a></p>
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sanctuary Personnel</title>
  <link rel="stylesheet" href="/chronicle.css">
</head>
<body>
  <h1>📜 Sanctuary Chronicle</h1>
  <div class="subtitle">Sanctuary Personnel</div>

  ${renderNav()}

  <div class="section">
    <h2>Personnel Directory</h2>
    <div class="grid">
      ${cards}

      <div class="card">
        <h3>💂🏻‍♀️💂🏼‍♂️ Guards</h3>
        <p><strong>Sanctuary Security</strong></p>
        <p class="muted">Protect restricted areas.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

function renderPersonnelProfile(person) {
  const sections = person.sections.map(section => `
    <div class="section">
      <h2>${section}</h2>
      <p class="muted">Coming soon.</p>
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${person.name} - Sanctuary Personnel</title>
  <link rel="stylesheet" href="/chronicle.css">
</head>
<body>
  <h1>${person.emoji} ${person.name}</h1>
  <div class="subtitle">${person.role}</div>

  ${renderNav()}

  ${sections}

  <footer>
    <a href="/chronicle/personnel">Return to Personnel Directory</a>
  </footer>
</body>
</html>
`;
}

module.exports = {
  renderPersonnelDirectory,
  renderPersonnelProfile
};