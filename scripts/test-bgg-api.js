import { parseString } from 'xml2js';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const parseXML = promisify(parseString);

const BGG_API_BASE = 'https://boardgamegeek.com/xmlapi2';
const BGG_API_TOKEN = process.env.BGG_API_TOKEN;

if (!BGG_API_TOKEN) {
  console.error('❌ Error: BGG_API_TOKEN not found in environment variables');
  console.error('Please add your BGG API token to the .env file');
  console.error('Visit https://boardgamegeek.com/applications to register\n');
  process.exit(1);
}

/**
 * Test searching for a game
 */
async function testSearch(gameName) {
  const query = encodeURIComponent(gameName);
  const url = `${BGG_API_BASE}/search?query=${query}&type=boardgame`;

  console.log(`\n🔍 Searching for: ${gameName}`);
  console.log(`URL: ${url}\n`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BGG_API_TOKEN}`,
        'User-Agent': 'TwistOfFateCafe/1.0 (boardgames@twistoffate.com)',
        'Accept': 'application/xml, text/xml, */*'
      }
    });
    const xml = await response.text();

    console.log(`Response status: ${response.status}`);
    console.log(`XML preview: ${xml.substring(0, 300)}...\n`);

    const result = await parseXML(xml);

    if (result.items && result.items.item && result.items.item.length > 0) {
      console.log(`✅ Found ${result.items.item.length} result(s):\n`);

      result.items.item.slice(0, 3).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name?.[0]?.$.value}`);
        console.log(`      BGG ID: ${item.$.id}`);
        console.log(`      Year: ${item.yearpublished?.[0]?.$.value || 'N/A'}\n`);
      });

      return result.items.item[0].$.id;
    } else {
      console.log(`❌ No results found\n`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return null;
  }
}

/**
 * Test fetching game details
 */
async function testDetails(bggId) {
  const url = `${BGG_API_BASE}/thing?id=${bggId}&stats=1`;

  console.log(`\n📋 Fetching details for BGG ID: ${bggId}`);
  console.log(`URL: ${url}\n`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BGG_API_TOKEN}`,
        'User-Agent': 'TwistOfFateCafe/1.0 (boardgames@twistoffate.com)',
        'Accept': 'application/xml, text/xml, */*'
      }
    });
    const xml = await response.text();
    const result = await parseXML(xml);

    if (result.items && result.items.item && result.items.item.length > 0) {
      const item = result.items.item[0];

      const name = item.name?.find(n => n.$.type === 'primary')?.$.value;
      const description = item.description?.[0]?.substring(0, 200) + '...';
      const imageUrl = item.image?.[0];
      const thumbnailUrl = item.thumbnail?.[0];
      const stats = item.statistics?.[0]?.ratings?.[0];
      const rating = stats?.average?.[0]?.$.value;
      const complexity = stats?.averageweight?.[0]?.$.value;

      console.log(`✅ Game Details:\n`);
      console.log(`   Name: ${name}`);
      console.log(`   Rating: ${rating ? parseFloat(rating).toFixed(1) : 'N/A'}`);
      console.log(`   Complexity: ${complexity ? parseFloat(complexity).toFixed(2) : 'N/A'}`);
      console.log(`   Players: ${item.minplayers?.[0]?.$.value}-${item.maxplayers?.[0]?.$.value}`);
      console.log(`   Play Time: ${item.minplaytime?.[0]?.$.value}-${item.maxplaytime?.[0]?.$.value} min`);
      console.log(`   Age: ${item.minage?.[0]?.$.value}+`);
      console.log(`   Year: ${item.yearpublished?.[0]?.$.value}`);
      console.log(`   Image: ${imageUrl ? '✓' : '✗'} ${imageUrl || ''}`);
      console.log(`   Thumbnail: ${thumbnailUrl ? '✓' : '✗'} ${thumbnailUrl || ''}`);
      console.log(`   Description: ${description}\n`);

      return true;
    } else {
      console.log(`❌ No details found\n`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return false;
  }
}

/**
 * Run the test
 */
async function runTest() {
  console.log('='.repeat(60));
  console.log('🎲 BoardGameGeek API Test');
  console.log('='.repeat(60));

  const testGames = [
    'Catan',
    'Ticket to Ride',
    'Pandemic'
  ];

  for (const gameName of testGames) {
    const bggId = await testSearch(gameName);

    if (bggId) {
      // Wait 5 seconds before fetching details (rate limiting)
      console.log('⏳ Waiting 5 seconds (rate limiting)...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      await testDetails(bggId);
    }

    // Wait before next game
    if (testGames.indexOf(gameName) < testGames.length - 1) {
      console.log('⏳ Waiting 5 seconds before next search...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('='.repeat(60));
  console.log('✨ Test complete!');
  console.log('='.repeat(60));
}

runTest();
