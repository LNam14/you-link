import { google } from 'googleapis'
import { Transaction } from '@/types/transactions'

class SheetService {
    private static instance: SheetService
    private auth: any
    private sheets: any

    private constructor() {
        this.auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })

        this.sheets = google.sheets({ version: 'v4', auth: this.auth })
    }

    public static getInstance(): SheetService {
        if (!SheetService.instance) {
            SheetService.instance = new SheetService()
        }
        return SheetService.instance
    }

    public async notifyTransaction(transaction: Transaction) {
        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: process.env.SPREADSHEET_ID,
                range: 'Sheet1!A:G',
                valueInputOption: 'RAW',
                requestBody: {
                    values: [[
                        transaction.id,
                        transaction.name,
                        transaction.amount,
                        transaction.method,
                        transaction.deposit_date,
                        transaction.description,
                        transaction.status
                    ]]
                }
            })
        } catch (error) {
            console.error('Error notifying transaction to sheet:', error)
        }
    }

    public async notifyTransactionUpdate(transaction: Transaction, newStatus: string) {
        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: process.env.SPREADSHEET_ID,
                range: 'Sheet1!A:G',
                valueInputOption: 'RAW',
                requestBody: {
                    values: [[
                        transaction.id,
                        transaction.name,
                        transaction.amount,
                        transaction.method,
                        transaction.deposit_date,
                        transaction.description,
                        newStatus
                    ]]
                }
            })
        } catch (error) {
            console.error('Error notifying transaction update to sheet:', error)
        }
    }
}

export const sheetService = SheetService.getInstance() 