// Firebase Configuration - Using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global state
let allGames = [];
let filteredGames = [];

// DOM Elements
const gamesGrid = document.getElementById('gamesGrid');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const resultsCount = document.getElementById('resultsCount');
const searchInput = document.getElementById('searchInput');
const playerFilter = document.getElementById('playerFilter');
const modeFilter = document.getElementById('modeFilter');
const categoryFilter = document.getElementById('categoryFilter');
const sortSelect = document.getElementById('sortSelect');
const resetFiltersBtn = document.getElementById('resetFilters');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadGames();
  setupEventListeners();

  // Back button listener
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', showGameList);
  }
});

// Load games from Firestore
async function loadGames() {
  try {
    loading.classList.remove('hidden');
    gamesGrid.innerHTML = '';

    const snapshot = await db.collection('games').get();
    allGames = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    filteredGames = [...allGames];
    sortGames();
    renderGames();
  } catch (error) {
    console.error('Error loading games:', error);
    gamesGrid.innerHTML = `
      <div class="text-center py-12" style="grid-column: 1 / -1;">
        <p class="text-xl font-semibold" style="color: var(--accent);">Error loading games</p>
        <p class="text-sm py-3">Please check your Firebase configuration</p>
      </div>
    `;
  } finally {
    loading.classList.add('hidden');
  }
}

// Setup event listeners
function setupEventListeners() {
  searchInput.addEventListener('input', debounce(applyFilters, 300));
  playerFilter.addEventListener('change', applyFilters);
  modeFilter.addEventListener('change', applyFilters);
  categoryFilter.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', () => {
    sortGames();
    renderGames();
  });
  resetFiltersBtn.addEventListener('click', resetFilters);
}

// Apply filters
function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const playerCount = playerFilter.value;
  const mode = modeFilter.value;
  const category = categoryFilter.value;

  filteredGames = allGames.filter(game => {
    // Search filter
    if (searchTerm) {
      const searchIndex = game.searchIndex || '';
      if (!searchIndex.includes(searchTerm)) {
        return false;
      }
    }

    // Player count filter
    if (playerCount) {
      if (playerCount === '1') {
        if (game.playerCountMin !== 1) return false;
      } else if (playerCount === '2') {
        if (!(game.playerCountMin <= 2 && (game.playerCountMax === '2' || parseInt(game.playerCountMax) >= 2))) {
          return false;
        }
      } else if (playerCount === '3-4') {
        const maxPlayers = parseInt(game.playerCountMax) || 0;
        if (!(game.playerCountMin <= 4 && maxPlayers >= 3)) {
          return false;
        }
      } else if (playerCount === '5+') {
        const maxPlayers = parseInt(game.playerCountMax) || 0;
        if (maxPlayers < 5 && !game.playerCountMax.includes('+')) {
          return false;
        }
      }
    }

    // Game mode filter
    if (mode) {
      const gameMode = game.gameMode || '';
      if (!gameMode.toLowerCase().includes(mode.toLowerCase())) {
        return false;
      }
    }

    // Category filter
    if (category) {
      if (game.inventoryCategory !== category) {
        return false;
      }
    }

    return true;
  });

  sortGames();
  renderGames();
}

// Sort games
function sortGames() {
  const sortBy = sortSelect.value;

  filteredGames.sort((a, b) => {
    if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    } else if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    } else if (sortBy === 'playTimeMin') {
      return (a.playTimeMin || 0) - (b.playTimeMin || 0);
    } else if (sortBy === 'playerCountMin') {
      return (a.playerCountMin || 0) - (b.playerCountMin || 0);
    }
    return 0;
  });
}

// Reset filters
function resetFilters() {
  searchInput.value = '';
  playerFilter.value = '';
  modeFilter.value = '';
  categoryFilter.value = '';
  sortSelect.value = 'title';
  applyFilters();
}

// Render games
function renderGames() {
  gamesGrid.innerHTML = '';

  if (filteredGames.length === 0) {
    noResults.classList.remove('hidden');
    resultsCount.classList.add('hidden');
    return;
  }

  noResults.classList.add('hidden');
  resultsCount.classList.remove('hidden');
  resultsCount.textContent = `Showing ${filteredGames.length} game${filteredGames.length !== 1 ? 's' : ''}`;

  filteredGames.forEach(game => {
    const card = createGameCard(game);
    gamesGrid.appendChild(card);
  });
}

// Create game card
function createGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card';
  card.onclick = () => showGameDetail(game);

  const playerInfo = formatPlayerCount(game.playerCountMin, game.playerCountMax);
  const timeInfo = formatPlayTime(game.playTimeMin, game.playTimeMax);

  card.innerHTML = `
    <div class="game-image">
      ${game.imageUrl ?
        `<img src="${game.imageUrl}" alt="${game.title}" loading="lazy" />` :
        '<div class="game-image-placeholder"><span class="iconify" data-icon="ant-design:trophy-outlined" style="font-size: 3rem;"></span></div>'
      }
    </div>
    <h3 class="game-title">${game.title || 'Untitled Game'}</h3>
    <p class="game-publisher">${game.publisher || 'Unknown Publisher'}</p>
    <div class="game-meta">
      ${game.inventoryCategory ? `<span class="meta-badge category">${game.inventoryCategory}</span>` : ''}
      ${game.gameMode ? `<span class="meta-badge mode">${game.gameMode}</span>` : ''}
      ${playerInfo ? `<span class="meta-badge"><span class="iconify" data-icon="ant-design:team-outlined"></span> ${playerInfo}</span>` : ''}
      ${timeInfo ? `<span class="meta-badge"><span class="iconify" data-icon="ant-design:clock-circle-outlined"></span> ${timeInfo}</span>` : ''}
      ${game.rating ? `<span class="meta-badge rating"><span class="iconify" data-icon="ant-design:star-filled"></span> ${game.rating}</span>` : ''}
    </div>
  `;

  return card;
}

// Format player count
function formatPlayerCount(min, max) {
  if (!min && !max) return '';
  if (!max || max === min) return `${min}`;
  return `${min}-${max}`;
}

// Format play time
function formatPlayTime(min, max) {
  if (!min && !max) return '';
  if (!max || max === min) return `${min}m`;
  return `${min}-${max}m`;
}

// Find similar games based on player count, play time, and age
function findSimilarGames(currentGame, limit = 4) {
  const similarGames = allGames
    .filter(game => game.id !== currentGame.id) // Exclude current game
    .map(game => {
      let score = 0;

      // Check player count overlap (weight: 40%)
      if (currentGame.playerCountMin && game.playerCountMin) {
        const currentMin = currentGame.playerCountMin;
        const currentMax = parseInt(currentGame.playerCountMax) || currentGame.playerCountMin;
        const gameMin = game.playerCountMin;
        const gameMax = parseInt(game.playerCountMax) || game.playerCountMin;

        // Check if ranges overlap
        if (gameMin <= currentMax && gameMax >= currentMin) {
          score += 40;
        }
      }

      // Check play time similarity (weight: 30%)
      if (currentGame.playTimeMin && game.playTimeMin) {
        const currentAvg = ((currentGame.playTimeMin + (parseInt(currentGame.playTimeMax) || currentGame.playTimeMin)) / 2);
        const gameAvg = ((game.playTimeMin + (parseInt(game.playTimeMax) || game.playTimeMin)) / 2);
        const timeDiff = Math.abs(currentAvg - gameAvg);

        // Within 30 minutes = full points, scale down linearly up to 90 minutes
        if (timeDiff <= 30) {
          score += 30;
        } else if (timeDiff <= 90) {
          score += 30 * (1 - (timeDiff - 30) / 60);
        }
      }

      // Check age similarity (weight: 30%)
      if (currentGame.age && game.age) {
        const currentAge = parseInt(currentGame.age.replace(/\D/g, '')) || 0;
        const gameAge = parseInt(game.age.replace(/\D/g, '')) || 0;
        const ageDiff = Math.abs(currentAge - gameAge);

        // Same age = full points, scale down linearly up to 4 years difference
        if (ageDiff === 0) {
          score += 30;
        } else if (ageDiff <= 4) {
          score += 30 * (1 - ageDiff / 4);
        }
      }

      return { game, score };
    })
    .filter(item => item.score > 0) // Only include games with some similarity
    .sort((a, b) => b.score - a.score) // Sort by similarity score
    .slice(0, limit) // Limit results
    .map(item => item.game);

  return similarGames;
}

// Show game details in full page
function showGameDetail(game) {
  const gameListView = document.getElementById('gameListView');
  const gameDetailView = document.getElementById('gameDetailView');
  const gameDetailContent = document.getElementById('gameDetailContent');

  const playerInfo = formatPlayerCount(game.playerCountMin, game.playerCountMax);
  const timeInfo = formatPlayTime(game.playTimeMin, game.playTimeMax);

  gameDetailContent.innerHTML = `
    <div class="detail-container">
      <h2 class="detail-game-title">${game.title || 'Untitled Game'}</h2>
      <p class="detail-game-publisher">${game.publisher || 'Unknown Publisher'}</p>

      ${game.imageUrl ? `
        <div class="detail-game-image">
          <img src="${game.imageUrl}" alt="${game.title}" />
        </div>
      ` : ''}

      ${game.description ? `
        <div class="detail-section">
          <div class="detail-label">Description</div>
          <div class="detail-value">${game.description}</div>
        </div>
      ` : ''}

      <div class="detail-grid">
        ${playerInfo ? `
          <div class="detail-item">
            <div class="detail-item-label">Players</div>
            <div class="detail-item-value"><span class="iconify" data-icon="ant-design:team-outlined"></span> ${playerInfo}</div>
          </div>
        ` : ''}
        ${timeInfo ? `
          <div class="detail-item">
            <div class="detail-item-label">Play Time</div>
            <div class="detail-item-value"><span class="iconify" data-icon="ant-design:clock-circle-outlined"></span> ${timeInfo}</div>
          </div>
        ` : ''}
        ${game.age ? `
          <div class="detail-item">
            <div class="detail-item-label">Age</div>
            <div class="detail-item-value">${game.age}</div>
          </div>
        ` : ''}
        ${game.rating ? `
          <div class="detail-item">
            <div class="detail-item-label">Rating</div>
            <div class="detail-item-value"><span class="iconify" data-icon="ant-design:star-filled"></span> ${game.rating}</div>
          </div>
        ` : ''}
        ${game.complexity ? `
          <div class="detail-item">
            <div class="detail-item-label">Complexity</div>
            <div class="detail-item-value">${game.complexity}</div>
          </div>
        ` : ''}
        ${game.inventoryCategory ? `
          <div class="detail-item">
            <div class="detail-item-label">Category</div>
            <div class="detail-item-value">${game.inventoryCategory}</div>
          </div>
        ` : ''}
      </div>

      ${game.gameMode ? `
        <div class="detail-section">
          <div class="detail-label">Game Mode</div>
          <div class="detail-value">${game.gameMode}</div>
        </div>
      ` : ''}

      ${game.theme ? `
        <div class="detail-section">
          <div class="detail-label">Theme</div>
          <div class="detail-value">${game.theme}</div>
        </div>
      ` : ''}

      ${game.gameMechanics ? `
        <div class="detail-section">
          <div class="detail-label">Game Mechanics</div>
          <div class="detail-value">${game.gameMechanics}</div>
        </div>
      ` : ''}

      ${game.tags ? `
        <div class="detail-section">
          <div class="detail-label">Tags</div>
          <div class="detail-value">${game.tags}</div>
        </div>
      ` : ''}

      ${game.notes ? `
        <div class="detail-section">
          <div class="detail-label">Notes</div>
          <div class="detail-value">${game.notes}</div>
        </div>
      ` : ''}

      ${game.rulesUrl ? `
        <div class="detail-section">
          <a href="${game.rulesUrl}" target="_blank" class="game-link-btn">
            <span class="iconify" data-icon="ant-design:book-outlined"></span> View Rules
          </a>
        </div>
      ` : ''}
    </div>

    <!-- Similar Games Section -->
    <div id="similarGamesSection" class="similar-games-section"></div>
  `;

  // Hide list, show detail
  gameListView.classList.add('hidden');
  gameDetailView.classList.remove('hidden');

  // Render similar games
  renderSimilarGames(game);

  // Scroll to top
  window.scrollTo(0, 0);
}

// Render similar games section
function renderSimilarGames(currentGame) {
  const similarGamesSection = document.getElementById('similarGamesSection');
  const similarGames = findSimilarGames(currentGame, 4);

  if (similarGames.length === 0) {
    similarGamesSection.innerHTML = '';
    return;
  }

  let similarGamesHTML = `
    <div class="similar-games-header">
      <h3 class="similar-games-title">Similar Games</h3>
      <p class="similar-games-subtitle">You might also enjoy these games</p>
    </div>
    <div class="similar-games-grid">
  `;

  similarGames.forEach(game => {
    const playerInfo = formatPlayerCount(game.playerCountMin, game.playerCountMax);
    const timeInfo = formatPlayTime(game.playTimeMin, game.playTimeMax);

    similarGamesHTML += `
      <div class="similar-game-card" data-game-id="${game.id}">
        <div class="similar-game-image">
          ${game.imageUrl ?
            `<img src="${game.imageUrl}" alt="${game.title}" loading="lazy" />` :
            '<div class="game-image-placeholder"><span class="iconify" data-icon="ant-design:trophy-outlined"></span></div>'
          }
        </div>
        <div class="similar-game-content">
          <h4 class="similar-game-title">${game.title || 'Untitled Game'}</h4>
          <p class="similar-game-publisher">${game.publisher || 'Unknown'}</p>
          <div class="similar-game-meta">
            ${playerInfo ? `<span class="meta-badge"><span class="iconify" data-icon="ant-design:team-outlined"></span> ${playerInfo}</span>` : ''}
            ${timeInfo ? `<span class="meta-badge"><span class="iconify" data-icon="ant-design:clock-circle-outlined"></span> ${timeInfo}</span>` : ''}
            ${game.age ? `<span class="meta-badge">${game.age}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  similarGamesHTML += `
    </div>
  `;

  similarGamesSection.innerHTML = similarGamesHTML;

  // Add click event listeners to similar game cards
  const similarGameCards = similarGamesSection.querySelectorAll('.similar-game-card');
  similarGameCards.forEach(card => {
    card.addEventListener('click', () => {
      const gameId = card.getAttribute('data-game-id');
      const game = allGames.find(g => g.id === gameId);
      if (game) {
        showGameDetail(game);
      }
    });
  });
}

// Back to game list
function showGameList() {
  const gameListView = document.getElementById('gameListView');
  const gameDetailView = document.getElementById('gameDetailView');

  gameDetailView.classList.add('hidden');
  gameListView.classList.remove('hidden');

  // Scroll to top
  window.scrollTo(0, 0);
}

// Utility: Debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Back to list on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const gameDetailView = document.getElementById('gameDetailView');
    if (gameDetailView && !gameDetailView.classList.contains('hidden')) {
      showGameList();
    }
  }
});
