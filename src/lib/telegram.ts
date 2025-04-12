import axios from 'axios';
import { BOT_TOKEN, FALLBACK_CHAT_ID } from '@/app/config';

export class TelegramService {
    private static instance: TelegramService;
    private botToken: string;
    private fallbackChatId: string;

    private constructor() {
        this.botToken = BOT_TOKEN;
        this.fallbackChatId = FALLBACK_CHAT_ID;
    }

    public static getInstance(): TelegramService {
        if (!TelegramService.instance) {
            TelegramService.instance = new TelegramService();
        }
        return TelegramService.instance;
    }

    public async sendMessage(chatId: string, message: string): Promise<boolean> {
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            const response = await axios.post(url, {
                chat_id: chatId || this.fallbackChatId,
                text: message,
                parse_mode: 'HTML'
            });
            return response.data.ok;
        } catch (error) {
            console.error('Error sending Telegram message:', error);
            return false;
        }
    }

    public async sendOrderNotification(orderData: any): Promise<boolean> {
        const message = `
<b>🛒 New Order Notification</b>
Order ID: ${orderData.id}
Customer: ${orderData.customerName}
Total Amount: ${orderData.totalAmount}
Status: ${orderData.status}
        `;
        return this.sendMessage(this.fallbackChatId, message);
    }

    public async sendTransactionNotification(transactionData: any): Promise<boolean> {
        const message = `
<b>💰 Transaction Notification</b>
Type: ${transactionData.type}
Amount: ${transactionData.amount}
Account: ${transactionData.accountId}
Status: ${transactionData.status}
        `;
        return this.sendMessage(this.fallbackChatId, message);
    }
} 