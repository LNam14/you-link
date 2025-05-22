// Import Firebase database functions and database instance
import { ref, set, onValue, push, remove, update, DataSnapshot } from 'firebase/database';
import { database } from '@/lib/firebase';
import { TelegramService } from '@/lib/telegram';

// Initialize Telegram service
let telegramService: TelegramService;

try {
    telegramService = TelegramService.getInstance();
} catch (error) {
    console.error('Telegram service initialization error:', error);
    throw new Error('Failed to initialize Telegram service. Please check your configuration.');
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
export const updateUserBalance = async (userId: string, amount: number, nccName?: string) => {
    const userMoneyRef = ref(database, `money/${userId}`);
    const snapshot = await new Promise<DataSnapshot>((resolve) => {
        onValue(userMoneyRef, (snapshot) => {
            resolve(snapshot);
        }, { onlyOnce: true });
    });

    let currentAmount = 0;
    let currentPendingAmount = 0;
    let currentDoneAmount = 0;

    if (snapshot.exists()) {
        const data = snapshot.val();
        currentAmount = data.amount || 0;
        currentPendingAmount = data.pendingAmount || 0;
        currentDoneAmount = data.doneAmount || 0;
    }

    // If amount is negative, it's a deduction from pendingAmount
    if (amount < 0) {
        await set(userMoneyRef, {
            amount: currentAmount + amount,
            pendingAmount: currentPendingAmount + amount,
            doneAmount: currentDoneAmount - amount
        });
    } else {
        // If amount is positive, it's an addition to pendingAmount
        await set(userMoneyRef, {
            amount: currentAmount,
            pendingAmount: currentPendingAmount + amount,
            doneAmount: currentDoneAmount
        });
    }

    // If this is a deduction (negative amount) and NCC name is provided, add money to NCC
    if (amount < 0 && nccName) {
        const nccMoneyRef = ref(database, `money/${nccName}`);
        const nccSnapshot = await new Promise<DataSnapshot>((resolve) => {
            onValue(nccMoneyRef, (snapshot) => {
                resolve(snapshot);
            }, { onlyOnce: true });
        });

        let nccCurrentAmount = 0;
        let nccCurrentDoneAmount = 0;

        if (nccSnapshot.exists()) {
            const data = nccSnapshot.val();
            nccCurrentAmount = data.amount || 0;
            nccCurrentDoneAmount = data.doneAmount || 0;
        }

        // Add the absolute value of the deduction to NCC's balance and doneAmount
        await set(nccMoneyRef, {
            amount: nccCurrentAmount + Math.abs(amount),
            doneAmount: nccCurrentDoneAmount + Math.abs(amount)
        });

        // Update customer's doneAmount by adding the amount
        await set(userMoneyRef, {
            amount: currentAmount + amount,
            pendingAmount: currentPendingAmount + amount,
            doneAmount: currentDoneAmount + Math.abs(amount)
        });
    }
    // If this is a refund (positive amount) and NCC name is provided, deduct from NCC
    else if (amount > 0 && nccName) {
        const nccMoneyRef = ref(database, `money/${nccName}`);
        const nccSnapshot = await new Promise<DataSnapshot>((resolve) => {
            onValue(nccMoneyRef, (snapshot) => {
                resolve(snapshot);
            }, { onlyOnce: true });
        });

        let nccCurrentAmount = 0;
        let nccCurrentDoneAmount = 0;

        if (nccSnapshot.exists()) {
            const data = nccSnapshot.val();
            nccCurrentAmount = data.amount || 0;
            nccCurrentDoneAmount = data.doneAmount || 0;
        }

        // Deduct the refund amount from NCC's balance and doneAmount
        await set(nccMoneyRef, {
            amount: nccCurrentAmount - amount,
            doneAmount: nccCurrentDoneAmount - amount
        });
    }
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

export { ref, set, onValue, push, remove, update };
