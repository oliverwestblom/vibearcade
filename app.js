async function fetchGames() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('games.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`games.json svarade med HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 1 || location.protocol === 'file:') throw error;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

async function loadGames() {
  const container = document.querySelector('#games');
  container.textContent = 'Laddar spelen…';
  document.querySelector('#game-count').textContent = '';
  try {
    const games = await fetchGames();
    if (!Array.isArray(games)) throw new Error('Ogiltig spellista');
    container.replaceChildren();
    games.forEach((game, index) => {
      if (!/^[a-z0-9_-]+$/i.test(game.folder) || typeof game.name !== 'string') throw new Error('Ogiltigt spel');
      const card = document.createElement('a');
      card.className = `game-card ${game.folder}`;
      card.href = `games/${encodeURIComponent(game.folder)}/index.html`;
      const art = document.createElement('div');
      art.className = 'game-art';
      art.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 8; i++) art.appendChild(document.createElement('i'));
      const body = document.createElement('div');
      body.className = 'card-body';
      const tag = document.createElement('p'); tag.className = 'eyebrow'; tag.textContent = `${game.number || index + 1} / ${game.tag || 'SPEL'}`;
      const title = document.createElement('h3'); title.textContent = game.name;
      const description = document.createElement('p'); description.textContent = game.description || '';
      const controls = document.createElement('small'); controls.textContent = game.controls || '';
      const action = document.createElement('span'); action.className = 'card-action'; action.textContent = 'Spela nu ↗';
      body.append(tag, title, description, controls, action);
      card.append(art, body); container.append(card);
    });
    document.querySelector('#game-count').textContent = `${games.length} spel att upptäcka`;
    if (!games.length) container.textContent = 'Inga spel har lagts till ännu.';
  } catch (error) {
    container.replaceChildren();
    const message = document.createElement('p');
    message.className = 'error';
    message.textContent = location.protocol === 'file:'
      ? 'Öppna portalen via en webbserver: kör python -m http.server 8000 i C:\\work\\b3vibe och öppna http://localhost:8000.'
      : `Spellistan kunde inte laddas. Kontrollera att webbservern fortfarande körs i C:\\work\\b3vibe. Fel: ${error.message}`;
    const retry = document.createElement('button');
    retry.className = 'primary';
    retry.textContent = 'Försök igen';
    retry.addEventListener('click', loadGames);
    const errorPanel = document.createElement('div');
    errorPanel.append(message, retry);
    container.append(errorPanel);
    console.error(error);
  }
}
loadGames();
