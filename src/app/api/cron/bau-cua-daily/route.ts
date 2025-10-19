import { NextRequest, NextResponse } from 'next/server';
import { bauCuaApiService } from '@/apiServices/bau-cua';

export async function GET(request: NextRequest) {
    try {
        // Verify this is a cron request (you can add authentication here)
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if it's around 12:11 (allow 5 minutes tolerance)
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // Only run between 12:11 and 12:16
        if (hour !== 12 || minute < 11 || minute > 16) {
            return NextResponse.json({ 
                message: 'Not the right time to run. Current time: ' + now.toLocaleString('vi-VN'),
                shouldRun: false 
            });
        }

        // Call the process result API
        const result = await bauCuaApiService.processResult();

        return NextResponse.json({
            success: true,
            message: 'Bau cua daily result processed successfully (wheel rewards created automatically)',
            timestamp: now.toISOString(),
            result: result.result
        });

    } catch (error: any) {
        console.error('Error in bau cua daily cron:', error);
        return NextResponse.json(
            { 
                error: 'Cron job failed', 
                details: error.message,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
    try {
        // For manual triggers, you might want different auth
        const { manual } = await request.json();
        
        if (!manual) {
            return NextResponse.json({ error: 'Manual trigger required' }, { status: 400 });
        }

        // Call the process result API
        const processResultResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ylink.shop'}/api/bau-cua/process-result`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!processResultResponse.ok) {
            const errorData = await processResultResponse.json();
            throw new Error(`Process result failed: ${JSON.stringify(errorData)}`);
        }

        const result = await processResultResponse.json();

        return NextResponse.json({
            success: true,
            message: 'Bau cua result processed manually',
            timestamp: new Date().toISOString(),
            result: result.result
        });

    } catch (error: any) {
        console.error('Error in manual bau cua processing:', error);
        return NextResponse.json(
            { 
                error: 'Manual processing failed', 
                details: error.message,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
