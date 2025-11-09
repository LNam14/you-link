import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Telegram notification
const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
const REMIND_CHAT_ID = '-1003124919874_16'; // Group chat ID để gửi nhắc nhở
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegramNotification(message: string): Promise<void> {
  console.log('[Daily Task Remind] Bắt đầu gửi tin nhắn nhắc nhở...');
  console.log('[Daily Task Remind] Chat ID:', REMIND_CHAT_ID);
  console.log('[Daily Task Remind] Message:', message);
  
  try {
    const requestBody: any = {
      chat_id: REMIND_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    
    console.log('[Daily Task Remind] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseData = await response.json();
    console.log('[Daily Task Remind] Response status:', response.status);
    console.log('[Daily Task Remind] Response data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok && responseData.ok) {
      console.log('[Daily Task Remind] ✅ Tin nhắn đã được gửi thành công!');
    } else {
      console.error('[Daily Task Remind] ❌ Gửi tin nhắn thất bại:', responseData);
    }
  } catch (error) {
    console.error('[Daily Task Remind] ❌ Lỗi khi gửi tin nhắn:', error);
    if (error instanceof Error) {
      console.error('[Daily Task Remind] Error message:', error.message);
      console.error('[Daily Task Remind] Error stack:', error.stack);
    }
  }
}

// Kiểm tra và trả về danh sách công việc chưa làm
function getIncompleteTasks(dailyTask: any, dailyTaskTemplate: any[], username: string, date: string): string[] {
  const incompleteTasks: string[] = [];

  // Kiểm tra spamMKT - phải có ít nhất 1 mục không rỗng
  let spamMKT = dailyTask.spamMKT;
  
  console.log(`[Check Task] ${username} - ${date} - Raw spamMKT:`, spamMKT, 'Type:', typeof spamMKT, 'IsArray:', Array.isArray(spamMKT));
  
  // Đảm bảo spamMKT là array
  if (!Array.isArray(spamMKT)) {
    console.log(`[Check Task] ${username} - ${date} - spamMKT is not array, converting to array`);
    spamMKT = [];
  }
  
  // Kiểm tra xem có ít nhất 1 mục không rỗng không
  const hasSpamMKT = spamMKT.length > 0 && spamMKT.some((item: any) => {
    if (item === null || item === undefined) {
      console.log(`[Check Task] ${username} - ${date} - spamMKT item is null/undefined:`, item);
      return false;
    }
    const itemStr = String(item);
    const trimmed = itemStr.trim();
    const isValid = trimmed !== '';
    console.log(`[Check Task] ${username} - ${date} - spamMKT item: "${item}" -> "${trimmed}" -> isValid: ${isValid}`);
    return isValid;
  });
  
  console.log(`[Check Task] ${username} - ${date} - spamMKT:`, JSON.stringify(spamMKT), 'length:', spamMKT.length, 'hasSpamMKT:', hasSpamMKT);
  
  if (!hasSpamMKT) {
    console.log(`[Check Task] ${username} - ${date} - Spam MKT chưa làm -> thêm vào incompleteTasks`);
    incompleteTasks.push('Spam MKT');
  } else {
    console.log(`[Check Task] ${username} - ${date} - Spam MKT đã làm -> KHÔNG thêm vào incompleteTasks`);
  }

  // Kiểm tra các custom tasks
  for (const task of dailyTaskTemplate) {
    const taskValue = dailyTask[task.id];
    const taskName = task.name || task.id;
    
    if (task.type === 'boolean') {
      // Nếu là boolean task, phải là true (chính xác true, không phải truthy)
      if (taskValue !== true) {
        incompleteTasks.push(taskName);
        console.log(`[Check Task] ${username} - ${date} - ${taskName} (boolean): chưa làm (value: ${taskValue})`);
      } else {
        console.log(`[Check Task] ${username} - ${date} - ${taskName} (boolean): đã làm`);
      }
    } else if (task.type === 'text') {
      // Nếu là text task, phải có ít nhất 1 mục không rỗng
      let textInputs = taskValue;
      if (!Array.isArray(textInputs)) {
        textInputs = [];
      }
      const hasTextContent = textInputs.length > 0 && textInputs.some((item: any) => {
        if (item === null || item === undefined) return false;
        const itemStr = String(item);
        return itemStr.trim() !== '';
      });
      
      if (!hasTextContent) {
        incompleteTasks.push(taskName);
        console.log(`[Check Task] ${username} - ${date} - ${taskName} (text): chưa làm (value:`, JSON.stringify(textInputs), ')');
      } else {
        console.log(`[Check Task] ${username} - ${date} - ${taskName} (text): đã làm`);
      }
    }
  }

  return incompleteTasks;
}

export async function GET(request: Request) {
  try {
    // Verify user authentication
    const cookieStore = cookies()
    const userInfo = cookieStore.get("userInfo")


    // Ensure database connection
    await connectDB()

    // Lấy ngày hôm nay
    const today = moment().format("YYYY-MM-DD")
    const todayDate = moment(today)
    
    // Lấy số tuần hiện tại
    const currentWeekNumber = todayDate.week().toString()
    const weekKey = `week_${currentWeekNumber}`

    // Lấy tất cả nhân viên
    const accounts = await prisma.account.findMany({
      where: {
        role: "Nhân viên"
      },
      select: {
        username: true,
        name: true,
        telegram: true
      }
    })

    // Lấy daily task template
    const template = await prisma.daily_task_template.findFirst({
      orderBy: {
        updated_at: 'desc'
      }
    })

    if (!template) {
      return NextResponse.json({ 
        success: true, 
        message: "Không có template công việc hàng ngày",
        reminded: []
      }, { status: 200 })
    }

    const dailyTaskTemplate = typeof template.template_data === 'string' 
      ? JSON.parse(template.template_data) 
      : template.template_data

    // Lấy work task data của tất cả users
    const workTasks = await prisma.work_task.findMany({
      where: {
        week_number: currentWeekNumber
      }
    })

    // Parse và group work task data - lấy record mới nhất cho mỗi user
    const workTaskDataByUser: { [username: string]: any } = {}
    const workTaskRecordsByUser: { [username: string]: any } = {}
    
    // Tìm record mới nhất cho mỗi user
    workTasks.forEach((task) => {
      if (!task.username) return
      
      if (!workTaskRecordsByUser[task.username] || 
          new Date(task.updated_at) > new Date(workTaskRecordsByUser[task.username].updated_at)) {
        workTaskRecordsByUser[task.username] = task
      }
    })
    
    // Parse dữ liệu từ record mới nhất
    Object.keys(workTaskRecordsByUser).forEach((username) => {
      const task = workTaskRecordsByUser[username]
      const weekData = typeof task.week_data === 'string' ? JSON.parse(task.week_data) : task.week_data
      if (weekData && weekData.dailyTasks) {
        workTaskDataByUser[username] = weekData.dailyTasks
        console.log(`[Parse Data] ${username} - Found ${weekData.dailyTasks.length} dailyTasks, updated_at: ${task.updated_at}`)
      }
    })

    console.log(`[Daily Task Remind] Today: ${today}, Week: ${currentWeekNumber}`)
    console.log(`[Daily Task Remind] Total users: ${accounts.length}, Users with data: ${Object.keys(workTaskDataByUser).length}`)

    // Danh sách người chưa làm công việc với chi tiết công việc chưa làm
    const usersNotCompleted: Array<{
      username: string
      name: string
      telegram: string
      incompleteTasks: string[]
    }> = []

    // Kiểm tra từng user
    for (const account of accounts) {
      if (!account.username) continue
      
      // Bỏ qua user BH20 (không áp dụng nhắc nhở và xử phạt)
      if (account.username === "BH20") {
        console.log(`[Skip User] ${account.username} - Bỏ qua nhắc nhở và xử phạt`)
        continue
      }

      const dailyTasks = workTaskDataByUser[account.username] || []
      console.log(`[Check User] ${account.username} - Total dailyTasks: ${dailyTasks.length}`)
      
      const todayTask = dailyTasks.find((task: any) => task.date === today)
      
      console.log(`[Check User] ${account.username} - Looking for date: ${today}`)
      if (todayTask) {
        console.log(`[Check User] ${account.username} - Found todayTask:`, JSON.stringify(todayTask))
      } else {
        console.log(`[Check User] ${account.username} - No todayTask found. Available dates:`, dailyTasks.map((t: any) => t.date))
      }

      if (!todayTask) {
        // Chưa có dữ liệu cho ngày hôm nay - tất cả công việc đều chưa làm
        const allTasks = ['Spam MKT', ...dailyTaskTemplate.map((t: any) => t.name || t.id)]
        usersNotCompleted.push({
          username: account.username,
          name: account.name || account.username,
          telegram: account.telegram || `@${account.username}`,
          incompleteTasks: allTasks
        })
        continue
      }

      // Lấy danh sách công việc chưa làm
      const incompleteTasks = getIncompleteTasks(todayTask, dailyTaskTemplate, account.username, today)
      
      console.log(`[Check User] ${account.username} - ${today} - incompleteTasks:`, incompleteTasks);
      
      if (incompleteTasks.length > 0) {
        usersNotCompleted.push({
          username: account.username,
          name: account.name || account.username,
          telegram: account.telegram || `@${account.username}`,
          incompleteTasks: incompleteTasks
        })
        console.log(`[Check User] ${account.username} - Đã thêm vào danh sách chưa làm`);
      } else {
        console.log(`[Check User] ${account.username} - Đã hoàn thành tất cả công việc`);
      }
    }

    // Gửi tin nhắn nhắc nhở cho những người chưa làm
    if (usersNotCompleted.length > 0) {
      // Tính thời gian còn lại trong ngày
      const now = moment()
      const endOfDay = moment().endOf('day')
      const timeRemaining = moment.duration(endOfDay.diff(now))
      const hoursRemaining = Math.floor(timeRemaining.asHours())
      const minutesRemaining = timeRemaining.minutes()
      
      // Format thời gian còn lại
      let timeRemainingText = ''
      if (hoursRemaining > 0) {
        timeRemainingText = `${hoursRemaining} giờ ${minutesRemaining} phút`
      } else {
        timeRemainingText = `${minutesRemaining} phút`
      }

      // Thời gian nhắc nhở
      const remindTime = now.format('HH:mm:ss DD/MM/YYYY')

      // Tạo tin nhắn với chi tiết công việc chưa làm
      const messageParts: string[] = []
      messageParts.push('🔔 <b>Nhắc nhở làm công việc hàng ngày</b>')
      messageParts.push(`\n⏰ <b>Thời gian nhắc nhở:</b> ${remindTime}`)
      messageParts.push(`⏳ <b>Thời gian còn lại trong ngày:</b> ${timeRemainingText}\n`)

      // Nhóm theo công việc chưa làm
      const tasksMap: { [taskName: string]: Array<{ username: string, name: string, telegram: string }> } = {}
      
      usersNotCompleted.forEach(user => {
        user.incompleteTasks.forEach(taskName => {
          if (!tasksMap[taskName]) {
            tasksMap[taskName] = []
          }
          // Kiểm tra xem user đã có trong danh sách chưa (tránh duplicate)
          const existingUser = tasksMap[taskName].find(u => u.username === user.username)
          if (!existingUser) {
            tasksMap[taskName].push({
              username: user.username,
              name: user.name,
              telegram: user.telegram
            })
          }
        })
      })

      // Tạo danh sách theo từng công việc
      for (const [taskName, users] of Object.entries(tasksMap)) {
        messageParts.push(`\n<b>${taskName}:</b>`)
        users.forEach(user => {
          const telegramMention = user.telegram.startsWith('@') ? user.telegram : `@${user.telegram}`
          messageParts.push(`  • <b>${user.username}-${user.name}</b> ${telegramMention}`)
        })
      }

      messageParts.push(`\n⚠️ Vui lòng hoàn thành công việc hàng ngày của bạn trong ${timeRemainingText}!`)

      const message = messageParts.join('\n')
      await sendTelegramNotification(message)
    }

    return NextResponse.json({
      success: true,
      message: `Đã kiểm tra và gửi nhắc nhở cho ${usersNotCompleted.length} người`,
      reminded: usersNotCompleted.map(u => ({
        username: u.username,
        name: u.name,
        telegram: u.telegram,
        incompleteTasks: u.incompleteTasks
      })),
      total: accounts.length,
      notCompleted: usersNotCompleted.length
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error checking daily tasks:", error)
    return NextResponse.json(
      { error: "Failed to check daily tasks", details: error.message },
      { status: 500 }
    )
  }
}

