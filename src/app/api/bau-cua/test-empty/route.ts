import { NextRequest, NextResponse } from 'next/server';
import { database, ref, set } from '@/lib/firebase';

export async function POST(request: NextRequest) {
    try {
        // Create empty test data for today (no choices)
        const today = new Date().toISOString().split('T')[0];
        
        const emptyChoices = {};

        // Save empty data to Firebase
        const choicesRef = ref(database, 'bau-cua-choices');
        await set(choicesRef, emptyChoices);

        return NextResponse.json({
            success: true,
            message: 'Empty test data created successfully (no one chose any animal)',
            data: emptyChoices
        });

    } catch (error: any) {
        console.error('Error creating empty test data:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
