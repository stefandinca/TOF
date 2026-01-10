# 🎲 Twist of Fate Board Game Library

A beautiful, responsive board game library application for Twist of Fate Café.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Import Games
1. Visit `http://localhost:3000/import-games.html`
2. Select your CSV file
3. Click "Import Games to Firebase"

### 4. View Library
Visit `http://localhost:3000/library.html` to see your game library!

## 🔒 Environment Variables

Your Firebase credentials are securely stored in `.env` file:
- ✅ Already configured with your Firebase project
- ✅ Excluded from Git via `.gitignore`
- ✅ Never committed to version control

**Important**: Never share your `.env` file or commit it to Git!

## 📁 Project Structure

```
TOF_Website/
├── .env                    # 🔒 Firebase credentials (gitignored)
├── .env.example            # Template for environment variables
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
├── index.html             # Landing page
├── library.html           # Game library page
├── library.js             # Library functionality
├── library.css            # Library styles
├── import-games.html      # CSV import tool
├── import-games.js        # Import functionality
├── firebase-config.js     # Firebase initialization
├── styles.css             # Global styles
└── context/
    └── *.csv              # Board game data
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🎨 Features

- ✅ Display 180+ board games
- ✅ Search by name, publisher, theme
- ✅ Filter by player count, mode, category
- ✅ Sort by various criteria
- ✅ Responsive design
- ✅ Game detail modals
- ✅ Secure Firebase integration

## 🔐 Security Best Practices

### What's Protected
- Firebase API keys and credentials are in `.env`
- `.gitignore` prevents committing sensitive data
- Vite automatically loads environment variables

### Firebase Security
While API keys are in the `.env` file, Firebase security comes from **Firestore Security Rules**, not from hiding the API key. The API key identifies your Firebase project, but security rules control data access.

Recommended Firestore Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read: if true;  // Public read access
      allow write: if false; // No public write access
    }
  }
}
```

### For Production
When deploying, set environment variables on your hosting platform:
- **Netlify/Vercel**: Add in dashboard settings
- **Firebase Hosting**: Variables are baked into the build
- **GitHub Pages**: Use GitHub Secrets

## 📖 Full Documentation

See [SETUP.md](SETUP.md) for detailed setup instructions.

## 🚢 Deployment

### Build for production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## 🆘 Troubleshooting

### Games not loading?
- Check Firebase credentials in `.env`
- Verify Firestore has "games" collection
- Check browser console for errors

### Environment variables not working?
- Restart the dev server after changing `.env`
- Make sure variables start with `VITE_`
- Verify you're using `npm run dev`, not opening files directly

## 📝 License

© 2025 Twist of Fate. All rights reserved.
