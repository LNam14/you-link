import { NextRequest, NextResponse } from 'next/server';
import { database, ref, set } from '@/lib/firebase';

export async function POST(request: NextRequest) {
    try {
        // Create test data where multiple animals have the same lowest count
        const today = new Date().toISOString().split('T')[0];
        
        const testChoices = {
            'user1': {
                id: 'user1',
                username: 'testuser1',
                name: 'Test User 1',
                animal: 'huou',
                timestamp: Date.now(),
                date: today
            },
            'user2': {
                id: 'user2',
                username: 'testuser2',
                name: 'Test User 2',
                animal: 'bau',
                timestamp: Date.now(),
                date: today
            },
            'user3': {
                id: 'user3',
                username: 'testuser3',
                name: 'Test User 3',
                animal: 'bau',
                timestamp: Date.now(),
                date: today
            },
            'user4': {
                id: 'user4',
                username: 'testuser4',
                name: 'Test User 4',
                animal: 'ga',
                timestamp: Date.now(),
                date: today
            },
            'user5': {
                id: 'user5',
                username: 'testuser5',
                name: 'Test User 5',
                animal: 'ga',
                timestamp: Date.now(),
                date: today
            },
            'user6': {
                id: 'user6',
                username: 'testuser6',
                name: 'Test User 6',
                animal: 'ca',
                timestamp: Date.now(),
                date: today
            },
            'user7': {
                id: 'user7',
                username: 'testuser7',
                name: 'Test User 7',
                animal: 'cua',
                timestamp: Date.now(),
                date: today
            },
            'user8': {
                id: 'user8',
                username: 'testuser8',
                name: 'Test User 8',
                animal: 'cua',
                timestamp: Date.now(),
                date: today
            },
            'user9': {
                id: 'user9',
                username: 'testuser9',
                name: 'Test User 9',
                animal: 'tom',
                timestamp: Date.now(),
                date: today
            }
            // Result: huou(1), bau(2), ga(2), ca(1), cua(2), tom(1)
            // Winners: huou, ca, tom (all have 1 choice each)
            // Total winners: 3 people
            // Prize per person: 1,000,000 / 3 = 333,333 VND
        };

        // Save test data to Firebase
        const choicesRef = ref(database, 'bau-cua-choices');
        await set(choicesRef, testChoices);

        return NextResponse.json({
            success: true,
            message: 'Test data created successfully (multiple winners scenario)',
            data: testChoices
        });

    } catch (error: any) {
        console.error('Error creating test data:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
