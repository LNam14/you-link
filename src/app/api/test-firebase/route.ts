import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Firebase connection...');
    
    if (!database) {
      return NextResponse.json({
        success: false,
        error: 'Firebase database is not initialized',
        details: 'Database instance is null or undefined'
      }, { status: 500 });
    }

    // Try to get a simple reference
    const testRef = ref(database, 'test');
    const snapshot = await get(testRef);
    
    return NextResponse.json({
      success: true,
      message: 'Firebase connection successful',
      hasData: snapshot.exists(),
      data: snapshot.val()
    });

  } catch (error: any) {
    console.error('Firebase test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Firebase connection failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
