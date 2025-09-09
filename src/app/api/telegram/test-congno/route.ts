import { NextRequest, NextResponse } from 'next/server';
import sheetApiRequest from '@/apiRequests/sheet';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing cong no data...');
    
    // Test direct API call
    const congNoResponse: any = await sheetApiRequest.getCongNo();
    console.log('Direct API response:', JSON.stringify(congNoResponse, null, 2));
    
    const congNoData = congNoResponse.content || [];
    console.log(`Found ${congNoData.length} cong no records`);
    
    if (congNoData.length > 0) {
      console.log('Sample records:', congNoData.slice(0, 5));
    }

    return NextResponse.json({
      success: true,
      totalRecords: congNoData.length,
      sampleData: congNoData.slice(0, 5),
      fullResponse: congNoResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cong no test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Cong no test failed',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
