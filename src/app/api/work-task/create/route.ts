import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Telegram notification
const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
// Group chat ID và topic ID (format: chatId_topicId)
const TASK_CHAT_ID = '-1003124919874'; // Group chat ID (phải có dấu -)
const TASK_TOPIC_ID = 16; // Topic ID trong group
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegramNotification(message: string, chatId?: string, topicId?: number): Promise<void> {
  const targetChatId = chatId || TASK_CHAT_ID;
  const targetTopicId = topicId !== undefined ? topicId : TASK_TOPIC_ID;
  
  console.log('[Telegram] Bắt đầu gửi tin nhắn công việc tuần (create)...');
  console.log('[Telegram] Chat ID:', targetChatId);
  console.log('[Telegram] Topic ID:', targetTopicId);
  console.log('[Telegram] Message:', message);
  console.log('[Telegram] API URL:', TELEGRAM_API_URL);
  
  try {
    const requestBody: any = {
      chat_id: targetChatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    
    // Thêm message_thread_id để gửi đến topic cụ thể trong group (chỉ khi gửi vào group)
    if (targetTopicId && chatId === undefined) {
      requestBody.message_thread_id = targetTopicId;
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

export async function POST(request: Request) {
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

    const body = await request.json()
    const { weekNumber, weekData, username: bodyUsername } = body

    if (!weekNumber || !weekData) {
      return NextResponse.json(
        { error: "weekNumber and weekData are required" },
        { status: 400 }
      )
    }

    // Sử dụng username từ body nếu có (Admin chọn nhân viên), nếu không thì dùng username từ cookie
    const targetUsername = bodyUsername || username
    console.log('[Work Task Create] Target username (người được chọn):', targetUsername)
    console.log('[Work Task Create] Username từ cookie (Admin):', username)

    // Ensure database connection
    await connectDB()

    // Check if work task already exists for this user and week
    const existingTask = await prisma.work_task.findFirst({
      where: {
        username: targetUsername,
        week_number: weekNumber.toString()
      }
    })

    // If task already exists, update it instead of creating new one
    if (existingTask) {
      console.log('[Work Task Create] Work task already exists, updating instead. ID:', existingTask.id)
      
      const currentDate = moment().add(7, 'hours').format("YYYY-MM-DD HH:mm:ss")
      const completeWeekData = {
        dateRange: weekData.dateRange || { from: "", to: "" },
        weeklyTasks: weekData.weeklyTasks || [],
        deXuat: weekData.deXuat || ["", "", ""],
        dailyTasks: weekData.dailyTasks || [],
        ...weekData
      }

      // Update the existing task
      const updatedTask = await prisma.work_task.update({
        where: {
          id: existingTask.id
        },
        data: {
          week_data: JSON.stringify(completeWeekData),
          updated_at: currentDate
        }
      })

      const formattedData = {
        id: updatedTask.id,
        username: updatedTask.username,
        weekNumber: updatedTask.week_number,
        weekData: typeof updatedTask.week_data === 'string' ? JSON.parse(updatedTask.week_data) : updatedTask.week_data,
        createdAt: updatedTask.created_at,
        updatedAt: updatedTask.updated_at
      }

      // Send Telegram notification for new tasks (similar to create logic)
      const userData = JSON.parse(userInfo.value);
      const { role, name: creatorName, username: creatorUsername, position } = userData;
      
      if ((role === "Admin" || position === "Leader") && weekData.weeklyTasks) {
        try {
          const oldWeekData = typeof existingTask.week_data === 'string' 
            ? JSON.parse(existingTask.week_data) 
            : existingTask.week_data;
          
          const oldTaskIds = (oldWeekData?.weeklyTasks || []).map((t: any) => t.id);
          const newTasks = (weekData.weeklyTasks || []).filter((t: any) => !oldTaskIds.includes(t.id));
          
          if (newTasks.length > 0) {
            const assignedUsername = updatedTask.username;
            const userAccount = await prisma.account.findUnique({
              where: { username: assignedUsername },
              select: { telegram: true, name: true, position: true }
            });

            const assignedName = userAccount?.name || assignedUsername;
            const telegramUsername = userAccount?.telegram || `@${assignedUsername}`;
            const taskNames = newTasks.map((t: any) => t.content || t.title || "Công việc mới").join(', ');
            
            // Tính thời gian áp dụng và thời gian kết thúc
            const addTime = moment().add(7, 'hours').format("DD/MM/YYYY HH:mm");
            
            // Tính ngày chủ nhật (23:59) của tuần từ dateRange hoặc từ tuần hiện tại
            const parsedWeekData = typeof weekData === 'string' ? JSON.parse(weekData) : weekData;
            let endTime = "";
            if (parsedWeekData?.dateRange?.to) {
              // Lấy ngày kết thúc từ dateRange và set 23:59
              const endDate = moment(parsedWeekData.dateRange.to, "DD/MM/YYYY").set({ hour: 23, minute: 59 });
              endTime = endDate.format("DD/MM/YYYY HH:mm");
            } else {
              // Tính chủ nhật của tuần hiện tại
              const now = moment().add(7, 'hours');
              const dayOfWeek = now.day(); // 0 = CN, 1 = T2, ..., 6 = T7
              const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
              const sundayDate = now.clone().add(daysToSunday, 'days').set({ hour: 23, minute: 59 });
              endTime = sundayDate.format("DD/MM/YYYY HH:mm");
            }
            
            // Format message với số tuần, danh sách công việc, người làm và người giao
            const message = `📋 <b>Công việc tuần ${weekNumber}</b>\n\n<b>Danh sách công việc:</b>\n${taskNames}\n\n<b>Thời gian áp dụng:</b> ${addTime}\n<b>Thời gian kết thúc:</b> ${endTime}\n\n<b>Người làm:</b> ${assignedUsername}-${assignedName}\n<b>Người giao:</b> ${creatorUsername}-${creatorName}\n\n⚠️ <b>${telegramUsername} chú ý thực hiện!</b>`;
            
            // Gửi vào group
            await sendTelegramNotification(message);
            
            // Gửi riêng đến telegram người làm nếu có chat_id (số, không phải username @...)
            if (userAccount?.telegram) {
              const telegramValue = userAccount.telegram.trim();
              // Kiểm tra xem có phải là chat_id (số) không (có thể âm hoặc dương)
              const isChatId = /^-?\d+$/.test(telegramValue);
              if (isChatId) {
                try {
                  await sendTelegramNotification(message, telegramValue);
                  console.log('[Work Task Create] ✅ Đã gửi Telegram riêng cho người làm (chat_id):', telegramValue);
                } catch (error) {
                  console.error('[Work Task Create] ❌ Lỗi gửi Telegram riêng:', error);
                }
              } else {
                console.log('[Work Task Create] Telegram là username, không gửi riêng được:', telegramValue);
              }
            }
            
            console.log('[Work Task Create] ✅ Đã gửi Telegram cho công việc mới:', taskNames);
          }
        } catch (error) {
          console.error('[Work Task Create] ❌ Lỗi gửi Telegram:', error);
        }
      }

      return NextResponse.json({ data: formattedData }, { status: 200 })
    }

    const currentDate = moment().add(7, 'hours').format("YYYY-MM-DD HH:mm:ss")

    // Đảm bảo weekData có đầy đủ structure (nếu thiếu thì thêm các field null/empty)
    const completeWeekData = {
      dateRange: weekData.dateRange || { from: "", to: "" },
      weeklyTasks: weekData.weeklyTasks || [],
      deXuat: weekData.deXuat || ["", "", ""],
      dailyTasks: weekData.dailyTasks || [],
      ...weekData
    }

    console.log('[Work Task Create] Creating new record for:', targetUsername)
    console.log('[Work Task Create] Week number:', weekNumber)
    console.log('[Work Task Create] Complete weekData:', JSON.stringify(completeWeekData, null, 2))

    const workTask = await prisma.work_task.create({
      data: {
        username: targetUsername,
        week_number: weekNumber.toString(),
        week_data: JSON.stringify(completeWeekData),
        created_at: currentDate,
        updated_at: currentDate
      }
    })

    const formattedData = {
      id: workTask.id,
      username: workTask.username,
      weekNumber: workTask.week_number,
      weekData: typeof workTask.week_data === 'string' ? JSON.parse(workTask.week_data) : workTask.week_data,
      createdAt: workTask.created_at,
      updatedAt: workTask.updated_at
    }

    // Send Telegram notification - tag the assigned user
    const userData = JSON.parse(userInfo.value);
    const { role, name: creatorName, username: creatorUsername, position } = userData;
    console.log('[Work Task Create] Role:', role);
    console.log('[Work Task Create] Position:', position);
    console.log('[Work Task Create] Username:', workTask.username);
    
    if (role === "Admin" || position === "Leader") {
      // Get assigned user's telegram username (workTask.username là người được chọn trong select)
      const assignedUsername = workTask.username; // Đây là người được chọn, không phải Admin
      console.log('[Work Task Create] Lấy telegram của người được chọn:', assignedUsername);
      
      const userAccount = await prisma.account.findUnique({
        where: { username: assignedUsername },
        select: { telegram: true, name: true, position: true }
      });

      const assignedName = userAccount?.name || assignedUsername;
      const telegramUsername = userAccount?.telegram || `@${assignedUsername}`;
      console.log('[Work Task Create] Telegram của người được chọn:', telegramUsername);
      console.log('[Work Task Create] Tên người được chọn:', assignedName);
      console.log('[Work Task Create] Position người được chọn:', userAccount?.position);

      // Get week data to extract task content
      const weekData = typeof workTask.week_data === 'string' 
        ? JSON.parse(workTask.week_data) 
        : workTask.week_data;
      
      // Get all weekly tasks
      const weeklyTasks = weekData?.weeklyTasks || [];
      console.log('[Work Task Create] Weekly tasks count:', weeklyTasks.length);
      const taskContents = weeklyTasks
        .map((t: any) => t.content || t.title || "Công việc mới")
        .filter((content: string) => content.trim().length > 0);
      
      const taskList = taskContents.length > 0 
        ? taskContents.join(', ')
        : "nhiệm vụ mới";

      // Tính thời gian áp dụng và thời gian kết thúc
      const addTime = moment().add(7, 'hours').format("DD/MM/YYYY HH:mm");
      
      // Tính ngày chủ nhật (23:59) của tuần từ dateRange hoặc từ tuần hiện tại
      let endTime = "";
      if (weekData?.dateRange?.to) {
        // Lấy ngày kết thúc từ dateRange và set 23:59
        const endDate = moment(weekData.dateRange.to, "DD/MM/YYYY").set({ hour: 23, minute: 59 });
        endTime = endDate.format("DD/MM/YYYY HH:mm");
      } else {
        // Tính chủ nhật của tuần hiện tại
        const now = moment().add(7, 'hours');
        const dayOfWeek = now.day(); // 0 = CN, 1 = T2, ..., 6 = T7
        const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const sundayDate = now.clone().add(daysToSunday, 'days').set({ hour: 23, minute: 59 });
        endTime = sundayDate.format("DD/MM/YYYY HH:mm");
      }

      // Format message với số tuần, danh sách công việc, người làm và người giao
      const message = `📋 <b>Công việc tuần ${weekNumber}</b>\n\n<b>Danh sách công việc:</b>\n${taskList}\n\n<b>Thời gian áp dụng:</b> ${addTime}\n<b>Thời gian kết thúc:</b> ${endTime}\n\n<b>Người làm:</b> ${assignedUsername}-${assignedName}\n<b>Người giao:</b> ${creatorUsername}-${creatorName}\n\n⚠️ <b>${telegramUsername} chú ý thực hiện!</b>`;
      
      console.log('[Work Task Create] Chuẩn bị gửi Telegram cho công việc:', taskList);
      try {
        // Gửi vào group
        await sendTelegramNotification(message);
        console.log('[Work Task Create] ✅ Đã gọi sendTelegramNotification cho:', taskList);
        
        // Gửi riêng đến telegram người làm nếu có chat_id (số, không phải username @...)
        if (userAccount?.telegram) {
          const telegramValue = userAccount.telegram.trim();
          // Kiểm tra xem có phải là chat_id (số) không (có thể âm hoặc dương)
          const isChatId = /^-?\d+$/.test(telegramValue);
          if (isChatId) {
            try {
              await sendTelegramNotification(message, telegramValue);
              console.log('[Work Task Create] ✅ Đã gửi Telegram riêng cho người làm (chat_id):', telegramValue);
            } catch (error) {
              console.error('[Work Task Create] ❌ Lỗi gửi Telegram riêng:', error);
            }
          } else {
            console.log('[Work Task Create] Telegram là username, không gửi riêng được:', telegramValue);
          }
        }
      } catch (error) {
        console.error('[Work Task Create] ❌ Lỗi khi gọi sendTelegramNotification:', error);
        // Continue even if Telegram fails
      }
    } else {
      console.log('[Work Task Create] Không gửi Telegram vì không phải Admin');
    }

    return NextResponse.json(formattedData, { status: 201 })
  } catch (error: any) {
    console.error("Error creating work task:", error)
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to create work task: ${error.message}` },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create work task" },
      { status: 500 }
    )
  }
}

