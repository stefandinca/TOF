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
let allCategories = [];
let allMechanics = [];
let selectedCategories = [];
let selectedMechanics = [];

// DOM Elements
const gamesGrid = document.getElementById('gamesGrid');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const resultsCount = document.getElementById('resultsCount');
const searchInput = document.getElementById('searchInput');
const playerMinFilter = document.getElementById('playerMin');
const playerMaxFilter = document.getElementById('playerMax');
const modeFilter = document.getElementById('modeFilter');
const categoryFilter = document.getElementById('categoryFilter');
const complexityFilter = document.getElementById('complexityFilter');
const sortSelect = document.getElementById('sortSelect');
const resetFiltersBtn = document.getElementById('resetFilters');

// Mobile filter elements
const filterToggleBtn = document.getElementById('filterToggleBtn');
const filterOverlay = document.getElementById('filterOverlay');
const closeFilterOverlayBtn = document.getElementById('closeFilterOverlay');
const applyFiltersMobileBtn = document.getElementById('applyFiltersMobile');
const resetFiltersMobileBtn = document.getElementById('resetFiltersMobile');
const playerMinMobile = document.getElementById('playerMinMobile');
const playerMaxMobile = document.getElementById('playerMaxMobile');
const modeFilterMobile = document.getElementById('modeFilterMobile');
const categoryFilterMobile = document.getElementById('categoryFilterMobile');
const complexityFilterMobile = document.getElementById('complexityFilterMobile');
const sortSelectMobile = document.getElementById('sortSelectMobile');

// Checkbox search elements
const categoriesSearch = document.getElementById('categoriesSearch');
const mechanicsSearch = document.getElementById('mechanicsSearch');
const categoriesSearchMobile = document.getElementById('categoriesSearchMobile');
const mechanicsSearchMobile = document.getElementById('mechanicsSearchMobile');

// Constants
const VISIBLE_CHECKBOX_COUNT = 5;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadGames();
  setupEventListeners();

  // Back button listener
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', showGameList);
  }

  // Back button from Past Games listener
  const backToLibFromPast = document.getElementById('backToLibFromPast');
  if (backToLibFromPast) {
    backToLibFromPast.addEventListener('click', showGameList);
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

    // Extract unique categories and mechanics
    extractCategoriesAndMechanics();
    populateCheckboxes();

    filteredGames = [...allGames];
    sortGames();
    renderGames();

    // Setup Game of the Month Banner
    setupGOTMBanner();

    // Load past featured games
    loadPastFeaturedGames();
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

// Extract unique categories and mechanics from all games
function extractCategoriesAndMechanics() {
  const categoriesSet = new Set();
  const mechanicsSet = new Set();

  allGames.forEach(game => {
    // Extract categories
    if (game.categories && Array.isArray(game.categories)) {
      game.categories.forEach(cat => {
        if (cat && cat.trim()) categoriesSet.add(cat.trim());
      });
    }

    // Extract mechanics
    if (game.mechanics && Array.isArray(game.mechanics)) {
      game.mechanics.forEach(mech => {
        if (mech && mech.trim()) mechanicsSet.add(mech.trim());
      });
    }
  });

  allCategories = [...categoriesSet].sort();
  allMechanics = [...mechanicsSet].sort();
}

// Setup Game of the Month Banner
function setupGOTMBanner() {
  const gotmBanner = document.getElementById('gotmBanner');
  const featuredGame = allGames.find(g => g.isFeaturedGameOfMonth === true);

  if (!featuredGame || !gotmBanner) {
    if (gotmBanner) gotmBanner.classList.add('hidden');
    return;
  }

  // Populate banner
  const bannerTitle = document.getElementById('gotmBannerTitle');
  const bannerDate = document.getElementById('gotmBannerDate');
  const bannerImage = document.getElementById('gotmBannerImage');

  if (bannerTitle) bannerTitle.textContent = featuredGame.title;
  if (bannerDate) bannerDate.textContent = `${featuredGame.featuredMonth || ''} ${featuredGame.featuredYear || ''}`;
  
  if (bannerImage) {
    if (featuredGame.imageUrl) {
      bannerImage.src = featuredGame.imageUrl;
    } else {
      bannerImage.src = 'img/tof_icon.png'; // Fallback
    }
  }

  // Click handler to show Past Games View
  gotmBanner.onclick = () => showPastGames();
  
  gotmBanner.classList.remove('hidden');
}

// Show Past Games View
function showPastGames() {
  const gameListView = document.getElementById('gameListView');
  const gameDetailView = document.getElementById('gameDetailView');
  const pastGamesView = document.getElementById('pastGamesView');

  if (gameListView) gameListView.classList.add('hidden');
  if (gameDetailView) gameDetailView.classList.add('hidden');
  if (pastGamesView) pastGamesView.classList.remove('hidden');

  window.scrollTo(0, 0);
}

// Load and display past featured games
async function loadPastFeaturedGames() {
  try {
    const pastGamesGrid = document.getElementById('pastGamesGrid');
    if (!pastGamesGrid) return;

    // Query the featuredGamesHistory collection
    // We order by featuredAt descending to get the most recent assignments first
    const snapshot = await db.collection('featuredGamesHistory')
      .orderBy('featuredAt', 'desc')
      .get();

    if (snapshot.empty) {
      pastGamesGrid.innerHTML = '<p class="text-center py-12" style="grid-column: 1 / -1;">No past featured games found.</p>';
      return;
    }

    pastGamesGrid.innerHTML = '';
    
    // Map to track the most recent game for each month/year combination
    // Since we ordered by featuredAt desc, the first one we see for a month is the latest
    const seenMonths = new Set();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const monthYearKey = `${data.month}-${data.year}`.toLowerCase();
      
      // Overwrite/Skip logic: if we've already seen this month, skip subsequent (older) entries
      if (seenMonths.has(monthYearKey)) return;
      seenMonths.add(monthYearKey);

      // Find the full game data from allGames to render the standard card
      const game = allGames.find(g => g.id === data.gameId);
      
      if (game) {
        // Clone the game object and ensure it shows as GOTM for the card rendering
        // We also attach the specific month/year from history so it can be displayed
        const gameForCard = { 
          ...game, 
          isFeaturedGameOfMonth: true,
          featuredMonth: data.month,
          featuredYear: data.year
        };
        
        const card = createGameCard(gameForCard);
        pastGamesGrid.appendChild(card);
      }
    });

    if (pastGamesGrid.children.length === 0) {
      pastGamesGrid.innerHTML = '<p class="text-center py-12" style="grid-column: 1 / -1;">No past featured games found.</p>';
    }
  } catch (error) {
    console.error('Error loading past featured games:', error);
  }
}

// Populate checkbox groups
function populateCheckboxes() {
  const containers = [
    { id: 'categoriesCheckboxes', items: allCategories, type: 'category', dataType: 'categories' },
    { id: 'categoriesCheckboxesMobile', items: allCategories, type: 'category', dataType: 'categories-mobile' },
    { id: 'mechanicsCheckboxes', items: allMechanics, type: 'mechanic', dataType: 'mechanics' },
    { id: 'mechanicsCheckboxesMobile', items: allMechanics, type: 'mechanic', dataType: 'mechanics-mobile' }
  ];

  containers.forEach(({ id, items, type, dataType }) => {
    const container = document.getElementById(id);
    if (!container) return;

    container.innerHTML = items.map((item, index) => `
      <label class="checkbox-label ${index >= VISIBLE_CHECKBOX_COUNT ? 'hidden-checkbox' : ''}" data-item="${item.toLowerCase()}">
        <input type="checkbox" value="${item}" data-type="${type}" class="filter-checkbox" />
        <span class="checkbox-text">${item}</span>
      </label>
    `).join('');

    // Add event listeners to checkboxes
    container.querySelectorAll('.filter-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        handleCheckboxChange(e, type, id.includes('Mobile'));
      });
    });

    // Setup show more button
    const showMoreBtn = document.querySelector(`button[data-target="${dataType}"]`);
    if (showMoreBtn && items.length > VISIBLE_CHECKBOX_COUNT) {
      showMoreBtn.classList.remove('hidden');
      showMoreBtn.addEventListener('click', () => toggleShowMore(dataType, showMoreBtn));
    }
  });

  // Setup checkbox search
  setupCheckboxSearch();
}

// Toggle show more/less for checkbox groups
function toggleShowMore(dataType, button) {
  const container = document.querySelector(`[data-type="${dataType}"]`);
  if (!container) return;

  const isExpanded = container.classList.contains('expanded');

  if (isExpanded) {
    container.classList.remove('expanded');
    container.querySelectorAll('.hidden-checkbox').forEach(label => {
      label.style.display = 'none';
    });
    button.textContent = 'Show more';
  } else {
    container.classList.add('expanded');
    container.querySelectorAll('.hidden-checkbox').forEach(label => {
      label.style.display = 'flex';
    });
    button.textContent = 'Show less';
  }
}

// Setup checkbox search functionality
function setupCheckboxSearch() {
  const searchInputs = [
    { input: categoriesSearch, containerId: 'categoriesCheckboxes', dataType: 'categories' },
    { input: categoriesSearchMobile, containerId: 'categoriesCheckboxesMobile', dataType: 'categories-mobile' },
    { input: mechanicsSearch, containerId: 'mechanicsCheckboxes', dataType: 'mechanics' },
    { input: mechanicsSearchMobile, containerId: 'mechanicsCheckboxesMobile', dataType: 'mechanics-mobile' }
  ];

  searchInputs.forEach(({ input, containerId, dataType }) => {
    if (!input) return;

    input.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      const container = document.getElementById(containerId);
      const showMoreBtn = document.querySelector(`button[data-target="${dataType}"]`);

      if (!container) return;

      const labels = container.querySelectorAll('.checkbox-label');

      if (searchTerm === '') {
        // Reset to default view
        labels.forEach((label, index) => {
          const isHiddenByDefault = index >= VISIBLE_CHECKBOX_COUNT;
          const isExpanded = container.classList.contains('expanded');

          if (isHiddenByDefault && !isExpanded) {
            label.style.display = 'none';
          } else {
            label.style.display = 'flex';
          }
        });
        if (showMoreBtn) showMoreBtn.style.display = '';
      } else {
        // Filter by search term
        labels.forEach(label => {
          const itemName = label.getAttribute('data-item');
          if (itemName.includes(searchTerm)) {
            label.style.display = 'flex';
          } else {
            label.style.display = 'none';
          }
        });
        // Hide show more button when searching
        if (showMoreBtn) showMoreBtn.style.display = 'none';
      }
    });
  });
}

// Handle checkbox changes
function handleCheckboxChange(e, type, isMobile) {
  const value = e.target.value;
  const isChecked = e.target.checked;

  if (type === 'category') {
    if (isChecked && !selectedCategories.includes(value)) {
      selectedCategories.push(value);
    } else if (!isChecked) {
      selectedCategories = selectedCategories.filter(c => c !== value);
    }
  } else if (type === 'mechanic') {
    if (isChecked && !selectedMechanics.includes(value)) {
      selectedMechanics.push(value);
    } else if (!isChecked) {
      selectedMechanics = selectedMechanics.filter(m => m !== value);
    }
  }

  // Sync checkboxes between desktop and mobile
  syncCheckboxes(type, value, isChecked, isMobile);

  // Apply filters immediately for desktop, wait for apply button on mobile
  if (!isMobile) {
    applyFilters();
  }
}

// Sync checkboxes between desktop and mobile
function syncCheckboxes(type, value, isChecked, fromMobile) {
  const desktopContainer = type === 'category' ? 'categoriesCheckboxes' : 'mechanicsCheckboxes';
  const mobileContainer = type === 'category' ? 'categoriesCheckboxesMobile' : 'mechanicsCheckboxesMobile';
  const targetContainer = fromMobile ? desktopContainer : mobileContainer;

  const container = document.getElementById(targetContainer);
  if (!container) return;

  const checkbox = container.querySelector(`input[value="${value}"]`);
  if (checkbox) {
    checkbox.checked = isChecked;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Desktop filters
  searchInput.addEventListener('input', debounce(applyFilters, 300));
  playerMinFilter.addEventListener('input', debounce(applyFilters, 300));
  playerMaxFilter.addEventListener('input', debounce(applyFilters, 300));
  modeFilter.addEventListener('change', applyFilters);
  categoryFilter.addEventListener('change', applyFilters);
  complexityFilter.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', () => {
    sortGames();
    renderGames();
  });
  resetFiltersBtn.addEventListener('click', resetFilters);

  // Mobile filter overlay toggle
  if (filterToggleBtn) {
    filterToggleBtn.addEventListener('click', openFilterOverlay);
  }
  if (closeFilterOverlayBtn) {
    closeFilterOverlayBtn.addEventListener('click', closeFilterOverlay);
  }
  if (filterOverlay) {
    filterOverlay.addEventListener('click', (e) => {
      if (e.target === filterOverlay) closeFilterOverlay();
    });
  }

  // Mobile filter buttons
  if (applyFiltersMobileBtn) {
    applyFiltersMobileBtn.addEventListener('click', () => {
      applyMobileFilters();
      closeFilterOverlay();
    });
  }
  if (resetFiltersMobileBtn) {
    resetFiltersMobileBtn.addEventListener('click', resetMobileFilters);
  }
}

// Open filter overlay
function openFilterOverlay() {
  filterOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Sync mobile filters with current state
  syncMobileFiltersFromState();
}

// Close filter overlay
function closeFilterOverlay() {
  filterOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// Sync mobile filters from current state
function syncMobileFiltersFromState() {
  if (playerMinMobile) playerMinMobile.value = playerMinFilter.value;
  if (playerMaxMobile) playerMaxMobile.value = playerMaxFilter.value;
  if (modeFilterMobile) modeFilterMobile.value = modeFilter.value;
  if (categoryFilterMobile) categoryFilterMobile.value = categoryFilter.value;
  if (complexityFilterMobile) complexityFilterMobile.value = complexityFilter.value;
  if (sortSelectMobile) sortSelectMobile.value = sortSelect.value;
}

// Apply mobile filters to desktop and trigger filter
function applyMobileFilters() {
  // Sync select values from mobile to desktop
  if (playerMinMobile) playerMinFilter.value = playerMinMobile.value;
  if (playerMaxMobile) playerMaxFilter.value = playerMaxMobile.value;
  if (modeFilterMobile) modeFilter.value = modeFilterMobile.value;
  if (categoryFilterMobile) categoryFilter.value = categoryFilterMobile.value;
  if (complexityFilterMobile) complexityFilter.value = complexityFilterMobile.value;
  if (sortSelectMobile) sortSelect.value = sortSelectMobile.value;

  // Apply filters
  sortGames();
  applyFilters();
}

// Reset mobile filters
function resetMobileFilters() {
  // Reset mobile selects
  if (playerMinMobile) playerMinMobile.value = '';
  if (playerMaxMobile) playerMaxMobile.value = '';
  if (modeFilterMobile) modeFilterMobile.value = '';
  if (categoryFilterMobile) categoryFilterMobile.value = '';
  if (complexityFilterMobile) complexityFilterMobile.value = '';
  if (sortSelectMobile) sortSelectMobile.value = 'title';

  // Reset mobile checkboxes
  const mobileCheckboxes = document.querySelectorAll('#categoriesCheckboxesMobile input, #mechanicsCheckboxesMobile input');
  mobileCheckboxes.forEach(cb => cb.checked = false);

  // Reset selected arrays
  selectedCategories = [];
  selectedMechanics = [];

  // Sync to desktop
  const desktopCheckboxes = document.querySelectorAll('#categoriesCheckboxes input, #mechanicsCheckboxes input');
  desktopCheckboxes.forEach(cb => cb.checked = false);

  // Reset search inputs
  if (categoriesSearchMobile) categoriesSearchMobile.value = '';
  if (mechanicsSearchMobile) mechanicsSearchMobile.value = '';
}

// Apply filters
function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const playerMin = parseInt(playerMinFilter.value) || 0;
  const playerMax = parseInt(playerMaxFilter.value) || 0;
  const mode = modeFilter.value;
  const inventoryCategory = categoryFilter.value;
  const complexity = complexityFilter.value;

  filteredGames = allGames.filter(game => {
    // Search filter
    if (searchTerm) {
      const searchIndex = game.searchIndex || '';
      if (!searchIndex.includes(searchTerm)) {
        return false;
      }
    }

    // Player count filter (min/max range)
    // Logic: Show games that can accommodate the player range specified
    // - If user sets min=6, game must support at least 6 players (game.playerCountMax >= 6)
    // - If user sets max=4, game must support playing with 4 or fewer (game.playerCountMin <= 4)
    if (playerMin > 0 || playerMax > 0) {
      const gameMin = game.playerCountMin || 0;
      const gameMaxRaw = game.playerCountMax;
      // Handle "+" notation (e.g., "10+") - treat as high number
      let gameMax = 0;
      if (typeof gameMaxRaw === 'string' && gameMaxRaw.includes('+')) {
        gameMax = 99; // Treat "+" as unlimited
      } else {
        gameMax = parseInt(gameMaxRaw) || gameMin;
      }

      // If user specified a minimum, game must support at least that many players
      if (playerMin > 0 && gameMax < playerMin) {
        return false;
      }

      // If user specified a maximum, game must be playable with that few players
      if (playerMax > 0 && gameMin > playerMax) {
        return false;
      }
    }

    // Game mode filter
    if (mode) {
      const gameMode = game.gameMode || '';
      if (!gameMode.toLowerCase().includes(mode.toLowerCase())) {
        return false;
      }
    }

    // Inventory category filter (Base Game / Expansion)
    if (inventoryCategory) {
      if (game.inventoryCategory !== inventoryCategory) {
        return false;
      }
    }

    // Complexity filter
    if (complexity) {
      const gameComplexity = parseFloat(game.complexity);
      if (isNaN(gameComplexity)) {
        return false; // No complexity data, exclude from filtered results
      }
      if (complexity === 'light' && (gameComplexity < 1 || gameComplexity >= 2)) {
        return false;
      } else if (complexity === 'medium-light' && (gameComplexity < 2 || gameComplexity >= 3)) {
        return false;
      } else if (complexity === 'medium' && (gameComplexity < 3 || gameComplexity >= 4)) {
        return false;
      } else if (complexity === 'heavy' && gameComplexity < 4) {
        return false;
      }
    }

    // Categories filter (OR logic - game must have at least one selected category)
    if (selectedCategories.length > 0) {
      const gameCategories = game.categories || [];
      const hasMatchingCategory = selectedCategories.some(cat => gameCategories.includes(cat));
      if (!hasMatchingCategory) {
        return false;
      }
    }

    // Mechanics filter (OR logic - game must have at least one selected mechanic)
    if (selectedMechanics.length > 0) {
      const gameMechanics = game.mechanics || [];
      const hasMatchingMechanic = selectedMechanics.some(mech => gameMechanics.includes(mech));
      if (!hasMatchingMechanic) {
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
    // Priority 1: Featured Game of the Month always first
    const aIsFeatured = a.isFeaturedGameOfMonth === true;
    const bIsFeatured = b.isFeaturedGameOfMonth === true;
    if (aIsFeatured && !bIsFeatured) return -1;
    if (!aIsFeatured && bIsFeatured) return 1;

    // Priority 2: Staff Recommended games next
    const aIsStaffPick = a.staffRecommendations && a.staffRecommendations.length > 0;
    const bIsStaffPick = b.staffRecommendations && b.staffRecommendations.length > 0;
    if (aIsStaffPick && !bIsStaffPick) return -1;
    if (!aIsStaffPick && bIsStaffPick) return 1;

    // Priority 3: Regular sort criteria
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
  playerMinFilter.value = '';
  playerMaxFilter.value = '';
  modeFilter.value = '';
  categoryFilter.value = '';
  complexityFilter.value = '';
  sortSelect.value = 'title';

  // Reset categories and mechanics
  selectedCategories = [];
  selectedMechanics = [];

  // Uncheck all checkboxes
  const allCheckboxes = document.querySelectorAll('.filter-checkbox');
  allCheckboxes.forEach(cb => cb.checked = false);

  // Reset search inputs
  if (categoriesSearch) categoriesSearch.value = '';
  if (mechanicsSearch) mechanicsSearch.value = '';

  // Reset show more buttons and visibility
  document.querySelectorAll('.checkbox-group').forEach(container => {
    container.classList.remove('expanded');
    container.querySelectorAll('.hidden-checkbox').forEach(label => {
      label.style.display = 'none';
    });
  });
  document.querySelectorAll('.show-more-btn').forEach(btn => {
    btn.textContent = 'Show more';
    btn.style.display = '';
  });

  applyFilters();
}

// Render games
function renderGames() {
  gamesGrid.innerHTML = '';

  if (filteredGames.length === 0) {
    noResults.classList.remove('hidden');
    resultsCount.classList.add('hidden');

    // Show staff picks suggestions when no results found
    renderStaffPicksSuggestion();
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

// Render staff picks suggestion when no results found
function renderStaffPicksSuggestion() {
  // Get staff recommended games
  const staffPicks = allGames.filter(g =>
    g.staffRecommendations && g.staffRecommendations.length > 0
  ).slice(0, 4);

  if (staffPicks.length === 0) return;

  // Remove any existing suggestion
  const existingSuggestion = document.querySelector('.staff-picks-suggestion');
  if (existingSuggestion) {
    existingSuggestion.remove();
  }

  // Create suggestion container
  const suggestionContainer = document.createElement('div');
  suggestionContainer.className = 'staff-picks-suggestion';
  suggestionContainer.innerHTML = `
    <div class="staff-picks-suggestion-header">
      <h3 class="staff-picks-suggestion-title">
        <span class="iconify" data-icon="ant-design:star-filled"></span>
        Check Out Our Staff Picks
      </h3>
      <p class="staff-picks-suggestion-subtitle">Hand-picked recommendations from our team</p>
    </div>
    <div class="staff-picks-grid"></div>
  `;

  const grid = suggestionContainer.querySelector('.staff-picks-grid');

  staffPicks.forEach(game => {
    const card = createGameCard(game);
    grid.appendChild(card);
  });

  // Append after noResults
  noResults.appendChild(suggestionContainer);
}

// Create game card
function createGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card';
  card.onclick = () => showGameDetail(game);

  const playerInfo = formatPlayerCount(game.playerCountMin, game.playerCountMax);
  const timeInfo = formatPlayTime(game.playTimeMin, game.playTimeMax);

  // Rank Badge logic
  const rankBadgeHTML = (game.bggRank && game.bggRank <= 100) 
    ? `<div class="rank-badge">Rank - ${game.bggRank} on BGG</div>` 
    : '';

  // Status Badges logic
  let statusBadgesHTML = '';
  if (game.quantityLibrary > 0 || game.quantityRetail > 0) {
    statusBadgesHTML = '<div class="status-badge-container">';
    if (game.quantityLibrary > 0) {
      statusBadgesHTML += '<div class="status-badge library">In Library</div>';
    }
    if (game.quantityRetail > 0) {
      statusBadgesHTML += '<div class="status-badge retail">For Sale</div>';
    }
    statusBadgesHTML += '</div>';
  }

  // Staff Pick and GOTM chip logic (for meta section)
  const isStaffPick = game.staffRecommendations && game.staffRecommendations.length > 0;
  const isFeaturedGOTM = game.isFeaturedGameOfMonth === true;

  card.innerHTML = `
    <div class="game-image">
      ${rankBadgeHTML}
      ${statusBadgesHTML}
      ${game.imageUrl ?
        `<img src="${game.imageUrl}" alt="${game.title}" loading="lazy" />` :
        '<div class="game-image-placeholder"><span class="iconify" data-icon="ant-design:trophy-outlined" style="font-size: 3rem;"></span></div>'
      }
    </div>
    <h3 class="game-title">${game.title || 'Untitled Game'}</h3>
    <p class="game-publisher">${game.publisher || 'Unknown Publisher'}</p>
    <div class="game-meta">
      ${isFeaturedGOTM ? `<span class="meta-badge gotm"><span class="iconify" data-icon="ant-design:trophy-filled"></span> Game of the Month</span>` : ''}
      ${isStaffPick ? `<span class="meta-badge staff-pick"><span class="iconify" data-icon="ant-design:star-filled"></span> Staff Pick</span>` : ''}
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

  // Prepare images for slider
  const images = game.images && game.images.length > 0 ? game.images : (game.imageUrl ? [game.imageUrl] : []);

  // Rank Badge logic
  const rankBadgeHTML = (game.bggRank && game.bggRank <= 100) 
    ? `<div class="rank-badge">Rank - ${game.bggRank} on BGG</div>` 
    : '';

  // Status Badges logic
  let statusBadgesHTML = '';
  if (game.quantityLibrary > 0 || game.quantityRetail > 0) {
    statusBadgesHTML = '<div class="status-badge-container">';
    if (game.quantityLibrary > 0) {
      statusBadgesHTML += '<div class="status-badge library">In Library</div>';
    }
    if (game.quantityRetail > 0) {
      statusBadgesHTML += '<div class="status-badge retail">For Sale</div>';
    }
    statusBadgesHTML += '</div>';
  }

  let imageSectionHTML = '';

  if (images.length > 1) {
    // Slider HTML
    imageSectionHTML = `
      <div class="detail-game-image-container">
        ${rankBadgeHTML}
        ${statusBadgesHTML}
        <div class="detail-game-image" id="gameImageSlider">
          <img src="${images[0]}" alt="${game.title}" id="sliderImage" />
        </div>
        <button class="slider-btn prev" id="prevBtn">&#10094;</button>
        <button class="slider-btn next" id="nextBtn">&#10095;</button>
        <div class="slider-dots" id="sliderDots">
          ${images.map((_, index) => `<span class="slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`).join('')}
        </div>
      </div>
    `;
  } else if (images.length === 1) {
    // Single Image HTML
    imageSectionHTML = `
      <div class="detail-game-image-container">
        ${rankBadgeHTML}
        ${statusBadgesHTML}
        <div class="detail-game-image">
          <img src="${images[0]}" alt="${game.title}" />
        </div>
      </div>
    `;
  } else {
    // Placeholder HTML
    imageSectionHTML = '';
  }

  gameDetailContent.innerHTML = `
    <div class="detail-container">
      <h2 class="detail-game-title">${game.title || 'Untitled Game'}</h2>
      <p class="detail-game-publisher">${game.publisher || 'Unknown Publisher'}</p>

      ${imageSectionHTML}

      ${game.description ? `
        <div class="detail-section">
          <div class="detail-label">Description</div>
          <div class="detail-value">${game.description}</div>
        </div>
      ` : ''}

      <div class="detail-grid">
        ${game.isFeaturedGameOfMonth ? `
          <div class="detail-item detail-item-gotm">
            <div class="detail-item-label">Featured</div>
            <div class="detail-item-value">
              <span class="iconify" data-icon="ant-design:trophy-filled"></span> Game of the Month
              ${game.featuredMonth ? `<div style="font-size: 0.8em; font-weight: normal; margin-top: 4px;">${game.featuredMonth}${game.featuredYear ? ` ${game.featuredYear}` : ''}</div>` : ''}
            </div>
          </div>
        ` : ''}
        ${(game.staffRecommendations && game.staffRecommendations.length > 0) ? `
          <div class="detail-item detail-item-staff-pick">
            <div class="detail-item-label">Recommended</div>
            <div class="detail-item-value">
              <span class="iconify" data-icon="ant-design:star-filled"></span> Staff Pick
              <div style="font-size: 0.8em; font-weight: normal; margin-top: 4px;">${game.staffRecommendations.length} staff recommendation${game.staffRecommendations.length > 1 ? 's' : ''}</div>
            </div>
          </div>
        ` : ''}
        ${playerInfo ? `
          <div class="detail-item clickable-filter" data-filter-type="players" data-filter-value="${game.playerCountMin}">
            <div class="detail-item-label">Players</div>
            <div class="detail-item-value">
              <span class="iconify" data-icon="ant-design:team-outlined"></span> ${playerInfo}
              ${game.recommendedPlayers ? `<div style="font-size: 0.8em; font-weight: normal; margin-top: 4px; color: var(--accent);">Best: ${game.recommendedPlayers}</div>` : ''}
            </div>
          </div>
        ` : ''}
        ${timeInfo ? `
          <div class="detail-item clickable-filter" data-filter-type="playtime" data-filter-value="${game.playTimeMin}">
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
          <div class="detail-item clickable-filter" data-filter-type="inventory" data-filter-value="${game.inventoryCategory}">
            <div class="detail-item-label">Inventory</div>
            <div class="detail-item-value">${game.inventoryCategory}</div>
          </div>
        ` : ''}
      </div>

      ${(game.categories && game.categories.length > 0) ? `
        <div class="detail-section">
          <div class="detail-label">Categories</div>
          <div class="detail-value detail-pills">
            ${Array.isArray(game.categories)
              ? game.categories.map(c => `<span class="meta-badge clickable-pill" data-filter-type="category" data-filter-value="${c}">${c}</span>`).join(' ')
              : game.categories}
          </div>
        </div>
      ` : ''}

      ${(game.mechanics && game.mechanics.length > 0) || game.gameMechanics ? `
        <div class="detail-section">
          <div class="detail-label">Mechanics</div>
          <div class="detail-value detail-pills">
            ${game.mechanics && Array.isArray(game.mechanics)
              ? game.mechanics.map(m => `<span class="meta-badge clickable-pill" data-filter-type="mechanic" data-filter-value="${m}">${m}</span>`).join(' ')
              : (game.gameMechanics || '')}
          </div>
        </div>
      ` : ''}

      ${game.gameMode ? `
        <div class="detail-section">
          <div class="detail-label">Game Mode</div>
          <div class="detail-value">
            <span class="meta-badge clickable-pill" data-filter-type="mode" data-filter-value="${game.gameMode}">${game.gameMode}</span>
          </div>
        </div>
      ` : ''}

      ${game.theme ? `
        <div class="detail-section">
          <div class="detail-label">Theme</div>
          <div class="detail-value">${game.theme}</div>
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

      ${(game.staffRecommendations && game.staffRecommendations.length > 0) ? `
        <div class="detail-section staff-recommendations-section">
          <div class="detail-label">
            <span class="iconify" data-icon="ant-design:star-filled"></span>
            Why Our Staff Recommends This
          </div>
          <div class="staff-recommendations-list">
            ${game.staffRecommendations.map(rec => `
              <div class="staff-recommendation-item">
                <div class="staff-name">${rec.staffName || 'Staff Member'}</div>
                <div class="staff-reason">"${rec.reason || 'A great game!'}"</div>
              </div>
            `).join('')}
          </div>
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

  // Initialize Slider Logic if multiple images exist
  if (images.length > 1) {
    let currentImageIndex = 0;
    const sliderImage = document.getElementById('sliderImage');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dots = document.querySelectorAll('.slider-dot');

    const updateSlider = (index) => {
      sliderImage.style.opacity = '0';
      setTimeout(() => {
        sliderImage.src = images[index];
        sliderImage.style.opacity = '1';
      }, 300);

      dots.forEach(dot => dot.classList.remove('active'));
      dots[index].classList.add('active');
      currentImageIndex = index;
    };

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let newIndex = currentImageIndex - 1;
      if (newIndex < 0) newIndex = images.length - 1;
      updateSlider(newIndex);
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let newIndex = currentImageIndex + 1;
      if (newIndex >= images.length) newIndex = 0;
      updateSlider(newIndex);
    });

    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(e.target.dataset.index);
        updateSlider(index);
      });
    });
  }

  // Hide list, show detail
  gameListView.classList.add('hidden');
  gameDetailView.classList.remove('hidden');

  // Add click handlers for filter pills
  setupDetailFilterClicks();

  // Render similar games
  renderSimilarGames(game);

  // Scroll to top
  window.scrollTo(0, 0);
}

// Setup click handlers for filter pills in detail view
function setupDetailFilterClicks() {
  // Clickable pills (categories, mechanics, game mode)
  document.querySelectorAll('.clickable-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const filterType = pill.getAttribute('data-filter-type');
      const filterValue = pill.getAttribute('data-filter-value');
      filterAndShowList(filterType, filterValue);
    });
  });

  // Clickable detail items (players, playtime, inventory)
  document.querySelectorAll('.clickable-filter').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const filterType = item.getAttribute('data-filter-type');
      const filterValue = item.getAttribute('data-filter-value');
      filterAndShowList(filterType, filterValue);
    });
  });
}

// Apply filter and show list view
function filterAndShowList(filterType, filterValue) {
  // Reset all filters first
  resetFilters();

  // Apply the specific filter
  switch (filterType) {
    case 'category':
      selectedCategories = [filterValue];
      // Check the checkbox
      const categoryCheckbox = document.querySelector(`#categoriesCheckboxes input[value="${filterValue}"]`);
      if (categoryCheckbox) categoryCheckbox.checked = true;
      const categoryCheckboxMobile = document.querySelector(`#categoriesCheckboxesMobile input[value="${filterValue}"]`);
      if (categoryCheckboxMobile) categoryCheckboxMobile.checked = true;
      break;

    case 'mechanic':
      selectedMechanics = [filterValue];
      // Check the checkbox
      const mechanicCheckbox = document.querySelector(`#mechanicsCheckboxes input[value="${filterValue}"]`);
      if (mechanicCheckbox) mechanicCheckbox.checked = true;
      const mechanicCheckboxMobile = document.querySelector(`#mechanicsCheckboxesMobile input[value="${filterValue}"]`);
      if (mechanicCheckboxMobile) mechanicCheckboxMobile.checked = true;
      break;

    case 'mode':
      modeFilter.value = filterValue;
      if (modeFilterMobile) modeFilterMobile.value = filterValue;
      break;

    case 'players':
      // Set both min and max to the game's min player count to show similar games
      const playerCount = parseInt(filterValue);
      playerMinFilter.value = playerCount;
      playerMaxFilter.value = '';
      if (playerMinMobile) playerMinMobile.value = playerCount;
      if (playerMaxMobile) playerMaxMobile.value = '';
      break;

    case 'playtime':
      sortSelect.value = 'playTimeMin';
      if (sortSelectMobile) sortSelectMobile.value = 'playTimeMin';
      break;

    case 'inventory':
      categoryFilter.value = filterValue;
      if (categoryFilterMobile) categoryFilterMobile.value = filterValue;
      break;
  }

  // Apply filters and show list
  applyFilters();
  showGameList();
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

    const rankBadgeHTML = (game.bggRank && game.bggRank <= 100) 
      ? `<div class="rank-badge" style="font-size: 0.6rem; padding: 2px 6px;">#${game.bggRank} on BGG</div>` 
      : '';

    // Status Badges logic
    let statusBadgesHTML = '';
    if (game.quantityLibrary > 0 || game.quantityRetail > 0) {
      statusBadgesHTML = '<div class="status-badge-container" style="top: 4px; left: 4px;">';
      if (game.quantityLibrary > 0) {
        statusBadgesHTML += '<div class="status-badge library" style="font-size: 0.6rem; padding: 2px 6px;">In Library</div>';
      }
      if (game.quantityRetail > 0) {
        statusBadgesHTML += '<div class="status-badge retail" style="font-size: 0.6rem; padding: 2px 6px;">For Sale</div>';
      }
      statusBadgesHTML += '</div>';
    }

    similarGamesHTML += `
      <div class="similar-game-card" data-game-id="${game.id}">
        <div class="similar-game-image">
          ${rankBadgeHTML}
          ${statusBadgesHTML}
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
  const pastGamesView = document.getElementById('pastGamesView');

  if (gameDetailView) gameDetailView.classList.add('hidden');
  if (pastGamesView) pastGamesView.classList.add('hidden');
  if (gameListView) gameListView.classList.remove('hidden');

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
    const pastGamesView = document.getElementById('pastGamesView');
    const surveyModal = document.getElementById('surveyModal');

    // Close survey modal first if open
    if (surveyModal && !surveyModal.classList.contains('hidden')) {
      closeSurveyModal();
      return;
    }

    if ((gameDetailView && !gameDetailView.classList.contains('hidden')) ||
        (pastGamesView && !pastGamesView.classList.contains('hidden'))) {
      showGameList();
    }
  }
});

// ========== "What to Play" Survey ==========

// Survey Questions Data
const surveyQuestions = [
  {
    id: 'groupSize',
    title: 'How big is your group?',
    options: [
      { value: '1', label: 'Solo', desc: 'Just me, myself, and I' },
      { value: '2', label: '2 Players', desc: 'A cozy duo' },
      { value: '3-4', label: '3-4 Players', desc: 'A small group of friends' },
      { value: '5-6', label: '5-6 Players', desc: 'A bigger gathering' },
      { value: '7+', label: '7+ Players', desc: 'Party time!' }
    ]
  },
  {
    id: 'timeAvailable',
    title: 'How much time do you have?',
    options: [
      { value: 'quick', label: 'Quick Game', desc: 'Under 30 minutes' },
      { value: 'medium', label: 'Medium Length', desc: '30-60 minutes' },
      { value: 'long', label: 'Longer Session', desc: '1-2 hours' },
      { value: 'epic', label: 'Epic Adventure', desc: '2+ hours' }
    ]
  },
  {
    id: 'mood',
    title: 'What\'s the vibe you\'re going for?',
    options: [
      { value: 'competitive', label: 'Competitive', desc: 'Battle it out, winner takes all!' },
      { value: 'cooperative', label: 'Cooperative', desc: 'Work together as a team' },
      { value: 'social', label: 'Social/Party', desc: 'Laughs and casual fun' },
      { value: 'strategic', label: 'Strategic', desc: 'Deep thinking and planning' }
    ]
  },
  {
    id: 'complexity',
    title: 'How complex should the game be?',
    options: [
      { value: 'light', label: 'Easy to Learn', desc: 'Simple rules, quick to start' },
      { value: 'medium-light', label: 'Some Strategy', desc: 'A bit more to think about' },
      { value: 'medium', label: 'Medium Complexity', desc: 'Satisfying depth' },
      { value: 'heavy', label: 'Brain Burner', desc: 'Complex and challenging' }
    ]
  },
  {
    id: 'experience',
    title: 'What type of experience are you looking for?',
    options: [
      { value: 'party', label: 'Party/Social', desc: 'Fun games for groups' },
      { value: 'strategy', label: 'Strategy', desc: 'Outwit your opponents' },
      { value: 'adventure', label: 'Adventure', desc: 'Explore and discover' },
      { value: 'any', label: 'Surprise Me!', desc: 'Open to anything' }
    ]
  },
  {
    id: 'familiar',
    title: 'How familiar are you with board games?',
    options: [
      { value: 'beginner', label: 'Just Starting Out', desc: 'New to modern board games' },
      { value: 'casual', label: 'Casual Player', desc: 'Play occasionally for fun' },
      { value: 'regular', label: 'Regular Gamer', desc: 'Play often, know many games' },
      { value: 'enthusiast', label: 'Board Game Enthusiast', desc: 'Experienced and adventurous' }
    ]
  }
];

// Survey State
let currentQuestionIndex = 0;
let surveyAnswers = {};
let matchedGame = null;

// Survey DOM Elements
const surveyModal = document.getElementById('surveyModal');
const whatToPlayBtn = document.getElementById('whatToPlayBtn');
const closeSurveyBtn = document.getElementById('closeSurveyModal');
const surveyQuestionsContainer = document.getElementById('surveyQuestions');
const surveyProgressBar = document.getElementById('surveyProgressBar');
const surveyProgressText = document.getElementById('surveyProgressText');
const surveyPrevBtn = document.getElementById('surveyPrevBtn');
const surveyNextBtn = document.getElementById('surveyNextBtn');
const surveyResult = document.getElementById('surveyResult');
const surveyNoMatch = document.getElementById('surveyNoMatch');
const surveyNavigation = document.getElementById('surveyNavigation');
const surveyResultCard = document.getElementById('surveyResultCard');
const viewGameBtn = document.getElementById('viewGameBtn');
const restartSurveyBtn = document.getElementById('restartSurveyBtn');
const restartSurveyBtnNoMatch = document.getElementById('restartSurveyBtnNoMatch');

// Initialize Survey
function initSurvey() {
  if (!whatToPlayBtn) return;

  whatToPlayBtn.addEventListener('click', openSurveyModal);
  closeSurveyBtn.addEventListener('click', closeSurveyModal);
  surveyPrevBtn.addEventListener('click', goToPreviousQuestion);
  surveyNextBtn.addEventListener('click', goToNextQuestion);
  viewGameBtn.addEventListener('click', viewMatchedGame);
  restartSurveyBtn.addEventListener('click', restartSurvey);
  restartSurveyBtnNoMatch.addEventListener('click', restartSurvey);

  // Close modal on backdrop click
  surveyModal.addEventListener('click', (e) => {
    if (e.target === surveyModal) closeSurveyModal();
  });

  renderSurveyQuestions();
}

// Open Survey Modal
function openSurveyModal() {
  surveyModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  restartSurvey();
}

// Close Survey Modal
function closeSurveyModal() {
  surveyModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// Render all survey questions
function renderSurveyQuestions() {
  surveyQuestionsContainer.innerHTML = surveyQuestions.map((question, qIndex) => `
    <div class="survey-question ${qIndex === 0 ? 'active' : ''}" data-question="${question.id}">
      <h3 class="survey-question-title">${question.title}</h3>
      <div class="survey-options">
        ${question.options.map(option => `
          <div class="survey-option" data-value="${option.value}" data-question="${question.id}">
            <div class="survey-option-radio"></div>
            <div class="survey-option-content">
              <div class="survey-option-label">${option.label}</div>
              ${option.desc ? `<div class="survey-option-desc">${option.desc}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Add click handlers to options
  document.querySelectorAll('.survey-option').forEach(option => {
    option.addEventListener('click', () => selectOption(option));
  });
}

// Select an option
function selectOption(optionElement) {
  const questionId = optionElement.getAttribute('data-question');
  const value = optionElement.getAttribute('data-value');

  // Remove selection from siblings
  const siblings = optionElement.parentElement.querySelectorAll('.survey-option');
  siblings.forEach(sib => sib.classList.remove('selected'));

  // Select this option
  optionElement.classList.add('selected');
  surveyAnswers[questionId] = value;

  // Enable next button
  surveyNextBtn.disabled = false;
}

// Update progress
function updateProgress() {
  const progress = ((currentQuestionIndex + 1) / surveyQuestions.length) * 100;
  surveyProgressBar.style.width = `${progress}%`;
  surveyProgressText.textContent = `Question ${currentQuestionIndex + 1} of ${surveyQuestions.length}`;
}

// Update navigation buttons
function updateNavigation() {
  surveyPrevBtn.disabled = currentQuestionIndex === 0;

  const currentQuestion = surveyQuestions[currentQuestionIndex];
  const hasAnswer = surveyAnswers[currentQuestion.id];
  surveyNextBtn.disabled = !hasAnswer;

  // Change button text on last question
  if (currentQuestionIndex === surveyQuestions.length - 1) {
    surveyNextBtn.innerHTML = `Find My Game <span class="iconify" data-icon="ant-design:search-outlined"></span>`;
  } else {
    surveyNextBtn.innerHTML = `Next <span class="iconify" data-icon="ant-design:arrow-right-outlined"></span>`;
  }
}

// Show question
function showQuestion(index) {
  const questions = document.querySelectorAll('.survey-question');
  questions.forEach((q, i) => {
    q.classList.toggle('active', i === index);
  });

  // Restore selection if exists
  const currentQuestion = surveyQuestions[index];
  if (surveyAnswers[currentQuestion.id]) {
    const selectedOption = document.querySelector(
      `.survey-option[data-question="${currentQuestion.id}"][data-value="${surveyAnswers[currentQuestion.id]}"]`
    );
    if (selectedOption) {
      selectedOption.classList.add('selected');
    }
  }

  updateProgress();
  updateNavigation();
}

// Go to previous question
function goToPreviousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    showQuestion(currentQuestionIndex);
  }
}

// Go to next question
function goToNextQuestion() {
  if (currentQuestionIndex < surveyQuestions.length - 1) {
    currentQuestionIndex++;
    showQuestion(currentQuestionIndex);
  } else {
    // Last question - find matching game
    findMatchingGame();
  }
}

// Find matching game based on answers
function findMatchingGame() {
  // Hide questions and navigation
  surveyQuestionsContainer.classList.add('hidden');
  surveyNavigation.classList.add('hidden');

  // Score each game based on answers
  const scoredGames = allGames
    .filter(game => game.inventoryCategory === 'Base Game') // Only base games
    .map(game => ({
      game,
      score: calculateGameScore(game)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scoredGames.length > 0) {
    // Pick randomly from top 5 matches for variety
    const topMatches = scoredGames.slice(0, Math.min(5, scoredGames.length));
    const randomIndex = Math.floor(Math.random() * topMatches.length);
    matchedGame = topMatches[randomIndex].game;

    // Show result
    showSurveyResult(matchedGame);
  } else {
    // No match found
    surveyNoMatch.classList.remove('hidden');
    surveyResult.classList.add('hidden');
  }
}

// Calculate match score for a game
function calculateGameScore(game) {
  let score = 0;
  const answers = surveyAnswers;

  // Group Size (weight: 30)
  const groupSize = answers.groupSize;
  const gameMin = game.playerCountMin || 1;
  const gameMaxRaw = game.playerCountMax;
  let gameMax = typeof gameMaxRaw === 'string' && gameMaxRaw.includes('+') ? 99 : (parseInt(gameMaxRaw) || gameMin);

  if (groupSize === '1' && gameMin === 1) {
    score += 30;
  } else if (groupSize === '2' && gameMin <= 2 && gameMax >= 2) {
    score += 30;
  } else if (groupSize === '3-4' && gameMin <= 4 && gameMax >= 3) {
    score += 30;
  } else if (groupSize === '5-6' && gameMin <= 6 && gameMax >= 5) {
    score += 30;
  } else if (groupSize === '7+' && gameMax >= 7) {
    score += 30;
  } else {
    // Partial match if close
    if (groupSize === '7+' && gameMax >= 5) score += 10;
    else if (groupSize === '5-6' && gameMax >= 4) score += 10;
  }

  // Time Available (weight: 20)
  const timeAvailable = answers.timeAvailable;
  const playTimeMin = game.playTimeMin || 0;
  const playTimeMax = parseInt(game.playTimeMax) || playTimeMin;
  const avgTime = (playTimeMin + playTimeMax) / 2;

  if (timeAvailable === 'quick' && avgTime <= 30) {
    score += 20;
  } else if (timeAvailable === 'medium' && avgTime > 20 && avgTime <= 60) {
    score += 20;
  } else if (timeAvailable === 'long' && avgTime > 45 && avgTime <= 120) {
    score += 20;
  } else if (timeAvailable === 'epic' && avgTime > 90) {
    score += 20;
  } else {
    // Partial match
    if (timeAvailable === 'quick' && avgTime <= 45) score += 10;
    else if (timeAvailable === 'medium' && avgTime <= 90) score += 10;
    else if (timeAvailable === 'long' && avgTime > 30) score += 10;
  }

  // Mood/Game Mode (weight: 20)
  const mood = answers.mood;
  const gameMode = (game.gameMode || '').toLowerCase();

  if (mood === 'competitive' && gameMode.includes('competitive')) {
    score += 20;
  } else if (mood === 'cooperative' && (gameMode.includes('cooperative') || gameMode.includes('coop'))) {
    score += 20;
  } else if (mood === 'social' && (gameMode.includes('party') || gameMode.includes('conversation'))) {
    score += 20;
  } else if (mood === 'strategic' && gameMode.includes('competitive')) {
    score += 15; // Strategic often overlaps with competitive
  }

  // Complexity (weight: 15)
  const complexityPref = answers.complexity;
  const gameComplexity = parseFloat(game.complexity) || 0;

  if (complexityPref === 'light' && gameComplexity >= 1 && gameComplexity < 2) {
    score += 15;
  } else if (complexityPref === 'medium-light' && gameComplexity >= 1.5 && gameComplexity < 2.75) {
    score += 15;
  } else if (complexityPref === 'medium' && gameComplexity >= 2.5 && gameComplexity < 3.75) {
    score += 15;
  } else if (complexityPref === 'heavy' && gameComplexity >= 3.5) {
    score += 15;
  } else if (gameComplexity > 0) {
    // Partial match if somewhat close
    score += 5;
  }

  // Experience Type (weight: 10)
  const experience = answers.experience;
  const categories = (game.categories || []).map(c => c.toLowerCase());

  if (experience === 'party' && (categories.some(c => c.includes('party')) || gameMode.includes('party'))) {
    score += 10;
  } else if (experience === 'strategy' && categories.some(c => c.includes('strategy'))) {
    score += 10;
  } else if (experience === 'adventure' && categories.some(c => c.includes('adventure') || c.includes('exploration'))) {
    score += 10;
  } else if (experience === 'any') {
    score += 10; // Open to anything
  }

  // Familiarity bonus (weight: 5)
  const familiar = answers.familiar;

  if (familiar === 'beginner' && gameComplexity < 2) {
    score += 5;
  } else if (familiar === 'casual' && gameComplexity < 2.5) {
    score += 5;
  } else if (familiar === 'regular') {
    score += 5;
  } else if (familiar === 'enthusiast' && gameComplexity >= 2.5) {
    score += 5;
  }

  // Bonus for staff picks and high ratings
  if (game.staffRecommendations && game.staffRecommendations.length > 0) {
    score += 5;
  }
  if (game.rating && game.rating >= 7.5) {
    score += 3;
  }

  return score;
}

// Show survey result
function showSurveyResult(game) {
  surveyResult.classList.remove('hidden');
  surveyNoMatch.classList.add('hidden');

  // Create a mini game card
  const playerInfo = formatPlayerCount(game.playerCountMin, game.playerCountMax);
  const timeInfo = formatPlayTime(game.playTimeMin, game.playTimeMax);
  const isStaffPick = game.staffRecommendations && game.staffRecommendations.length > 0;

  surveyResultCard.innerHTML = `
    <div class="game-card">
      <div class="game-image">
        ${game.imageUrl ?
          `<img src="${game.imageUrl}" alt="${game.title}" />` :
          '<div class="game-image-placeholder"><span class="iconify" data-icon="ant-design:trophy-outlined" style="font-size: 3rem;"></span></div>'
        }
      </div>
      <h3 class="game-title">${game.title || 'Untitled Game'}</h3>
      <p class="game-publisher">${game.publisher || 'Unknown Publisher'}</p>
      <div class="game-meta">
        ${isStaffPick ? `<span class="meta-badge staff-pick"><span class="iconify" data-icon="ant-design:star-filled"></span> Staff Pick</span>` : ''}
        ${playerInfo ? `<span class="meta-badge"><span class="iconify" data-icon="ant-design:team-outlined"></span> ${playerInfo}</span>` : ''}
        ${timeInfo ? `<span class="meta-badge"><span class="iconify" data-icon="ant-design:clock-circle-outlined"></span> ${timeInfo}</span>` : ''}
        ${game.rating ? `<span class="meta-badge rating"><span class="iconify" data-icon="ant-design:star-filled"></span> ${game.rating}</span>` : ''}
      </div>
    </div>
  `;
}

// View matched game details
function viewMatchedGame() {
  if (matchedGame) {
    closeSurveyModal();
    showGameDetail(matchedGame);
  }
}

// Restart survey
function restartSurvey() {
  currentQuestionIndex = 0;
  surveyAnswers = {};
  matchedGame = null;

  // Reset UI
  surveyQuestionsContainer.classList.remove('hidden');
  surveyNavigation.classList.remove('hidden');
  surveyResult.classList.add('hidden');
  surveyNoMatch.classList.add('hidden');

  // Clear selections
  document.querySelectorAll('.survey-option').forEach(opt => opt.classList.remove('selected'));

  // Show first question
  showQuestion(0);
}

// Initialize survey when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Survey init is called after a short delay to ensure allGames is loaded
  setTimeout(initSurvey, 100);
});
