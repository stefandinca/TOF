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
        const gameRef = db.collection('games').doc(games[i].gameId);
        const existingDoc = await gameRef.get();

        if (existingDoc.exists) {
          // Preserve existing data - only update fields that are empty/missing in Firestore
          const existingData = existingDoc.data();
          const updateData = {};

          for (const [key, value] of Object.entries(games[i])) {
            // Only update if:
            // 1. Field doesn't exist in Firestore, OR
            // 2. Field is empty/null/undefined in Firestore
            // AND the new value is not empty
            const existingValue = existingData[key];
            const hasExistingValue = existingValue !== undefined &&
                                     existingValue !== null &&
                                     existingValue !== '' &&
                                     existingValue !== 0;
            const hasNewValue = value !== undefined &&
                               value !== null &&
                               value !== '' &&
                               value !== 0;

            if (!hasExistingValue && hasNewValue) {
              updateData[key] = value;
            }
          }

          // Only update if there's something to update
          if (Object.keys(updateData).length > 0) {
            await gameRef.update(updateData);
          }
        } else {
          // New game - create full document
          await gameRef.set(games[i]);
        }
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

    // CSV columns: Game TItle, Play tested?, Game ID Internal, Quantity Library, Quantity Retail,
    // Publisher, UPC, Purchase Date, Unit Cost, Vendor, Age, Player Count Min, Player Count Max,
    // Play Time Min, Play Time Max, Inventory Category, Game Mode, Description, Rating, Type,
    // Complexity, Vibe, Theme, Game Mechanics, Tags, Notes, Image URL, Rules URL,
    // How to Play Short URL, How to Play Long URL
    const game = {
      title: values[0] || '',
      playTested: values[1] || '',
      gameId: values[2] || `TOF-BG-${String(i).padStart(4, '0')}`,
      quantityLibrary: parseInt(values[3]) || 0,
      quantityRetail: parseInt(values[4]) || 0,
      publisher: values[5] || '',
      upc: values[6] || '',
      purchaseDate: values[7] || '',
      unitCost: values[8] || '',
      vendor: values[9] || '',
      age: values[10] || '',
      playerCountMin: parseInt(values[11]) || 0,
      playerCountMax: values[12] || '',
      playTimeMin: parseInt(values[13]) || 0,
      playTimeMax: parseInt(values[14]) || 0,
      inventoryCategory: values[15] || '',
      gameMode: values[16] || '',
      description: values[17] || '',
      rating: parseFloat(values[18]) || 0,
      type: values[19] || '',
      complexity: values[20] || '',
      vibe: values[21] || '',
      theme: values[22] || '',
      gameMechanics: values[23] || '',
      tags: values[24] || '',
      notes: values[25] || '',
      imageUrl: values[26] || '',
      rulesUrl: values[27] || '',
      howToPlayShortUrl: values[28] || '',
      howToPlayLongUrl: values[29] || '',
      searchIndex: (values[0] + ' ' + values[5] + ' ' + values[16] + ' ' + values[22] + ' ' + values[24]).toLowerCase()
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
