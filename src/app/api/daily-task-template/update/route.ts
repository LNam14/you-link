import { NextResponse } from 'next/server';
import { prisma, connectDB } from '@/lib/db';
import { cookies } from 'next/headers';
import moment from 'moment';

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Telegram notification
const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
// Group chat ID và topic ID (format: chatId_topicId)
const TASK_CHAT_ID = '-1003124919874'; // Group chat ID (phải có dấu -)
const TASK_TOPIC_ID = 16; // Topic ID trong group
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegramNotification(message: string): Promise<void> {
  console.log('[Telegram] Bắt đầu gửi tin nhắn công việc hàng ngày...');
  console.log('[Telegram] Chat ID:', TASK_CHAT_ID);
  console.log('[Telegram] Topic ID:', TASK_TOPIC_ID);
  console.log('[Telegram] Message:', message);
  console.log('[Telegram] API URL:', TELEGRAM_API_URL);
  
  try {
    const requestBody: any = {
      chat_id: TASK_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    
    // Thêm message_thread_id để gửi đến topic cụ thể trong group
    if (TASK_TOPIC_ID) {
      requestBody.message_thread_id = TASK_TOPIC_ID;
    }
    
    console.log('[Telegram] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseData = await response.json();
    console.log('[Telegram] Response status:', response.status);
    console.log('[Telegram] Response data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok && responseData.ok) {
      console.log('[Telegram] ✅ Tin nhắn đã được gửi thành công!');
    } else {
      console.error('[Telegram] ❌ Gửi tin nhắn thất bại:', responseData);
    }
  } catch (error) {
    console.error('[Telegram] ❌ Lỗi khi gửi tin nhắn:', error);
    if (error instanceof Error) {
      console.error('[Telegram] Error message:', error.message);
      console.error('[Telegram] Error stack:', error.stack);
    }
  }
}

export async function PUT(request: Request) {
  try {
    // Verify user authentication
    const cookieStore = cookies()
    const userInfo = cookieStore.get("userInfo")

    if (!userInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { username } = JSON.parse(userInfo.value)

    if (!username) {
      return NextResponse.json({ error: "Username not found" }, { status: 400 })
    }

    const body = await request.json();
    const { template } = body;
    
    if (!template || !Array.isArray(template)) {
      return NextResponse.json(
        { error: 'Template data is required and must be an array' },
        { status: 400 }
      );
    }

    // Ensure database connection
    await connectDB();

    const currentDate = moment().add(7, 'hours').format("YYYY-MM-DD HH:mm:ss");

    // Check if template exists
    const existingTemplate = await prisma.daily_task_template.findFirst({
      orderBy: {
        updated_at: 'desc'
      }
    });

    let updatedTemplate;
    let newTasks: any[] = [];

    if (existingTemplate) {
      // Update existing template - detect new tasks
      const oldTemplate = typeof existingTemplate.template_data === 'string'
        ? JSON.parse(existingTemplate.template_data)
        : existingTemplate.template_data;
      
      // Find new tasks
      const oldTaskIds = oldTemplate.map((t: any) => t.id);
      newTasks = template.filter((t: any) => !oldTaskIds.includes(t.id));

      updatedTemplate = await prisma.daily_task_template.update({
        where: {
          id: existingTemplate.id
        },
        data: {
          template_data: JSON.stringify(template),
          updated_at: currentDate,
          updated_by: username
        }
      });
    } else {
      // Create new template - all tasks are new
      newTasks = template;

      updatedTemplate = await prisma.daily_task_template.create({
        data: {
          template_data: JSON.stringify(template),
          updated_at: currentDate,
          updated_by: username
        }
      });
    }

    // Send Telegram notification for new tasks
    if (newTasks.length > 0) {
      const userData = JSON.parse(userInfo.value);
      const { role, name } = userData;
      console.log('[Daily Task] Có công việc mới:', newTasks.length, 'công việc');
      console.log('[Daily Task] Role:', role);
      
      if (role === "Admin") {
        const taskNames = newTasks.map(t => t.name).join(', ');
        // Format thời gian thêm (currentDate từ moment)
        const addTime = moment().add(7, 'hours').format("DD/MM/YYYY HH:mm");
        const message = `📅 <b>Công việc hàng ngày mới</b>\n\n<b>Danh sách công việc:</b>\n${taskNames}\n\n<b>Thời gian áp dụng:</b> ${addTime}\n\n⚠️ <b>Mọi người chú ý thực hiện!</b>`;
        console.log('[Daily Task] Chuẩn bị gửi Telegram cho công việc:', taskNames);
        try {
          await sendTelegramNotification(message);
          console.log('[Daily Task] ✅ Đã gọi sendTelegramNotification cho:', taskNames);
        } catch (error) {
          console.error('[Daily Task] ❌ Lỗi khi gọi sendTelegramNotification:', error);
          // Continue even if Telegram fails
        }
      } else {
        console.log('[Daily Task] Không gửi Telegram vì không phải Admin');
      }
    } else {
      console.log('[Daily Task] Không có công việc mới để gửi Telegram');
    }

    const templateData = typeof updatedTemplate.template_data === 'string'
      ? JSON.parse(updatedTemplate.template_data)
      : updatedTemplate.template_data;

    return NextResponse.json({
      template: templateData,
      updatedAt: updatedTemplate.updated_at,
      updatedBy: updatedTemplate.updated_by
    });
  } catch (error: any) {
    console.error('Error updating daily task template:', error);
    return NextResponse.json(
      { error: 'Failed to update daily task template', details: error.message },
      { status: 500 }
    );
  }
}

