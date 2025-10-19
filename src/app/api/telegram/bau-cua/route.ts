import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
const CHAT_ID = '-1002298300938'; // ID nhóm bầu cua
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

export async function POST(request: NextRequest) {
  try {
    const { username, name, animal, date, message } = await request.json();

    // If message is provided, send it directly (for results)
    if (message) {
      const response = await fetch(TELEGRAM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Telegram API error:', errorData);
        return NextResponse.json(
          { error: 'Failed to send message to Telegram', details: errorData },
          { status: response.status }
        );
      }

      const result = await response.json();
      return NextResponse.json({ success: true, data: result });
    }

    // Original logic for individual choices
    if (!username || !name || !animal || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }


    const currentTime = new Date().toLocaleTimeString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit'
    });

    const choiceMessage = `🎲 <b>BẦU CUA TÔM CÁ</b> 🎲

👤 <b>Người chơi:</b> ${name} (@${username})
📅 <b>Ngày:</b> ${date}
⏰ <b>Thời gian:</b> ${currentTime}

Chúc may mắn! 🍀`;

    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: choiceMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to send message to Telegram', details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error sending Telegram message:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
