import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

const dbService = DatabaseService.getInstance();

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const email = searchParams.get('email');

        if (id) {
            const account = await dbService.getAccountById(parseInt(id));
            return NextResponse.json({ data: account });
        } else if (email) {
            const account = await dbService.getAccountByEmail(email);
            return NextResponse.json({ data: account });
        } else {
            return NextResponse.json({ error: 'Either id or email is required' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error fetching account:', error);
        return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, email, passwordHash, role } = body;

        if (!username || !email || !passwordHash) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const account = await dbService.createAccount(username, email, passwordHash, role);
        return NextResponse.json({ data: account });
    } catch (error) {
        console.error('Error creating account:', error);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }
} 