import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Telegram notification cho đề xuất
const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
const DEXUAT_CHAT_ID_WITH_TOPIC = '-1003124919874_156'; // Group chat ID với topic ID (format: chatId_topicId)
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendDeXuatTelegramNotification(message: string): Promise<void> {
  // Parse chat_id và message_thread_id từ format: -1003124919874_156
  const parts = DEXUAT_CHAT_ID_WITH_TOPIC.split('_');
  const chatId = parts[0]; // -1003124919874
  const topicId = parts.length > 1 ? Number.parseInt(parts[1], 10) : undefined; // 156
  
  console.log('[DeXuat Notify] Bắt đầu gửi tin nhắn đề xuất...');
  console.log('[DeXuat Notify] Chat ID:', chatId);
  console.log('[DeXuat Notify] Topic ID:', topicId);
  console.log('[DeXuat Notify] Message:', message);
  
  try {
    const requestBody: any = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    
    // Thêm message_thread_id nếu có topic ID
    if (topicId) {
      requestBody.message_thread_id = topicId;
    }
    
    console.log('[DeXuat Notify] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseData = await response.json();
    console.log('[DeXuat Notify] Response status:', response.status);
    console.log('[DeXuat Notify] Response data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok && responseData.ok) {
      console.log('[DeXuat Notify] ✅ Tin nhắn đã được gửi thành công!');
    } else {
      console.error('[DeXuat Notify] ❌ Gửi tin nhắn thất bại:', responseData);
    }
  } catch (error) {
    console.error('[DeXuat Notify] ❌ Lỗi khi gửi tin nhắn:', error);
    if (error instanceof Error) {
      console.error('[DeXuat Notify] Error message:', error.message);
      console.error('[DeXuat Notify] Error stack:', error.stack);
    }
  }
}

export async function POST(request: Request) {
  try {
    // Verify user authentication
    const cookieStore = cookies()
    const userInfo = cookieStore.get("userInfo")

    if (!userInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { username, name, content } = body

    if (!username || !content || !content.trim()) {
      return NextResponse.json(
        { error: "Username and content are required" },
        { status: 400 }
      )
    }

    // Tạo tin nhắn với format: Tiêu đề Đề xuất + Nội dung + username-name
    const displayName = name ? `${username}-${name}` : username
    const message = `💡 <b>Đề xuất</b>\n\n<b>Nội dung:</b> ${content.trim()}\n\n<b>${displayName}</b>`

    // Gửi tin nhắn Telegram
    await sendDeXuatTelegramNotification(message)

    return NextResponse.json({
      success: true,
      message: "Đã gửi đề xuất đến Telegram"
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error sending deXuat notification:", error)
    return NextResponse.json(
      { error: "Failed to send deXuat notification", details: error.message },
      { status: 500 }
    )
  }
}

