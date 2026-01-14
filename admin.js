// Admin Page Logic - Twist of Fate Board Game Library

// ===== Configuration =====
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
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Admin emails from environment variable
const ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS
  ? import.meta.env.VITE_ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase())
  : [];

// ===== Global State =====
let currentUser = null;
let allGames = [];
let selectedGame = null;
let formMode = 'create'; // 'create' or 'edit'

// ===== DOM Elements =====
const signInScreen = document.getElementById('signInScreen');
const accessDenied = document.getElementById('accessDenied');
const adminInterface = document.getElementById('adminInterface');
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');
const signOutButtonDenied = document.getElementById('signOutButtonDenied');
const deniedEmail = document.getElementById('deniedEmail');
const userEmail = document.getElementById('userEmail');
const gameList = document.getElementById('gameList');
const gameListLoading = document.getElementById('gameListLoading');
const gameSearch = document.getElementById('gameSearch');
const gameForm = document.getElementById('gameForm');
const addNewGameButton = document.getElementById('addNewGameButton');
const saveButton = document.getElementById('saveButtonHeader');
const cancelButton = document.getElementById('cancelButtonHeader');
const deleteButton = document.getElementById('deleteButtonHeader');
const deleteModal = document.getElementById('deleteModal');
const deleteGameTitle = document.getElementById('deleteGameTitle');
const confirmDeleteButton = document.getElementById('confirmDeleteButton');
const cancelDeleteButton = document.getElementById('cancelDeleteButton');
const imageUrlInput = document.getElementById('imageUrl');
const imagePreview = document.getElementById('imagePreview');
const toastContainer = document.getElementById('toastContainer');

// ===== Authentication =====

// Check if email is authorized
function isAuthorizedAdmin(email) {
  if (!email || ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Handle auth state changes
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;

    if (isAuthorizedAdmin(user.email)) {
      showAdminInterface(user);
    } else {
      showAccessDenied(user.email);
    }
  } else {
    currentUser = null;
    showSignInScreen();
  }
});

// Sign in with Google
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    await auth.signInWithPopup(provider);
    // Auth state change will handle the rest
  } catch (error) {
    console.error('Sign-in error:', error);

    if (error.code !== 'auth/popup-closed-by-user') {
      showErrorToast('Sign-in failed. Please try again.');
    }
  }
}

// Sign out
async function signOut() {
  try {
    await auth.signOut();
    // Auth state change will handle the rest
  } catch (error) {
    console.error('Sign-out error:', error);
    showErrorToast('Sign-out failed. Please refresh the page.');
  }
}

// ===== UI State Management =====

function showSignInScreen() {
  signInScreen.classList.remove('hidden');
  accessDenied.classList.add('hidden');
  adminInterface.classList.add('hidden');
}

function showAccessDenied(email) {
  signInScreen.classList.add('hidden');
  accessDenied.classList.remove('hidden');
  adminInterface.classList.add('hidden');
  deniedEmail.textContent = email;
}

function showAdminInterface(user) {
  signInScreen.classList.add('hidden');
  accessDenied.classList.add('hidden');
  adminInterface.classList.remove('hidden');
  userEmail.textContent = user.email;

  // Load games
  loadGames();
}

// ===== Game Loading =====

async function loadGames() {
  try {
    gameListLoading.classList.remove('hidden');
    gameList.innerHTML = '';

    const snapshot = await db.collection('games')
      .orderBy('title')
      .get();

    allGames = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderGameList(allGames);
  } catch (error) {
    console.error('Error loading games:', error);
    showErrorToast('Failed to load games. Please refresh the page.');
  } finally {
    gameListLoading.classList.add('hidden');
  }
}

// ===== Game List Rendering =====

function renderGameList(games) {
  gameList.innerHTML = '';

  if (games.length === 0) {
    gameList.innerHTML = '<div class="loading-state"><p>No games found</p></div>';
    return;
  }

  games.forEach(game => {
    const item = document.createElement('div');
    item.className = 'game-list-item';
    if (selectedGame && selectedGame.id === game.id) {
      item.classList.add('selected');
    }

    item.innerHTML = `
      <div class="game-list-item-title">${game.title || 'Untitled'}</div>
      <div class="game-list-item-meta">${game.publisher || 'Unknown'} • ${game.gameId || 'No ID'}</div>
    `;

    item.addEventListener('click', () => selectGame(game));
    gameList.appendChild(item);
  });
}

// Filter games by search
function filterGames(searchTerm) {
  if (!searchTerm.trim()) {
    renderGameList(allGames);
    return;
  }

  const term = searchTerm.toLowerCase();
  const filtered = allGames.filter(game => {
    const searchableText = [
      game.title,
      game.publisher,
      game.gameId,
      game.theme,
      game.tags
    ].join(' ').toLowerCase();

    return searchableText.includes(term);
  });

  renderGameList(filtered);
}

// ===== Game Selection & Form Management =====

function selectGame(game) {
  selectedGame = game;
  formMode = 'edit';
  setFormData(game);
  updateFormUI();
  renderGameList(allGames); // Re-render to update selection
}

function setFormMode(mode) {
  formMode = mode;
  updateFormUI();
}

function updateFormUI() {
  if (formMode === 'create') {
    deleteButton.classList.add('hidden');
    saveButton.innerHTML = `
      <span class="iconify btn-icon" data-icon="ant-design:save-outlined"></span>
      <span class="btn-text">Create</span>
    `;
  } else {
    deleteButton.classList.remove('hidden');
    saveButton.innerHTML = `
      <span class="iconify btn-icon" data-icon="ant-design:save-outlined"></span>
      <span class="btn-text">Save</span>
    `;
  }
}

function clearForm() {
  gameForm.reset();
  selectedGame = null;
  imagePreview.innerHTML = '<div class="placeholder">🎲 No image</div>';
}

function setFormData(game) {
  // Basic Information
  document.getElementById('title').value = game.title || '';
  document.getElementById('gameId').value = game.gameId || '';
  document.getElementById('publisher').value = game.publisher || '';
  document.getElementById('imageUrl').value = game.imageUrl || '';
  document.getElementById('description').value = game.description || '';

  // Gameplay Details
  document.getElementById('playerCountMin').value = game.playerCountMin || '';
  document.getElementById('playerCountMax').value = game.playerCountMax || '';
  document.getElementById('playTimeMin').value = game.playTimeMin || '';
  document.getElementById('playTimeMax').value = game.playTimeMax || '';
  document.getElementById('age').value = game.age || '';
  document.getElementById('gameMode').value = game.gameMode || '';
  document.getElementById('rating').value = game.rating || '';
  document.getElementById('complexity').value = game.complexity || '';

  // Categorization
  document.getElementById('inventoryCategory').value = game.inventoryCategory || '';
  document.getElementById('type').value = game.type || '';
  document.getElementById('theme').value = game.theme || '';
  document.getElementById('vibe').value = game.vibe || '';
  
  // Handle Mechanics (check both BGG 'mechanics' array and manual 'gameMechanics' string)
  let mechStr = '';
  if (Array.isArray(game.mechanics)) {
    mechStr = game.mechanics.join(', ');
  } else if (game.gameMechanics) {
    mechStr = game.gameMechanics;
  }
  document.getElementById('gameMechanics').value = mechStr;

  // Handle Categories (check BGG 'categories' array)
  let catStr = '';
  if (Array.isArray(game.categories)) {
    catStr = game.categories.join(', ');
  }
  document.getElementById('categories').value = catStr;

  document.getElementById('tags').value = game.tags || '';

  // Inventory & Admin
  document.getElementById('quantityLibrary').value = game.quantityLibrary || '';
  document.getElementById('quantityRetail').value = game.quantityRetail || '';
  document.getElementById('upc').value = game.upc || '';
  document.getElementById('vendor').value = game.vendor || '';
  document.getElementById('purchaseDate').value = game.purchaseDate || '';
  document.getElementById('unitCost').value = game.unitCost || '';
  document.getElementById('rulesUrl').value = game.rulesUrl || '';
  document.getElementById('playTested').value = game.playTested || '';
  document.getElementById('notes').value = game.notes || '';

  // Trigger image preview
  if (game.imageUrl) {
    updateImagePreview(game.imageUrl);
  }
}

function getFormData() {
  return {
    // Basic Information
    title: document.getElementById('title').value.trim(),
    gameId: document.getElementById('gameId').value.trim(),
    publisher: document.getElementById('publisher').value.trim(),
    imageUrl: document.getElementById('imageUrl').value.trim(),
    description: document.getElementById('description').value.trim(),

    // Gameplay Details
    playerCountMin: parseInt(document.getElementById('playerCountMin').value) || 0,
    playerCountMax: document.getElementById('playerCountMax').value.trim(),
    playTimeMin: parseInt(document.getElementById('playTimeMin').value) || 0,
    playTimeMax: parseInt(document.getElementById('playTimeMax').value) || 0,
    age: document.getElementById('age').value.trim(),
    gameMode: document.getElementById('gameMode').value.trim(),
    rating: parseFloat(document.getElementById('rating').value) || 0,
    complexity: document.getElementById('complexity').value.trim(),

    // Categorization
    inventoryCategory: document.getElementById('inventoryCategory').value.trim(),
    type: document.getElementById('type').value.trim(),
    theme: document.getElementById('theme').value.trim(),
    vibe: document.getElementById('vibe').value.trim(),
    
    // Save as arrays
    mechanics: document.getElementById('gameMechanics').value.split(',').map(s => s.trim()).filter(Boolean),
    categories: document.getElementById('categories').value.split(',').map(s => s.trim()).filter(Boolean),
    
    // Legacy support (optional, can keep sending string if other parts of app rely on it)
    gameMechanics: document.getElementById('gameMechanics').value.trim(),
    
    tags: document.getElementById('tags').value.trim(),

    // Inventory & Admin
    quantityLibrary: parseInt(document.getElementById('quantityLibrary').value) || 0,
    quantityRetail: parseInt(document.getElementById('quantityRetail').value) || 0,
    upc: document.getElementById('upc').value.trim(),
    vendor: document.getElementById('vendor').value.trim(),
    purchaseDate: document.getElementById('purchaseDate').value.trim(),
    unitCost: document.getElementById('unitCost').value.trim(),
    rulesUrl: document.getElementById('rulesUrl').value.trim(),
    playTested: document.getElementById('playTested').value.trim(),
    notes: document.getElementById('notes').value.trim()
  };
}

// ===== Form Validation =====

function validateForm(data) {
  const errors = [];

  if (!data.title) {
    errors.push('Game title is required');
  }

  if (!data.gameId) {
    errors.push('Game ID is required');
  }

  if (!data.publisher) {
    errors.push('Publisher is required');
  }

  if (data.playerCountMin && data.playerCountMax) {
    const max = parseInt(data.playerCountMax) || 0;
    if (max > 0 && data.playerCountMin > max) {
      errors.push('Min players cannot be greater than max players');
    }
  }

  if (data.playTimeMin && data.playTimeMax) {
    if (data.playTimeMin > data.playTimeMax) {
      errors.push('Min play time cannot be greater than max play time');
    }
  }

  if (data.rating && (data.rating < 0 || data.rating > 10)) {
    errors.push('Rating must be between 0 and 10');
  }

  return errors;
}

// ===== Search Index Generation =====

function generateSearchIndex(data) {
  const searchableFields = [
    data.title,
    data.publisher,
    data.gameMode,
    data.theme,
    data.tags
  ].filter(Boolean).join(' ').toLowerCase();

  return searchableFields;
}

// ===== CRUD Operations =====

async function createGame(data) {
  try {
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="btn-text">Creating...</span>';

    // Generate search index
    data.searchIndex = generateSearchIndex(data);

    // Add to Firestore
    await db.collection('games').add(data);

    showSuccessToast(`Game "${data.title}" created successfully!`);
    clearForm();
    setFormMode('create');
    await loadGames();

  } catch (error) {
    console.error('Error creating game:', error);

    if (error.code === 'permission-denied') {
      showErrorToast('Permission denied. Please check your authentication.');
    } else {
      showErrorToast('Failed to create game. Please try again.');
    }
  } finally {
    saveButton.disabled = false;
    updateFormUI();
  }
}

async function updateGame(docId, data) {
  try {
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="btn-text">Saving...</span>';

    // Update search index
    data.searchIndex = generateSearchIndex(data);

    // Update in Firestore
    await db.collection('games').doc(docId).update(data);

    showSuccessToast(`Game "${data.title}" updated successfully!`);
    await loadGames();

    // Re-select the game to refresh form
    const updatedGame = allGames.find(g => g.id === docId);
    if (updatedGame) {
      selectGame(updatedGame);
    }

  } catch (error) {
    console.error('Error updating game:', error);

    if (error.code === 'permission-denied') {
      showErrorToast('Permission denied. Please check your authentication.');
    } else if (error.code === 'not-found') {
      showErrorToast('Game not found. It may have been deleted.');
    } else {
      showErrorToast('Failed to update game. Please try again.');
    }
  } finally {
    saveButton.disabled = false;
    updateFormUI();
  }
}

async function deleteGame(docId, title) {
  try {
    confirmDeleteButton.disabled = true;
    confirmDeleteButton.textContent = 'Deleting...';

    await db.collection('games').doc(docId).delete();

    showSuccessToast(`Game "${title}" deleted successfully.`);
    closeDeleteModal();
    clearForm();
    setFormMode('create');
    await loadGames();

  } catch (error) {
    console.error('Error deleting game:', error);

    if (error.code === 'permission-denied') {
      showErrorToast('Permission denied. Please check your authentication.');
    } else {
      showErrorToast('Failed to delete game. Please try again.');
    }
  } finally {
    confirmDeleteButton.disabled = false;
    confirmDeleteButton.textContent = 'Delete';
  }
}

// ===== Image Preview =====

function updateImagePreview(url) {
  if (!url) {
    imagePreview.innerHTML = '<div class="placeholder">🎲 No image</div>';
    return;
  }

  imagePreview.innerHTML = '<div class="loading-spinner"></div>';

  const img = new Image();
  img.onload = () => {
    imagePreview.innerHTML = `<img src="${url}" alt="Preview" />`;
  };
  img.onerror = () => {
    imagePreview.innerHTML = '<p class="error">❌ Invalid image URL</p>';
  };
  img.src = url;
}

// ===== Modal Management =====

function showDeleteModal() {
  if (!selectedGame) return;

  deleteGameTitle.textContent = selectedGame.title;
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  deleteModal.classList.add('hidden');
}

// ===== Toast Notifications =====

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: 'ant-design:check-circle-outlined',
    error: 'ant-design:close-circle-outlined',
    warning: 'ant-design:warning-outlined'
  };

  toast.innerHTML = `
    <span class="iconify toast-icon" data-icon="${icons[type] || icons.success}"></span>
    <div class="toast-message">${message}</div>
  `;

  toastContainer.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function showSuccessToast(message) {
  showToast(message, 'success');
}

function showErrorToast(message) {
  showToast(message, 'error');
}

function showWarningToast(message) {
  showToast(message, 'warning');
}

// ===== Utility Functions =====

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

// ===== Event Listeners =====

// Authentication
signInButton.addEventListener('click', signInWithGoogle);
signOutButton.addEventListener('click', signOut);
signOutButtonDenied.addEventListener('click', signOut);

// Game List
gameSearch.addEventListener('input', debounce((e) => {
  filterGames(e.target.value);
}, 300));

// Form Actions
addNewGameButton.addEventListener('click', () => {
  clearForm();
  setFormMode('create');
  // Scroll to form
  document.querySelector('.game-form-panel').scrollIntoView({ behavior: 'smooth' });
});

gameForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = getFormData();
  const errors = validateForm(data);

  if (errors.length > 0) {
    showErrorToast(errors[0]);
    return;
  }

  if (formMode === 'create') {
    await createGame(data);
  } else if (formMode === 'edit' && selectedGame) {
    await updateGame(selectedGame.id, data);
  }
});

cancelButton.addEventListener('click', () => {
  if (selectedGame) {
    setFormData(selectedGame);
  } else {
    clearForm();
  }
});

deleteButton.addEventListener('click', showDeleteModal);
confirmDeleteButton.addEventListener('click', () => {
  if (selectedGame) {
    deleteGame(selectedGame.id, selectedGame.title);
  }
});
cancelDeleteButton.addEventListener('click', closeDeleteModal);

// Modal overlay click
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal || e.target.classList.contains('modal-overlay')) {
    closeDeleteModal();
  }
});

// Image preview
imageUrlInput.addEventListener('input', debounce((e) => {
  updateImagePreview(e.target.value.trim());
}, 500));

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDeleteModal();
  }
});

// Initialize
console.log('Admin page initialized');
if (ADMIN_EMAILS.length === 0) {
  console.warn('No admin emails configured! Set VITE_ADMIN_EMAILS in your .env file');
}
