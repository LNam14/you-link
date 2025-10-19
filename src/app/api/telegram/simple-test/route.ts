import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Simple test starting...');
    
    // Test message
    const testMessage = `
🤖 <b>SIMPLE TEST MESSAGE</b>

Đây là tin nhắn test đơn giản.

<b>Thời gian:</b> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}

<b>Trạng thái:</b> Bot hoạt động bình thường ✅

<i>Tin nhắn này được gửi để kiểm tra kết nối cơ bản.</i>
    `;

    // Send test message
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ylink.shop'}/api/telegram/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: testMessage }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({
        success: false,
        error: 'Failed to send test message',
        details: errorData
      }, { status: 500 });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Simple test completed successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Simple test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Simple test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
