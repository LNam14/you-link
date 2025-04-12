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
  apiKey: "AIzaSyAvnMk4sKg3litMf82RKARDr7wdSez5gLA",
  authDomain: "fshop-5177e.firebaseapp.com",
  databaseURL: "https://fshop-5177e-default-rtdb.firebaseio.com",
  projectId: "fshop-5177e",
  storageBucket: "fshop-5177e.appspot.com",
  messagingSenderId: "550095738800",
  appId: "1:550095738800:web:24966b9c9a26a124a3e875"
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