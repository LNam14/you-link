import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, remove, Database } from 'firebase/database'

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Initialize Firebase only if it hasn't been initialized already
let app: FirebaseApp;
let database: Database;

try {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApps()[0];
    }
    database = getDatabase(app);
} catch (error) {
    console.error('Firebase initialization error:', error);
    throw new Error('Failed to initialize Firebase. Please check your configuration.');
}

export { app, database, ref, set, onValue, remove } 