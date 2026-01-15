import admin from 'firebase-admin';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const parseXML = promisify(parseString);

// BGG API configuration
const BGG_API_BASE = 'https://boardgamegeek.com/xmlapi2';
const RATE_LIMIT_MS = 5000; // 5 seconds between requests as recommended
const BGG_API_TOKEN = process.env.BGG_API_TOKEN;

// Validate environment variables
if (!BGG_API_TOKEN) {
  console.error('❌ Error: BGG_API_TOKEN not found in environment variables');
  console.error('Please add your BGG API token to the .env file');
  console.error('Visit https://boardgamegeek.com/applications to register\n');
  process.exit(1);
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT not found in environment variables');
  console.error('Please add your Firebase service account JSON to the .env file\n');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.VITE_FIREBASE_PROJECT_ID
});

const db = admin.firestore();

/**
 * Sleep function for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search for a game on BGG by name
 */
async function searchBGG(gameName) {
  const query = encodeURIComponent(gameName);
  const url = `${BGG_API_BASE}/search?query=${query}&type=boardgame`;

  console.log(`Searching BGG for: ${gameName}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BGG_API_TOKEN}`,
        'User-Agent': 'TwistOfFateCafe/1.0 (boardgames@twistoffate.com)',
        'Accept': 'application/xml, text/xml, */*'
      }
    });
    if (!response.ok) {
      throw new Error(`BGG API error: ${response.status}`);
    }

    const xml = await response.text();
    const result = await parseXML(xml);

    if (result.items && result.items.item && result.items.item.length > 0) {
      // Return the first match (most relevant)
      const item = result.items.item[0];
      return {
        id: item.$.id,
        name: item.name?.[0]?.$.value || gameName,
        yearPublished: item.yearpublished?.[0]?.$.value
      };
    }

    console.log(`No results found for: ${gameName}`);
    return null;
  } catch (error) {
    console.error(`Error searching BGG for ${gameName}:`, error.message);
    return null;
  }
}

/**
 * Fetch detailed game information from BGG
 */
async function fetchGameDetails(bggId) {
  const url = `${BGG_API_BASE}/thing?id=${bggId}&stats=1`;

  console.log(`Fetching details for BGG ID: ${bggId}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BGG_API_TOKEN}`,
        'User-Agent': 'TwistOfFateCafe/1.0 (boardgames@twistoffate.com)',
        'Accept': 'application/xml, text/xml, */*'
      }
    });
    if (!response.ok) {
      throw new Error(`BGG API error: ${response.status}`);
    }

    const xml = await response.text();
    const result = await parseXML(xml);

    if (result.items && result.items.item && result.items.item.length > 0) {
      const item = result.items.item[0];

      // Extract primary name
      const primaryName = item.name?.find(n => n.$.type === 'primary')?.$.value ||
                         item.name?.[0]?.$.value;

      // Extract description (strip HTML tags for plain text)
      let description = item.description?.[0] || '';
      description = description
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#10;/g, '\n')
        .trim();

      // Get image URL (prefer thumbnail for card view, but get full image for modal)
      // BGG API sometimes returns multiple images in item.image array
      const images = item.image || [];
      const imageUrl = images[0] || '';
      const thumbnailUrl = item.thumbnail?.[0] || imageUrl;

      // Get rating and other stats
      const stats = item.statistics?.[0]?.ratings?.[0];
      const rating = stats?.average?.[0]?.$.value;
      const complexity = stats?.averageweight?.[0]?.$.value;

      // Get player count and play time
      const minPlayers = item.minplayers?.[0]?.$.value;
      const maxPlayers = item.maxplayers?.[0]?.$.value;
      const minPlayTime = item.minplaytime?.[0]?.$.value;
      const maxPlayTime = item.maxplaytime?.[0]?.$.value;
      const age = item.minage?.[0]?.$.value;

      // Get year published
      const yearPublished = item.yearpublished?.[0]?.$.value;

      // Get BGG Rank (Overall Board Game Rank)
      let bggRank = null;
      if (item.statistics?.[0]?.ratings?.[0]?.ranks?.[0]?.rank) {
        const rankObj = item.statistics[0].ratings[0].ranks[0].rank.find(r => r.$.name === 'boardgame');
        if (rankObj && rankObj.$.value && rankObj.$.value !== 'Not Ranked') {
          bggRank = parseInt(rankObj.$.value);
        }
      }

      // Get Categories and Mechanics
      const categories = item.link
        .filter(l => l.$.type === 'boardgamecategory')
        .map(l => l.$.value);
      
      const mechanics = item.link
        .filter(l => l.$.type === 'boardgamemechanic')
        .map(l => l.$.value);

      // Get Recommended Players (from Poll)
      let recommendedPlayers = null;
      const polls = item.poll || [];
      const playerPoll = polls.find(p => p.$.name === 'suggested_numplayers');
      
      if (playerPoll && playerPoll.results) {
        let maxBestVotes = -1;
        let bestCounts = [];

        playerPoll.results.forEach(result => {
          const numPlayers = result.$.numplayers;
          // Find 'Best' votes
          const bestVote = result.result.find(r => r.$.value === 'Best');
          if (bestVote) {
            const votes = parseInt(bestVote.$.numvotes);
            if (votes > maxBestVotes) {
              maxBestVotes = votes;
              bestCounts = [numPlayers];
            } else if (votes === maxBestVotes) {
              bestCounts.push(numPlayers);
            }
          }
        });

        if (bestCounts.length > 0 && maxBestVotes > 0) {
          recommendedPlayers = bestCounts.join(', ');
        }
      }

      return {
        bggId,
        name: primaryName,
        description: description.substring(0, 1000), // Limit description length
        imageUrl,
        thumbnailUrl,
        images, // Store all images found
        rating: rating ? parseFloat(rating).toFixed(1) : null,
        complexity: complexity ? parseFloat(complexity).toFixed(2) : null,
        minPlayers: minPlayers ? parseInt(minPlayers) : null,
        maxPlayers: maxPlayers ? parseInt(maxPlayers) : null,
        minPlayTime: minPlayTime ? parseInt(minPlayTime) : null,
        maxPlayTime: maxPlayTime ? parseInt(maxPlayTime) : null,
        age: age ? `${age}+` : null,
        yearPublished: yearPublished ? parseInt(yearPublished) : null,
        categories,
        mechanics,
        bggRank,
        recommendedPlayers
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching details for BGG ID ${bggId}:`, error.message);
    return null;
  }
}

/**
 * Update a game in Firestore with BGG data
 */
async function updateGameWithBGGData(gameId, bggData) {
  try {
    const updateData = {};

    // Add BGG data if available
    if (bggData.description) updateData.description = bggData.description;
    if (bggData.imageUrl) updateData.imageUrl = bggData.imageUrl;
    if (bggData.thumbnailUrl) updateData.thumbnailUrl = bggData.thumbnailUrl;
    if (bggData.images && bggData.images.length > 0) updateData.images = bggData.images;
    if (bggData.rating) updateData.rating = bggData.rating;
    if (bggData.complexity) updateData.complexity = bggData.complexity;
    if (bggData.bggId) updateData.bggId = bggData.bggId;
    if (bggData.yearPublished) updateData.yearPublished = bggData.yearPublished;
    if (bggData.categories && bggData.categories.length > 0) updateData.categories = bggData.categories;
    if (bggData.mechanics && bggData.mechanics.length > 0) updateData.mechanics = bggData.mechanics;
    if (bggData.bggRank) updateData.bggRank = bggData.bggRank;
    if (bggData.recommendedPlayers) updateData.recommendedPlayers = bggData.recommendedPlayers;

    // Only update player count and play time if not already set
    // (prefer manual data over BGG data for these fields)

    await db.collection('games').doc(gameId).update(updateData);
    console.log(`✅ Updated game ${gameId} with BGG data`);

    return true;
  } catch (error) {
    console.error(`Error updating game ${gameId}:`, error.message);
    return false;
  }
}

/**
 * Main function to enrich games
 */
async function enrichGames(options = {}) {
  const {
    limit = null,
    missingImagesOnly = true,
    missingDescriptionsOnly = true,
    forceUpdate = false
  } = options;

  try {
    console.log('📚 Starting game enrichment from BoardGameGeek...\n');

    // Fetch all games from Firestore
    let query = db.collection('games');

    if (limit) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    const games = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${games.length} games in Firestore\n`);

    // Filter games that need enrichment
    let gamesToEnrich = games;

    if (!forceUpdate) {
      gamesToEnrich = games.filter(game => {
        const needsImage = missingImagesOnly && !game.imageUrl;
        const needsDescription = missingDescriptionsOnly && !game.description;
        return needsImage || needsDescription;
      });
    }

    console.log(`${gamesToEnrich.length} games need enrichment\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < gamesToEnrich.length; i++) {
      const game = gamesToEnrich[i];
      console.log(`\n[${i + 1}/${gamesToEnrich.length}] Processing: ${game.title}`);

      // Search for the game on BGG
      const searchResult = await searchBGG(game.title);
      await sleep(RATE_LIMIT_MS);

      if (!searchResult) {
        console.log(`⚠️  Could not find ${game.title} on BGG`);
        failCount++;
        continue;
      }

      // Fetch detailed information
      const gameDetails = await fetchGameDetails(searchResult.id);
      await sleep(RATE_LIMIT_MS);

      if (!gameDetails) {
        console.log(`⚠️  Could not fetch details for ${game.title}`);
        failCount++;
        continue;
      }

      // Update the game in Firestore
      const updated = await updateGameWithBGGData(game.id, gameDetails);

      if (updated) {
        successCount++;
        console.log(`   Image: ${gameDetails.imageUrl ? '✓' : '✗'}`);
        console.log(`   Description: ${gameDetails.description ? '✓' : '✗'}`);
        console.log(`   Rating: ${gameDetails.rating || 'N/A'}`);
      } else {
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`\n✨ Enrichment complete!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📊 Total: ${gamesToEnrich.length}\n`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: null,
  missingImagesOnly: true,
  missingDescriptionsOnly: true,
  forceUpdate: false
};

// Simple argument parsing
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--all') {
    options.missingImagesOnly = false;
    options.missingDescriptionsOnly = false;
  } else if (args[i] === '--force') {
    options.forceUpdate = true;
    options.missingImagesOnly = false;
    options.missingDescriptionsOnly = false;
  }
}

// Run the enrichment
enrichGames(options);
