import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
const CHAT_ID_NEW_SITE = '-1002137432608'; // ID nhóm cho thêm site mới
const CHAT_ID_UPDATE_SITE = '-1002363544059'; // ID nhóm cho cập nhật site
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// Alternative endpoints to try if main one fails
const TELEGRAM_ENDPOINTS = [
  `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
  `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
  `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
];

interface SiteUpdateData {
  username: string;
  updates: Array<{
    site: string;
    changes: Record<string, { oldValue: any; newValue: any }>;
  }>;
  dataType: 1 | 2; // 1 for VN, 2 for NN
  isNewSite?: boolean; // Flag to indicate if this is a new site
}

// Helper function to add wheel reward
async function addWheelReward(username: string, reward: string = "1.000") {
  try {
    console.log(`🎰 Adding wheel reward for ${username}: ${reward}`);
    
    // Get current date in Vietnam timezone
    const currentDate = new Date().toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Format date to YYYY-MM-DD
    const [day, month, year] = currentDate.split('/');
    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    const result = await prisma.wheel.create({
      data: {
        username,
        reward,
        date: formattedDate
      }
    });
    
    console.log(`✅ Wheel reward added successfully:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error adding wheel reward:', error);
    // Don't throw error to avoid breaking the main flow
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Telegram API called');
    const body = await request.json();
    console.log('📥 Request body:', JSON.stringify(body, null, 2));
    
    const { username, updates, dataType, isNewSite = false } = body;

    if (!username || !updates || !Array.isArray(updates) || updates.length === 0) {
      console.error('❌ Missing required fields:', { username, updates, dataType, isNewSite });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('✅ Validation passed:', { username, updatesCount: updates.length, dataType, isNewSite });

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
                     'oldValue' in changeData &&
                     field !== 'Site' &&
                     // Include changes where oldValue and newValue are different
                     (changeData.oldValue !== changeData.newValue);
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
    console.log(`📝 Message length: ${message.length} characters`);
    console.log(`📝 Message preview: ${message.substring(0, 200)}...`);
    
    // Test bot token first
    console.log('🔍 Testing bot token...');
    try {
      const testResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
      const testData = await testResponse.json();
      console.log('🤖 Bot info:', testData);
      
      if (!testData.ok) {
        console.error('❌ Bot token invalid:', testData);
        return NextResponse.json({ error: 'Invalid bot token' }, { status: 500 });
      }
    } catch (testError) {
      console.error('❌ Bot token test failed:', testError);
      return NextResponse.json({ error: 'Bot token test failed' }, { status: 500 });
    }

    // Try multiple approaches to send message
    const sendMessage = async (retryCount = 0): Promise<any> => {
      const maxRetries = 1; // Further reduced retries
      
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced to 5 seconds

        const response = await fetch(TELEGRAM_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
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
          throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        console.log('✅ Telegram message sent successfully:', result);
        
        // Calculate reward: 1 site = 1.000 VND, 2 sites = 2.000 VND
        const numSites = updates.length;
        const rewardAmount = `${numSites}.000`;
        console.log(`💰 Adding reward for ${numSites} site(s): ${rewardAmount} VND`);
        
        // Add wheel reward after successful message send
        const wheelResult = await addWheelReward(username, rewardAmount);
        
        if (wheelResult) {
          console.log(`✅ Successfully added ${rewardAmount} VND to ${username}'s income`);
        }
        
        return result;
      } catch (error: any) {
        console.error(`❌ Attempt ${retryCount + 1} failed:`, error.message);
        
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying in ${(retryCount + 1) * 1} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
          return sendMessage(retryCount + 1);
        }
        
        throw error;
      }
    };

    try {
      const result = await sendMessage();
      return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
      console.error('❌ All attempts failed:', error.message);
      
      // Try alternative method using form data
      try {
        console.log('🔄 Trying alternative method with form data...');
        const formData = new URLSearchParams();
        formData.append('chat_id', chatId);
        formData.append('text', message);
        if (!isNewSite) {
          formData.append('parse_mode', 'HTML');
        }
        formData.append('disable_web_page_preview', 'true');
        
        const alternativeResult = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: formData,
        });
        
        if (alternativeResult.ok) {
          const result = await alternativeResult.json();
          console.log('✅ Alternative method succeeded:', result);
          
          // Calculate reward: 1 site = 1.000 VND, 2 sites = 2.000 VND
          const numSites = updates.length;
          const rewardAmount = (numSites * 1).toFixed(3).replace('.', ',') + '.000';
          console.log(`💰 Adding reward for ${numSites} site(s): ${rewardAmount} VND`);
          
          // Add wheel reward after successful message send
          const wheelResult = await addWheelReward(username, rewardAmount);
          
          if (wheelResult) {
            console.log(`✅ Successfully added ${rewardAmount} VND to ${username}'s income`);
          }
          
          return NextResponse.json({ success: true, data: result });
        } else {
          console.error('❌ Alternative method failed with status:', alternativeResult.status);
        }
      } catch (altError) {
        console.error('❌ Alternative method also failed:', altError);
      }
      
      // Try third method with minimal headers
      try {
        console.log('🔄 Trying third method with minimal headers...');
        const minimalResult = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          body: new URLSearchParams({
            chat_id: chatId,
            text: message,
            ...(isNewSite ? {} : { parse_mode: 'HTML' }),
            disable_web_page_preview: 'true',
          }),
        });
        
        if (minimalResult.ok) {
          const result = await minimalResult.json();
          console.log('✅ Minimal method succeeded:', result);
          
          // Calculate reward: 1 site = 1.000 VND, 2 sites = 2.000 VND
          const numSites = updates.length;
          const rewardAmount = (numSites * 1).toFixed(3).replace('.', ',') + '.000';
          console.log(`💰 Adding reward for ${numSites} site(s): ${rewardAmount} VND`);
          
          // Add wheel reward after successful message send
          const wheelResult = await addWheelReward(username, rewardAmount);
          
          if (wheelResult) {
            console.log(`✅ Successfully added ${rewardAmount} VND to ${username}'s income`);
          }
          
          return NextResponse.json({ success: true, data: result });
        }
      } catch (minimalError) {
        console.error('❌ Minimal method also failed:', minimalError);
      }
      
      // If all methods fail, return success but log the error
      console.error('❌ All Telegram methods failed, but continuing...');
      return NextResponse.json({ 
        success: true, 
        warning: 'Telegram notification failed but operation completed',
        error: error.message 
      });
    }
  } catch (error: any) {
    console.error('Error sending Telegram message:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
