import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, set, onValue } from 'firebase/database'

const firebaseConfig = {
    apiKey: "AIzaSyA56zF_hHgtp_2AmWU0MuUjgbWfzA95SSs",
    authDomain: "you-4a1e9.firebaseapp.com",
    databaseURL: "https://you-4a1e9-default-rtdb.firebaseio.com",
    projectId: "you-4a1e9",
    storageBucket: "you-4a1e9.firebasestorage.app",
    messagingSenderId: "894442863851",
    appId: "1:894442863851:web:2647c56e8b33e3093552ae"
}

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const database = getDatabase(app)

export { database, ref, set, onValue } 