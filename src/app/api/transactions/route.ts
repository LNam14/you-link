import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

const dbService = DatabaseService.getInstance()

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const accountId = searchParams.get('accountId')
        const limit = parseInt(searchParams.get('limit') || '10')
        const offset = parseInt(searchParams.get('offset') || '0')

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
        }

        const transactions = await dbService.getTransactionsByAccount(parseInt(accountId), limit, offset)
        return NextResponse.json({ data: transactions })
    } catch (error) {
        console.error('Error fetching transactions:', error)
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { accountId, type, amount, description, metadata } = body

        if (!accountId || !type || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const transaction = await dbService.createTransaction(
            parseInt(accountId),
            type,
            parseFloat(amount),
            description,
            metadata
        )

        return NextResponse.json({ data: transaction })
    } catch (error) {
        console.error('Error creating transaction:', error)
        return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }
} 