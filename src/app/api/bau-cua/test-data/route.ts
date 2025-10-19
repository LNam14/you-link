import { NextRequest, NextResponse } from 'next/server';
import { database, ref, set } from '@/lib/firebase';

export async function POST(request: NextRequest) {
    try {
        // Create test data for today
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
                animal: 'huou',
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
                animal: 'ga',
                timestamp: Date.now(),
                date: today
            }
            // Note: ca, cua, tom are not chosen by anyone (0 choices)
        };

        // Save test data to Firebase
        const choicesRef = ref(database, 'bau-cua-choices');
        await set(choicesRef, testChoices);

        return NextResponse.json({
            success: true,
            message: 'Test data created successfully',
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
