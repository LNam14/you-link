// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, remove, update, DataSnapshot, Database } from 'firebase/database';
import { TelegramService } from '@/lib/telegram';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAvnMk4sKg3litMf82RKARDr7wdSez5gLA",
    authDomain: "fshop-5177e.firebaseapp.com",
    databaseURL: "https://fshop-5177e-default-rtdb.firebaseio.com",
    projectId: "fshop-5177e",
    storageBucket: "fshop-5177e.appspot.com",
    messagingSenderId: "550095738800",
    appId: "1:550095738800:web:24966b9c9a26a124a3e875"
};

// Initialize Firebase
let app;
let database: Database;
let telegramService: TelegramService;

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    telegramService = TelegramService.getInstance();
} catch (error) {
    console.error('Firebase initialization error:', error);
    // You might want to handle this error differently in production
    throw new Error('Failed to initialize Firebase. Please check your configuration.');
}

// Orders operations
export const ordersRef = ref(database, 'orders');
export const createOrder = async (orderData: any) => {
    const newOrderRef = push(ordersRef);
    await set(newOrderRef, {
        ...orderData,
        createdAt: new Date().toISOString(),
        status: 'pending'
    });

    // Send Telegram notification
    await telegramService.sendOrderNotification({
        id: newOrderRef.key,
        ...orderData
    });

    return newOrderRef.key;
};

export const updateOrder = async (orderId: string, updates: any) => {
    const orderRef = ref(database, `orders/${orderId}`);
    await update(orderRef, updates);
};

export const deleteOrder = async (orderId: string) => {
    const orderRef = ref(database, `orders/${orderId}`);
    await remove(orderRef);
};

// Money operations
export const moneyRef = ref(database, 'money');
export const updateUserBalance = async (userId: string, amount: number) => {
    const userMoneyRef = ref(database, `money/${userId}`);
    const snapshot = await new Promise<DataSnapshot>((resolve) => {
        onValue(userMoneyRef, (snapshot) => {
            resolve(snapshot);
        }, { onlyOnce: true });
    });

    let currentAmount = 0;
    if (snapshot.exists()) {
        currentAmount = snapshot.val().amount || 0;
    }

    await set(userMoneyRef, { amount: currentAmount + amount });
};

// Cart operations
export const cartRef = ref(database, 'carts');
export const getUserCart = async (userId: string) => {
    const userCartRef = ref(database, `carts/${userId}`);
    const snapshot = await new Promise<DataSnapshot>((resolve) => {
        onValue(userCartRef, (snapshot) => {
            resolve(snapshot);
        }, { onlyOnce: true });
    });

    return snapshot.exists() ? snapshot.val() : { items: [] };
};

export const updateUserCart = async (userId: string, cartData: any) => {
    const userCartRef = ref(database, `carts/${userId}`);
    await set(userCartRef, cartData);
};

export const clearUserCart = async (userId: string) => {
    const userCartRef = ref(database, `carts/${userId}`);
    await remove(userCartRef);
};

export { database, ref, set, onValue, push, remove, update };
