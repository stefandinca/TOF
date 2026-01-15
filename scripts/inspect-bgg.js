import { parseString } from 'xml2js';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const parseXML = promisify(parseString);
const BGG_API_BASE = 'https://boardgamegeek.com/xmlapi2';
const BGG_API_TOKEN = process.env.BGG_API_TOKEN;

// Fetch details for Catan (ID 13)
async function inspectGameParams() {
  // We use ID 13 (Catan) as a standard example
  const url = `${BGG_API_BASE}/thing?id=13&stats=1`;
  console.log(`Fetching ${url}...`);

  try {
    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${BGG_API_TOKEN}`,
        'User-Agent': 'TwistOfFateCafe/1.0' 
      }
    });
    const xml = await response.text();
    const result = await parseXML(xml);
    const item = result.items.item[0];

    // Helper to extract links of a specific type
    const getLinks = (type) => item.link.filter(l => l.$.type === type).map(l => l.$.value);

    console.log('\n--- AVAILABLE DATA POINTS ---');
    console.log('Categories:', getLinks('boardgamecategory'));
    console.log('Mechanics:', getLinks('boardgamemechanic'));
    console.log('Designers:', getLinks('boardgamedesigner'));
    console.log('Artists:', getLinks('boardgameartist'));
    console.log('Publishers:', getLinks('boardgamepublisher'));
    
    // Ranks
    const ranks = item.statistics[0].ratings[0].ranks[0].rank;
    console.log('Rankings:', ranks.map(r => `${r.$.name}: ${r.$.value}`));

    // Weight/Complexity Details
    console.log('Weight (Complexity):', item.statistics[0].ratings[0].averageweight[0].$.value);
    
    // User Rating Counts
    console.log('Users Rated:', item.statistics[0].ratings[0].usersrated[0].$.value);

    // Polls (Player Count)
    const polls = item.poll || [];
    const playerPoll = polls.find(p => p.$.name === 'suggested_numplayers');
    if (playerPoll) {
        console.log('\n--- PLAYER COUNT POLL ---');
        playerPoll.results.forEach(result => {
            const numPlayers = result.$.numplayers;
            const votes = result.result.map(r => `${r.$.value}: ${r.$.numvotes}`).join(', ');
            console.log(`Players: ${numPlayers} -> ${votes}`);
        });
    }
    
    console.log('-----------------------------\n');

  } catch (error) {
    console.error(error);
  }
}

inspectGameParams();
