import { NextRequest, NextResponse } from 'next/server';
import wheelApiRequest from '@/apiRequests/wheel';

interface WheelReward {
    username: string;
    reward: string;
}

export async function POST(request: NextRequest) {
    try {
        const { wheelRewards } = await request.json();

        if (!wheelRewards || !Array.isArray(wheelRewards)) {
            return NextResponse.json({ error: 'wheelRewards array is required' }, { status: 400 });
        }

        // Create wheel rewards for each winner
        const wheelPromises = wheelRewards.map(async (reward: WheelReward) => {
            try {
                await wheelApiRequest.create({
                    username: reward.username,
                    reward: reward.reward
                });
                return { success: true, username: reward.username, reward: reward.reward };
            } catch (error) {
                console.error(`Error creating wheel reward for ${reward.username}:`, error);
                return { success: false, username: reward.username, error: error };
            }
        });

        const wheelResults = await Promise.all(wheelPromises);
        const successfulRewards = wheelResults.filter(result => result.success);
        const failedRewards = wheelResults.filter(result => !result.success);

        return NextResponse.json({
            success: true,
            results: {
                total: wheelRewards.length,
                successful: successfulRewards.length,
                failed: failedRewards.length,
                details: wheelResults
            }
        });

    } catch (error: any) {
        console.error('Error creating wheel rewards:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
