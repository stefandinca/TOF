# Twist of Fate Game Library - Setup Guide

This guide will help you set up Firebase and import your board game library data.

## 🔒 Security Notice

Your Firebase credentials are now stored securely in a `.env` file which is:
- ✅ Excluded from Git (via `.gitignore`)
- ✅ Never committed to version control
- ✅ Automatically loaded by Vite during development

## Phase 1 Features

The board game library includes:
- ✅ Display all 180+ games in a responsive grid layout
- ✅ Search games by name, publisher, theme, or tags
- ✅ Filter by player count, game mode, and category
- ✅ Sort by name, rating, play time, or player count
- ✅ Click any game to view full details in a modal
- ✅ Responsive design matching your existing brand style
- ✅ Smooth animations and transitions

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `twist-of-fate` (or your preferred name)
4. Disable Google Analytics (optional for this project)
5. Click "Create project"

## Step 2: Set Up Firestore Database

1. In your Firebase project, click "Firestore Database" in the left menu
2. Click "Create database"
3. Choose "Start in production mode" (we'll add security rules later)
4. Select a Cloud Firestore location (choose closest to your users)
5. Click "Enable"

## Step 3: Get Your Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the Web icon `</>` to add a web app
5. Register app with nickname: "Game Library"
6. Copy the Firebase configuration object

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 4: Install Dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

This will install Vite, which allows us to use environment variables securely.

## Step 5: Update Environment Variables

Your Firebase credentials are already configured in the `.env` file. The configuration has been automatically set up from your Firebase console.

**Important**: The `.env` file is gitignored and will never be committed to version control.

If you need to update credentials later:
1. Open `.env` file
2. Update the values
3. Restart the dev server

## Step 6: Start Development Server

Start the Vite development server:

```bash
npm run dev
```

This will:
- Load your environment variables from `.env`
- Start a local server at `http://localhost:3000`
- Open your browser automatically
- Enable hot module reloading

## Step 7: Import Your Game Data

1. Navigate to `http://localhost:3000/import-games.html`
2. Click "Choose File" and select your CSV file:
   - `context/Twist of Fate Board Game Library - Board Game Library.csv`
3. Click "Import Games to Firebase"
4. Wait for the import to complete (should take 30-60 seconds for 182 games)
5. You should see "Import complete!" with success count

## Step 8: Test Your Library

1. Navigate to `http://localhost:3000/library.html`
2. You should see all your games displayed in a grid
3. Try the search and filter features
4. Click on any game to see full details

## Step 9: Build for Production

When you're ready to deploy:

```bash
npm run build
```

This will create a `dist/` folder with optimized production files.

## Step 10: Deploy

### Option A: Firebase Hosting (Recommended)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase Hosting
firebase init hosting
# Select "dist" as your public directory
# Configure as single-page app: No
# Set up automatic builds: No

# Build and deploy
npm run build
firebase deploy
```

### Option B: Other Hosting

Upload the contents of the `dist/` folder to:
- **Netlify**: Drag and drop the dist folder
- **Vercel**: Connect your Git repo and set build command to `npm run build`
- **GitHub Pages**: Use GitHub Actions to build and deploy
- **Any static host**: Upload the dist folder contents

### Important for Deployment

When deploying, you'll need to set environment variables on your hosting platform:

**Netlify/Vercel**:
- Add environment variables in the dashboard
- Use the same variable names from `.env`

**GitHub Pages**:
- Use GitHub Secrets
- Configure in your deployment workflow

**Firebase Hosting**:
- No additional setup needed
- Environment variables are baked into the build

## File Structure

```
TOF_Website/
├── index.html              # Landing page
├── library.html            # Game library page (Phase 1)
├── library.js              # Library functionality
├── library.css             # Library custom styles
├── styles.css              # Global Tailwind styles
├── firebase-config.js      # Firebase config (not currently used)
├── import-games.html       # CSV import tool
├── SETUP.md               # This file
└── context/
    └── Twist of Fate Board Game Library.csv
```

## Firestore Database Structure

Your games will be stored in Firestore with this structure:

```
Collection: games
Document ID: {gameId} (e.g., "TOF-BG-0001-AND-AE")
Fields:
  - title: string
  - gameId: string
  - publisher: string
  - quantityLibrary: number
  - quantityRetail: number
  - playerCountMin: number
  - playerCountMax: string
  - playTimeMin: number
  - playTimeMax: number
  - age: string
  - gameMode: string
  - inventoryCategory: string
  - rating: number
  - complexity: string
  - theme: string
  - gameMechanics: string
  - tags: string
  - description: string
  - notes: string
  - imageUrl: string
  - rulesUrl: string
  - playTested: string
  - searchIndex: string (lowercase for searching)
```

## Security Rules (Recommended)

After importing your data, update Firestore security rules:

1. Go to Firestore Database in Firebase Console
2. Click "Rules" tab
3. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read: if true;  // Anyone can read
      allow write: if false; // No one can write (import only via import tool)
    }
  }
}
```

4. Click "Publish"

## Troubleshooting

### Games not loading?
- Check browser console for errors (F12)
- Verify Firebase config is correct in `library.js`
- Check Firestore Database has the "games" collection

### Import failed?
- Verify Firebase config in `import-games.html`
- Check that CSV file is properly formatted
- Look at browser console for specific errors

### CORS errors?
- Use a local web server (see Step 7)
- Don't open HTML files directly with `file://`

## Next Steps (Future Phases)

Potential Phase 2 features:
- Admin panel to add/edit/delete games
- Game reservation system
- User accounts and favorites
- Advanced filters (by theme, mechanics, complexity)
- Game availability status
- Reviews and ratings system

## Support

If you encounter issues:
1. Check the browser console (F12) for errors
2. Verify all Firebase configuration is correct
3. Ensure your CSV file matches the expected format
4. Make sure you're using a web server (not file://)

Enjoy your board game library! 🎲
