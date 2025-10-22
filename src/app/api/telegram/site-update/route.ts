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
    const body = await request.json();
    const { username, updates, dataType, isNewSite = false } = body;

    if (!username || !updates || !Array.isArray(updates) || updates.length === 0) {
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
        try {
          const traffic = update.changes && update.changes["Traffic Tool"] && update.changes["Traffic Tool"].newValue && update.changes["Traffic Tool"].newValue.toString().trim() !== "" 
            ? update.changes["Traffic Tool"].newValue 
            : "Chưa cập nhật";
          return `${update.site || 'Unknown'} - Traffic: ${traffic}`;
        } catch (error) {
          return `${update.site || 'Unknown'} - Traffic: Chưa cập nhật`;
        }
      }).join('\n');
      
      message = `Site mới nè\n${sitesText}`;
    } else {
      // Format chi tiết cho cập nhật site - gộp tất cả vào 1 tin nhắn
      const updatesText = updates.map(update => {
        try {
          if (!update.changes || typeof update.changes !== 'object') {
            return `🌐 <b>${update.site || 'Unknown'}</b>\n  Không có thay đổi`;
          }

          const changesText = Object.entries(update.changes)
            .filter(([field, changeData]) => {
              return changeData && 
                     typeof changeData === 'object' && 
                     'newValue' in changeData &&
                     changeData.newValue !== null && 
                     changeData.newValue !== undefined && 
                     changeData.newValue !== '' && 
                     field !== 'Site';
            })
            .map(([field, changeData]) => {
              const change = changeData as { oldValue: any; newValue: any };
              const oldValue = change.oldValue === null || change.oldValue === undefined || change.oldValue === '' ? '(trống)' : change.oldValue;
              const newValue = change.newValue === null || change.newValue === undefined || change.newValue === '' ? '(trống)' : change.newValue;
              return `  • <b>${field}:</b> ${oldValue} → ${newValue}`;
            })
            .join('\n');
          
          return `🌐 <b>${update.site || 'Unknown'}</b>\n${changesText || '  Không có thay đổi'}`;
        } catch (error) {
          return `🌐 <b>${update.site || 'Unknown'}</b>\n  Lỗi xử lý dữ liệu`;
        }
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

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(TELEGRAM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: isNewSite ? undefined : 'HTML',
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: 'Failed to parse error response' };
        }
        console.error('Telegram API error:', errorData);
        return NextResponse.json(
          { error: 'Failed to send message to Telegram', details: errorData },
          { status: response.status }
        );
      }

      const result = await response.json();
      return NextResponse.json({ success: true, data: result });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Telegram API timeout');
        return NextResponse.json(
          { error: 'Telegram API timeout' },
          { status: 408 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error sending Telegram message:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
