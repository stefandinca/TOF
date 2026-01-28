import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.VITE_FIREBASE_PROJECT_ID
});

const db = admin.firestore();

async function listTitles() {
  const snapshot = await db.collection('games').limit(50).get();
  snapshot.docs.forEach(doc => {
    console.log(doc.data().title);
  });
  await admin.app().delete();
}

listTitles();
