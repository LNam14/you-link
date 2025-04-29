import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, set, onValue } from 'firebase/database'

const firebaseConfig = {
    apiKey: "AIzaSyAvnMk4sKg3litMf82RKARDr7wdSez5gLA",
    authDomain: "fshop-5177e.firebaseapp.com",
    databaseURL: "https://fshop-5177e-default-rtdb.firebaseio.com",
    projectId: "fshop-5177e",
    storageBucket: "fshop-5177e.appspot.com",
    messagingSenderId: "550095738800",
    appId: "1:550095738800:web:24966b9c9a26a124a3e875"
}

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const database = getDatabase(app)

export { database, ref, set, onValue } 