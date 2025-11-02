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

async function sendTelegramNotification(message: string, chatId?: string, topicId?: number): Promise<void> {
  const targetChatId = chatId || TASK_CHAT_ID;
  const targetTopicId = topicId !== undefined ? topicId : TASK_TOPIC_ID;
  
  console.log('[Telegram] Bắt đầu gửi tin nhắn công việc tuần (update)...');
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
    const { id, weekData, weekNumber, username: bodyUsername } = body;
    
    // Log để debug
    console.log('[Work Task Update] Username từ body (người được chọn):', bodyUsername);
    console.log('[Work Task Update] Username từ cookie (Admin):', username);
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Ensure database connection
    await connectDB();

    // Check if work task exists
    const existingTask = await prisma.work_task.findUnique({
      where: {
        id: Number(id)
      }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Work task not found' },
        { status: 404 }
      );
    }

    // Verify user owns this task (unless admin)
    const userData = JSON.parse(userInfo.value);
    const { role, position } = userData;
    
    // Nếu Admin hoặc Leader đang update cho user khác (bodyUsername khác existingTask.username)
    // Cần tìm hoặc tạo record mới cho user đó
    const targetUsername = bodyUsername || username;
    
    if ((role === "Admin" || position === "Leader") && bodyUsername && existingTask.username !== bodyUsername) {
      console.log('[Work Task Update] Admin đang update cho user khác. Tìm/tạo record cho:', bodyUsername);
      
      // Tìm record cho user được chọn
      const targetTask = await prisma.work_task.findFirst({
        where: {
          username: bodyUsername,
          week_number: weekNumber?.toString() || existingTask.week_number
        }
      });

      if (targetTask) {
        // Nếu đã có record cho user đó, update record đó
        console.log('[Work Task Update] Đã tìm thấy record cho user:', bodyUsername, 'ID:', targetTask.id);
        
        const currentDate = moment().add(7, 'hours').format("YYYY-MM-DD HH:mm:ss");
        const updateData: any = {
          updated_at: currentDate
        };

        if (weekData) {
          updateData.week_data = JSON.stringify(weekData);
        }

        if (weekNumber) {
          updateData.week_number = weekNumber.toString();
        }

        const updatedTask = await prisma.work_task.update({
          where: {
            id: targetTask.id
          },
          data: updateData
        });

        const formattedData = {
          id: updatedTask.id,
          username: updatedTask.username,
          weekNumber: updatedTask.week_number,
          weekData: typeof updatedTask.week_data === 'string' ? JSON.parse(updatedTask.week_data) : updatedTask.week_data,
          createdAt: updatedTask.created_at,
          updatedAt: updatedTask.updated_at
        };

        // Send Telegram notification when Admin adds new weekly tasks
        if (weekData && weekData.weeklyTasks) {
          try {
            const oldWeekData = typeof targetTask.week_data === 'string' 
              ? JSON.parse(targetTask.week_data) 
              : targetTask.week_data;
            
            const oldTaskIds = (oldWeekData?.weeklyTasks || []).map((t: any) => t.id);
            const newTasks = (weekData.weeklyTasks || []).filter((t: any) => !oldTaskIds.includes(t.id));
            
            if (newTasks.length > 0) {
              const userData = JSON.parse(userInfo.value);
              const { name: creatorName, username: creatorUsername } = userData;
              
              const userAccount = await prisma.account.findUnique({
                where: { username: bodyUsername },
                select: { telegram: true, name: true, position: true }
              });
              
              const assignedName = userAccount?.name || bodyUsername;
              const telegramUsername = userAccount?.telegram || `@${bodyUsername}`;
              const taskNames = newTasks.map((t: any) => t.content || t.title || "Công việc mới").join(', ');
              const currentWeekNumber = weekNumber?.toString() || updatedTask.week_number;
              
              // Tính thời gian áp dụng và thời gian kết thúc
              const addTime = moment().add(7, 'hours').format("DD/MM/YYYY HH:mm");
              
              // Tính ngày chủ nhật (23:59) của tuần từ dateRange hoặc từ tuần hiện tại
              const parsedWeekData = typeof weekData === 'string' ? JSON.parse(weekData) : weekData;
              const parsedUpdatedWeekData = typeof updatedTask.week_data === 'string' ? JSON.parse(updatedTask.week_data) : updatedTask.week_data;
              const weekDataForEndTime = parsedWeekData || parsedUpdatedWeekData;
              let endTime = "";
              if (weekDataForEndTime?.dateRange?.to) {
                // Lấy ngày kết thúc từ dateRange và set 23:59
                const endDate = moment(weekDataForEndTime.dateRange.to, "DD/MM/YYYY").set({ hour: 23, minute: 59 });
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
              const message = `📋 <b>Công việc tuần ${currentWeekNumber}</b>\n\n<b>Danh sách công việc:</b>\n${taskNames}\n\n<b>Thời gian áp dụng:</b> ${addTime}\n<b>Thời gian kết thúc:</b> ${endTime}\n\n<b>Người làm:</b> ${bodyUsername}-${assignedName}\n<b>Người giao:</b> ${creatorUsername}-${creatorName}\n\n⚠️ <b>${telegramUsername} chú ý thực hiện!</b>`;
              
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
                    console.log('[Work Task Update] ✅ Đã gửi Telegram riêng cho người làm (chat_id):', telegramValue);
                  } catch (error) {
                    console.error('[Work Task Update] ❌ Lỗi gửi Telegram riêng:', error);
                  }
                } else {
                  console.log('[Work Task Update] Telegram là username, không gửi riêng được:', telegramValue);
                }
              }
              
              console.log('[Work Task Update] ✅ Đã gửi Telegram cho user khác:', taskNames);
            }
          } catch (error) {
            console.error('[Work Task Update] ❌ Lỗi gửi Telegram:', error);
          }
        }
        
        return NextResponse.json({ data: formattedData });
      } else {
        // Nếu chưa có record, tạo mới
        console.log('[Work Task Update] Chưa có record cho user:', bodyUsername, '- Tạo mới');
        
        const currentDate = moment().add(7, 'hours').format("YYYY-MM-DD HH:mm:ss");
        const completeWeekData = {
          dateRange: weekData?.dateRange || { from: "", to: "" },
          weeklyTasks: weekData?.weeklyTasks || [],
          deXuat: weekData?.deXuat || ["", "", ""],
          dailyTasks: weekData?.dailyTasks || [],
          ...weekData
        };

        const newTask = await prisma.work_task.create({
          data: {
            username: bodyUsername,
            week_number: weekNumber?.toString() || existingTask.week_number,
            week_data: JSON.stringify(completeWeekData),
            created_at: currentDate,
            updated_at: currentDate
          }
        });

        const formattedData = {
          id: newTask.id,
          username: newTask.username,
          weekNumber: newTask.week_number,
          weekData: typeof newTask.week_data === 'string' ? JSON.parse(newTask.week_data) : newTask.week_data,
          createdAt: newTask.created_at,
          updatedAt: newTask.updated_at
        };

        return NextResponse.json({ data: formattedData });
      }
    }
    
    if (role !== "Admin" && existingTask.username !== username && position !== "Leader") {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own tasks' },
        { status: 403 }
      );
    }

    const currentDate = moment().add(7, 'hours').format("YYYY-MM-DD HH:mm:ss");

    const updateData: any = {
      updated_at: currentDate
    };

    if (weekData) {
      updateData.week_data = JSON.stringify(weekData);
    }

    if (weekNumber) {
      updateData.week_number = weekNumber.toString();
    }

    const updatedTask = await prisma.work_task.update({
      where: {
        id: Number(id)
      },
      data: updateData
    });

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Work task not found' },
        { status: 404 }
      );
    }

    const formattedData = {
      id: updatedTask.id,
      username: updatedTask.username,
      weekNumber: updatedTask.week_number,
      weekData: typeof updatedTask.week_data === 'string' ? JSON.parse(updatedTask.week_data) : updatedTask.week_data,
      createdAt: updatedTask.created_at,
      updatedAt: updatedTask.updated_at
    };

    // Send Telegram notification when Admin or Leader adds new weekly tasks
    console.log('[Work Task Update] Role:', role);
    console.log('[Work Task Update] Position:', position);
    console.log('[Work Task Update] Has weekData:', !!weekData);
    console.log('[Work Task Update] Has weeklyTasks:', !!weekData?.weeklyTasks);
    
    if ((role === "Admin" || position === "Leader") && weekData && weekData.weeklyTasks) {
      try {
        const oldWeekData = typeof existingTask.week_data === 'string' 
          ? JSON.parse(existingTask.week_data) 
          : existingTask.week_data;
        
        const oldTaskIds = (oldWeekData?.weeklyTasks || []).map((t: any) => t.id);
        console.log('[Work Task Update] Old task IDs:', oldTaskIds);
        
        const newTasks = (weekData.weeklyTasks || []).filter((t: any) => !oldTaskIds.includes(t.id));
        console.log('[Work Task Update] New tasks found:', newTasks.length);
        console.log('[Work Task Update] New tasks:', newTasks);
        
        if (newTasks.length > 0) {
          const userData = JSON.parse(userInfo.value);
          const { name: creatorName, username: creatorUsername } = userData;
          
          // Get assigned user's telegram username (existingTask.username là người được chọn trong select)
          const assignedUsername = existingTask.username; // Đây là người được chọn, không phải Admin
          console.log('[Work Task Update] Lấy telegram của người được chọn:', assignedUsername);
          
          const userAccount = await prisma.account.findUnique({
            where: { username: assignedUsername },
            select: { telegram: true, name: true, position: true }
          });
          
          const assignedName = userAccount?.name || assignedUsername;
          const telegramUsername = userAccount?.telegram || `@${assignedUsername}`;
          console.log('[Work Task Update] Telegram của người được chọn:', telegramUsername);
          console.log('[Work Task Update] Tên người được chọn:', assignedName);
          console.log('[Work Task Update] Position người được chọn:', userAccount?.position);
          
          const taskNames = newTasks.map((t: any) => t.content || t.title || "Công việc mới").join(', ');
          const currentWeekNumber = weekNumber?.toString() || updatedTask.week_number;
          
          // Tính thời gian áp dụng và thời gian kết thúc
          const addTime = moment().add(7, 'hours').format("DD/MM/YYYY HH:mm");
          
          // Tính ngày chủ nhật (23:59) của tuần từ dateRange hoặc từ tuần hiện tại
          const parsedWeekData = typeof weekData === 'string' ? JSON.parse(weekData) : weekData;
          const parsedUpdatedWeekData = typeof updatedTask.week_data === 'string' ? JSON.parse(updatedTask.week_data) : updatedTask.week_data;
          const weekDataForEndTime = parsedWeekData || parsedUpdatedWeekData;
          let endTime = "";
          if (weekDataForEndTime?.dateRange?.to) {
            // Lấy ngày kết thúc từ dateRange và set 23:59
            const endDate = moment(weekDataForEndTime.dateRange.to, "DD/MM/YYYY").set({ hour: 23, minute: 59 });
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
          const message = `📋 <b>Công việc tuần ${currentWeekNumber}</b>\n\n<b>Danh sách công việc:</b>\n${taskNames}\n\n<b>Thời gian áp dụng:</b> ${addTime}\n<b>Thời gian kết thúc:</b> ${endTime}\n\n<b>Người làm:</b> ${assignedUsername}-${assignedName}\n<b>Người giao:</b> ${creatorUsername}-${creatorName}\n\n⚠️ <b>${telegramUsername} chú ý thực hiện!</b>`;
          
          console.log('[Work Task Update] Chuẩn bị gửi Telegram cho công việc:', taskNames);
          
          // Gửi vào group
          await sendTelegramNotification(message);
          console.log('[Work Task Update] ✅ Đã gọi sendTelegramNotification cho:', taskNames);
          
          // Gửi riêng đến telegram người làm nếu có chat_id (số, không phải username @...)
          if (userAccount?.telegram) {
            const telegramValue = userAccount.telegram.trim();
            // Kiểm tra xem có phải là chat_id (số) không (có thể âm hoặc dương)
            const isChatId = /^-?\d+$/.test(telegramValue);
            if (isChatId) {
              try {
                await sendTelegramNotification(message, telegramValue);
                console.log('[Work Task Update] ✅ Đã gửi Telegram riêng cho người làm (chat_id):', telegramValue);
              } catch (error) {
                console.error('[Work Task Update] ❌ Lỗi gửi Telegram riêng:', error);
              }
            } else {
              console.log('[Work Task Update] Telegram là username, không gửi riêng được:', telegramValue);
            }
          }
        } else {
          console.log('[Work Task Update] Không có công việc mới để gửi Telegram');
        }
      } catch (error) {
        console.error('[Work Task Update] ❌ Lỗi khi gọi sendTelegramNotification:', error);
        if (error instanceof Error) {
          console.error('[Work Task Update] Error message:', error.message);
          console.error('[Work Task Update] Error stack:', error.stack);
        }
        // Continue even if Telegram fails
      }
    } else {
      if (role !== "Admin") {
        console.log('[Work Task Update] Không gửi Telegram vì không phải Admin');
      } else if (!weekData) {
        console.log('[Work Task Update] Không gửi Telegram vì không có weekData');
      } else if (!weekData.weeklyTasks) {
        console.log('[Work Task Update] Không gửi Telegram vì không có weeklyTasks');
      }
    }

    return NextResponse.json({ data: formattedData });
  } catch (error: any) {
    console.error('Error updating work task:', error);
    return NextResponse.json(
      { error: 'Failed to update work task', details: error.message },
      { status: 500 }
    );
  }
}

