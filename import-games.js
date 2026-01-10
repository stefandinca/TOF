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

window.importGames = async function() {
  const fileInput = document.getElementById('csvFile');
  const statusDiv = document.getElementById('status');
  const importBtn = document.getElementById('importBtn');

  if (!fileInput.files.length) {
    statusDiv.innerHTML = '<p class="error">Please select a CSV file first.</p>';
    return;
  }

  const file = fileInput.files[0];
  importBtn.disabled = true;
  statusDiv.innerHTML = '<p class="info">Reading CSV file...</p>';

  try {
    const text = await file.text();
    const games = parseCSV(text);

    statusDiv.innerHTML = `<p class="info">Found ${games.length} games. Uploading to Firebase...</p>`;

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < games.length; i++) {
      try {
        await db.collection('games').doc(games[i].gameId).set(games[i]);
        successCount++;

        if ((i + 1) % 10 === 0) {
          statusDiv.innerHTML = `<p class="info">Uploaded ${i + 1} of ${games.length} games...</p>`;
        }
      } catch (error) {
        console.error(`Error uploading game ${games[i].gameId}:`, error);
        errorCount++;
      }
    }

    statusDiv.innerHTML = `
      <p class="success">Import complete!</p>
      <p>Successfully imported: ${successCount} games</p>
      ${errorCount > 0 ? `<p class="error">Errors: ${errorCount}</p>` : ''}
    `;
  } catch (error) {
    statusDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    console.error(error);
  } finally {
    importBtn.disabled = false;
  }
};

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',');
  const games = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const game = {
      title: values[0] || '',
      gameId: values[1] || `TOF-BG-${String(i).padStart(4, '0')}`,
      quantityLibrary: parseInt(values[2]) || 0,
      quantityRetail: parseInt(values[3]) || 0,
      publisher: values[4] || '',
      upc: values[5] || '',
      purchaseDate: values[6] || '',
      unitCost: values[7] || '',
      vendor: values[8] || '',
      age: values[9] || '',
      playerCountMin: parseInt(values[10]) || 0,
      playerCountMax: values[11] || '',
      playTimeMin: parseInt(values[12]) || 0,
      playTimeMax: parseInt(values[13]) || 0,
      inventoryCategory: values[14] || '',
      gameMode: values[15] || '',
      description: values[16] || '',
      rating: parseFloat(values[17]) || 0,
      type: values[18] || '',
      complexity: values[19] || '',
      vibe: values[20] || '',
      theme: values[21] || '',
      gameMechanics: values[22] || '',
      tags: values[23] || '',
      notes: values[24] || '',
      imageUrl: values[25] || '',
      rulesUrl: values[26] || '',
      playTested: values[27] || '',
      searchIndex: (values[0] + ' ' + values[4] + ' ' + values[15] + ' ' + values[21] + ' ' + values[23]).toLowerCase()
    };

    games.push(game);
  }

  return games;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}
