import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

let app: FirebaseApp | null = null;
let database: Database | null = null;

function getFirebaseConfig() {
  return {
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "",
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
}

function initializeFirebase(): Database {
  if (database) {
    return database;
  }

  const firebaseConfig = getFirebaseConfig();

  // Validate required config
  if (!firebaseConfig.databaseURL) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_DATABASE_URL is required. Please check your .env.local file."
    );
  }

  if (!firebaseConfig.projectId) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID is required. Please check your .env.local file."
    );
  }

  if (typeof window !== "undefined") {
    // Client-side
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    database = getDatabase(app);
  } else {
    // Server-side
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    database = getDatabase(app);
  }

  return database;
}

// Lazy initialization - only initialize when accessed
export function getDatabaseInstance(): Database {
  if (!database) {
    database = initializeFirebase();
  }
  return database;
}

