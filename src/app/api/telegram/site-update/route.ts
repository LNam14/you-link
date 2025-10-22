import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
const CHAT_ID_NEW_SITE = '-1002137432608'; // ID nhóm cho thêm site mới
const CHAT_ID_UPDATE_SITE = '-1002363544059'; // ID nhóm cho cập nhật site
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

interface SiteUpdateData {
  username: string;
  updates: Array<{
    site: string;
    changes: Record<string, { oldValue: any; newValue: any }>;
  }>;
  dataType: 1 | 2; // 1 for VN, 2 for NN
  isNewSite?: boolean; // Flag to indicate if this is a new site
}

export async function POST(request: NextRequest) {
  try {
    const { username, updates, dataType, isNewSite = false }: SiteUpdateData = await request.json();

    if (!username || !updates || updates.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const currentTime = new Date().toLocaleTimeString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const currentDate = new Date().toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const dataTypeText = dataType === 1 ? 'Việt Nam' : 'Nước Ngoài';

    let message: string;

    if (isNewSite) {
      // Format đơn giản cho thêm site mới
      const sitesText = updates.map(update => {
        const traffic = update.changes["Traffic Tool"] && update.changes["Traffic Tool"].newValue && update.changes["Traffic Tool"].newValue.toString().trim() !== "" 
          ? update.changes["Traffic Tool"].newValue 
          : "Chưa cập nhật";
        return `${update.site} - Traffic: ${traffic}`;
      }).join('\n');
      
      message = `Site mới nè\n${sitesText}`;
    } else {
      // Format chi tiết cho cập nhật site - gộp tất cả vào 1 tin nhắn
      const updatesText = updates.map(update => {
        const changesText = Object.entries(update.changes)
          .filter(([field, changeData]) => {
            return changeData && changeData.newValue !== null && changeData.newValue !== undefined && changeData.newValue !== '' && field !== 'Site';
          })
          .map(([field, changeData]) => {
            const oldValue = changeData.oldValue === null || changeData.oldValue === undefined || changeData.oldValue === '' ? '(trống)' : changeData.oldValue;
            const newValue = changeData.newValue === null || changeData.newValue === undefined || changeData.newValue === '' ? '(trống)' : changeData.newValue;
            return `  • <b>${field}:</b> ${oldValue} → ${newValue}`;
          })
          .join('\n');
        
        return `🌐 <b>${update.site}</b>\n${changesText || 'Không có thay đổi'}`;
      }).join('\n\n');

      message = `🔄 <b>CẬP NHẬT SITE</b> 🔄

👤 <b>Người thực hiện:</b> ${username}

📝 <b>Chi tiết cập nhật:</b>

${updatesText}`;
    }

    // Choose the correct chat ID based on whether it's a new site or update
    const chatId = isNewSite ? CHAT_ID_NEW_SITE : CHAT_ID_UPDATE_SITE;
    
    console.log(`📤 Sending ${isNewSite ? 'NEW SITE' : 'UPDATE'} notification to chat ID: ${chatId}`);
    console.log(`📝 Message: ${message}`);

    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: isNewSite ? undefined : 'HTML', // Không dùng HTML cho tin nhắn đơn giản
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
