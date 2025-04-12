import executeQuery from '@/app/db/db';
import { TelegramService } from './telegram';

export class DatabaseService {
    private static instance: DatabaseService;
    private telegramService: TelegramService;

    private constructor() {
        this.telegramService = TelegramService.getInstance();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    // Account operations
    public async createAccount(username: string, email: string, passwordHash: string, role: string = 'user') {
        const query = `
            INSERT INTO accounts (username, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, role, created_at
        `;
        return executeQuery(query, [username, email, passwordHash, role]);
    }

    public async getAccountById(id: number) {
        const query = 'SELECT id, username, email, role, created_at FROM accounts WHERE id = $1';
        return executeQuery(query, [id]);
    }

    public async getAccountByEmail(email: string) {
        const query = 'SELECT id, username, email, role, created_at FROM accounts WHERE email = $1';
        return executeQuery(query, [email]);
    }

    // Transaction operations
    public async createTransaction(accountId: number, type: string, amount: number, description: string, metadata: any = {}) {
        const query = `
            INSERT INTO transactions (account_id, type, amount, description, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, account_id, type, amount, status, created_at
        `;
        const result = await executeQuery(query, [accountId, type, amount, description, metadata]);
        
        // Send Telegram notification
        await this.telegramService.sendTransactionNotification({
            type,
            amount,
            accountId,
            status: 'pending'
        });

        return result;
    }

    public async getTransactionsByAccount(accountId: number, limit: number = 10, offset: number = 0) {
        const query = `
            SELECT t.*, a.username as account_username
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE t.account_id = $1
            ORDER BY t.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        return executeQuery(query, [accountId, limit, offset]);
    }

    public async updateTransactionStatus(id: number, status: string) {
        const query = `
            UPDATE transactions
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, account_id, type, amount, status, updated_at
        `;
        return executeQuery(query, [status, id]);
    }
} 