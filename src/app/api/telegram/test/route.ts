import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Telegram bot functionality...');

    // Test message
    const testMessage = `
🤖 <b>TEST MESSAGE</b>

Đây là tin nhắn test từ bot Telegram.

<b>Thời gian:</b> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}

<b>Trạng thái:</b> Bot hoạt động bình thường ✅

<i>Tin nhắn này được gửi để kiểm tra kết nối.</i>
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
      message: 'Test message sent successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in test:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
