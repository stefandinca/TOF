# BGG Enrichment Script

This script enriches your board game library with data from BoardGameGeek (BGG), including:
- Game images (thumbnail and full-size)
- Game descriptions
- BGG ratings
- Complexity scores
- Additional metadata

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Register for BoardGameGeek API Access

BoardGameGeek recently implemented authentication for their XML API. You need to register and get a token:

1. **Create a BGG account** if you don't have one at [boardgamegeek.com](https://boardgamegeek.com)
2. **Log in** to your BGG account
3. **Go to the API registration page**: [boardgamegeek.com/applications](https://boardgamegeek.com/applications)
4. **Register your application**:
   - Click "Register Application" or similar button
   - Application Name: `Twist of Fate Board Game Library`
   - Description: `Internal tool to enrich game library with BGG data`
   - Redirect URL: `http://localhost` (or any placeholder if not needed)
5. **Submit** your application and wait for approval (usually quick)
6. **Generate a token**: Once approved, go back to the applications page, find your app, and create an API token
7. **Copy the token** and add it to your `.env` file as `BGG_API_TOKEN`

For more information, see:
- [BGG XML API Documentation](https://boardgamegeek.com/wiki/page/BGG_XML_API2)
- [Using the XML API](https://boardgamegeek.com/using_the_xml_api)

### 3. Configure Firebase Admin SDK

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Open the JSON file and copy its entire contents
7. Minify the JSON (remove all newlines and extra spaces) - you can use an online JSON minifier
8. Add it to your `.env` file as `FIREBASE_SERVICE_ACCOUNT`

Example `.env` entry:
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project","private_key_id":"abc123",...}
```

## Usage

### Basic Usage (Enrich games missing images or descriptions)

```bash
npm run enrich-games
```

This will:
- Find all games in Firestore that are missing images or descriptions
- Search for each game on BoardGameGeek
- Fetch detailed information
- Update Firestore with the enriched data

### Advanced Options

#### Limit the number of games to process

```bash
npm run enrich-games -- --limit 10
```

Process only the first 10 games that need enrichment.

#### Process ALL games (not just missing data)

```bash
npm run enrich-games -- --all
```

This will check all games in your library, even if they already have images/descriptions.

#### Force update (re-fetch data for all games)

```bash
npm run enrich-games -- --force
```

This will re-fetch and update data for ALL games, overwriting existing BGG data.

## How It Works

1. **Search**: The script searches BoardGameGeek for each game by title
2. **Fetch**: Once found, it fetches detailed game information from the BGG API
3. **Update**: The game document in Firestore is updated with:
   - `description`: Game description from BGG
   - `imageUrl`: Full-size game image
   - `thumbnailUrl`: Thumbnail image for card views
   - `rating`: BGG average rating
   - `complexity`: BGG complexity/weight score
   - `bggId`: BGG game ID for future reference
   - `yearPublished`: Year the game was published

4. **Rate Limiting**: The script waits 5 seconds between API requests to respect BGG's rate limits

## Output

The script provides detailed console output:

```
📚 Starting game enrichment from BoardGameGeek...

Found 180 games in Firestore

45 games need enrichment

[1/45] Processing: Catan
Searching BGG for: Catan
Fetching details for BGG ID: 13
✅ Updated game TOF-BG-123 with BGG data
   Image: ✓
   Description: ✓
   Rating: 7.2

...

==================================================

✨ Enrichment complete!
   ✅ Success: 42
   ❌ Failed: 3
   📊 Total: 45
```

## Troubleshooting

### 401 Unauthorized Errors

If you get 401 errors:
- Make sure you've registered for BGG API access at https://boardgamegeek.com/applications
- Verify your `BGG_API_TOKEN` is correctly set in your `.env` file
- Check that your application has been approved by BGG
- Ensure the token hasn't expired (you may need to regenerate it)

### API Errors (500/503)

If you get frequent API errors:
- The script already waits 5 seconds between requests
- Try running with `--limit` to process fewer games at once
- BGG's API can be slow during peak hours

### Game Not Found

If a game isn't found on BGG:
- Check if the title in Firestore exactly matches the BGG title
- Try searching BGG manually to find the correct name
- You may need to manually update the game title in Firestore

### Authentication Errors

If you get Firebase authentication errors:
- Verify your `FIREBASE_SERVICE_ACCOUNT` is properly formatted in `.env`
- Make sure there are no line breaks in the JSON string
- Ensure the service account has Firestore read/write permissions

## Best Practices

1. **Start Small**: Test with `--limit 5` first to make sure everything works
2. **Monitor Progress**: Watch the console output for errors
3. **Backup First**: Consider exporting your Firestore data before running bulk updates
4. **Run During Off-Peak**: BGG API is more reliable during off-peak hours
5. **Review Results**: Check a few updated games in your library to verify data quality

## Rate Limits

The script respects BoardGameGeek's rate limits by:
- Waiting 5 seconds between each API request
- Processing games sequentially (not in parallel)
- Following BGG's API best practices

For 180 games, expect the script to run for approximately:
- 180 games × 2 API calls (search + details) × 5 seconds = ~30 minutes

## Additional Notes

- The script preserves your manual data (player counts, play times, etc.)
- BGG data is only added for missing fields
- Descriptions are limited to 1000 characters to keep the database manageable
- HTML is stripped from descriptions for clean display
