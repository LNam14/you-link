import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyA56zF_hHgtp_2AmWU0MuUjgbWfzA95SSs",
  authDomain: "you-4a1e9.firebaseapp.com",
  databaseURL: "https://you-4a1e9-default-rtdb.firebaseio.com",
  projectId: "you-4a1e9",
  storageBucket: "you-4a1e9.firebasestorage.app",
  messagingSenderId: "894442863851",
  appId: "1:894442863851:web:2647c56e8b33e3093552ae"
};

let app: FirebaseApp;
let database: Database;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase. Please check your configuration.');
}

export { app, database }; 