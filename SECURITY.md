# 🔐 Security Guide

## Environment Variables Setup

Your Firebase credentials are now securely managed using environment variables.

### What's Been Done

1. **Created `.env` file** - Contains your actual Firebase credentials
2. **Created `.gitignore`** - Prevents `.env` from being committed to Git
3. **Updated all code files** - Now use `import.meta.env.VITE_*` instead of hardcoded values
4. **Added Vite** - Automatically loads and injects environment variables

### Files Updated

| File | Status | Description |
|------|--------|-------------|
| `.env` | 🔒 **Gitignored** | Your actual credentials |
| `.env.example` | ✅ Safe to commit | Template without real values |
| `firebase-config.js` | ✅ Updated | Uses env variables |
| `library.js` | ✅ Updated | Uses env variables |
| `import-games.js` | ✅ Created | Uses env variables |
| `import-games.html` | ✅ Updated | References external JS |

## Important Security Notes

### ✅ DO
- Keep `.env` file secret and never commit it
- Use `.env.example` as a template for other developers
- Restart dev server after changing `.env`
- Set environment variables on your hosting platform for production

### ❌ DON'T
- Never commit `.env` to Git
- Don't share `.env` file in public channels
- Don't hardcode credentials in source files
- Don't remove `.env` from `.gitignore`

## How It Works

### Development
```bash
npm run dev
```
Vite reads `.env` and replaces `import.meta.env.VITE_*` with actual values.

### Production Build
```bash
npm run build
```
Environment variables are baked into the built files in the `dist/` folder.

## Firebase API Keys - Important Context

### Are Firebase API Keys Secret?

**No, Firebase API keys are NOT secret!** They are meant to be included in client-side code.

From Firebase documentation:
> "Unlike how API keys are typically used, API keys for Firebase services are not used to control access to backend resources; that can only be done with Firebase Security Rules. Usually, you need to fastidiously guard API keys; however, in this case, you can use your API key in your client-side code."

### Real Security Comes From Firestore Security Rules

The actual security is controlled by **Firestore Security Rules**, not by hiding the API key.

#### Recommended Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Games collection - public read, no write
    match /games/{gameId} {
      allow read: if true;  // Anyone can read
      allow write: if false; // No one can write from client
    }

    // Future: User-specific data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Why Use .env Then?

Even though Firebase API keys aren't secret, using `.env` is still good practice because:

1. **Organization** - Keeps all config in one place
2. **Flexibility** - Easy to swap between dev/prod environments
3. **Consistency** - Follows industry best practices
4. **Future-proofing** - Other services might have truly secret keys
5. **Clean code** - No hardcoded values scattered in files

## Firestore Security Rules Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `twist-of-fate-games-db`
3. Click "Firestore Database" in the sidebar
4. Click the "Rules" tab
5. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

6. Click "Publish"

## Additional Security Measures

### 1. Enable App Check (Recommended)
Protects your Firebase resources from abuse.

1. Go to Firebase Console > App Check
2. Register your web app
3. Choose reCAPTCHA v3
4. Add the App Check SDK to your app

### 2. Set Usage Quotas
Prevent unexpected bills from abuse.

1. Go to Firebase Console > Usage and billing
2. Set daily quotas for:
   - Cloud Firestore reads/writes
   - Storage downloads
   - Functions invocations

### 3. Monitor Usage
1. Enable Firebase Analytics
2. Set up alerts for unusual activity
3. Review usage regularly

### 4. Restrict API Key (Optional)
While not required, you can restrict where your API key can be used:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services > Credentials
3. Find your API key
4. Add restrictions:
   - HTTP referrers (websites)
   - IP addresses (for server apps)

Example restrictions:
```
https://your-domain.com/*
https://twist-of-fate.web.app/*
http://localhost:3000/*
```

## Checking Your Security

### ✅ Verify .env is Gitignored
```bash
git status
# .env should NOT appear in untracked files
```

### ✅ Verify Security Rules
Try to write to Firestore from browser console:
```javascript
db.collection('games').add({ test: 'data' })
// Should fail with permission denied
```

### ✅ Verify Read Access
```javascript
db.collection('games').limit(1).get()
// Should succeed
```

## Team Collaboration

When working with other developers:

1. Share `.env.example` (without real values)
2. Each developer creates their own `.env`
3. Use the same Firebase project or create dev/prod projects
4. Document required environment variables

## Deployment Checklist

- [ ] `.env` is in `.gitignore`
- [ ] `.env` is NOT committed to Git
- [ ] Firestore Security Rules are configured
- [ ] Environment variables are set on hosting platform
- [ ] App Check is enabled (optional but recommended)
- [ ] Usage quotas are configured
- [ ] Monitoring/alerts are set up

## Questions?

### Can I share my .env file with my team?
Use a secure method:
- 1Password, LastPass, or similar password manager
- Encrypted team vault
- Secure environment variable management service

### What if .env was already committed to Git?
1. Immediately rotate all credentials in Firebase Console
2. Remove .env from Git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (coordinate with team!)
4. Update .env with new credentials

### Can attackers steal my data with the API key?
No, if you have proper Firestore Security Rules. The API key only identifies your Firebase project. Security Rules control who can read/write data.

## Summary

✅ **Environment variables** = Good organization and best practices
✅ **Firestore Security Rules** = Real security
✅ **App Check** = Protection from bots
✅ **Usage quotas** = Cost protection

Your Firebase setup is now secure! 🎉
