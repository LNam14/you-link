import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment-timezone"

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Telegram notification
const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
const REMIND_CHAT_ID = '-1003124919874'; // Group chat ID để gửi nhắc nhở
const REMIND_TOPIC_ID = 16; // Topic ID trong group
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegramNotification(message: string): Promise<void> {
  console.log('[Weekly Task Remind] Bắt đầu gửi tin nhắn nhắc nhở...');
  console.log('[Weekly Task Remind] Chat ID:', REMIND_CHAT_ID);
  console.log('[Weekly Task Remind] Topic ID:', REMIND_TOPIC_ID);
  console.log('[Weekly Task Remind] Message:', message);
  
  try {
    const requestBody: any = {
      chat_id: REMIND_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    
    // Thêm message_thread_id để gửi đến topic cụ thể trong group
    if (REMIND_TOPIC_ID) {
      requestBody.message_thread_id = REMIND_TOPIC_ID;
    }
    
    console.log('[Weekly Task Remind] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseData = await response.json();
    console.log('[Weekly Task Remind] Response status:', response.status);
    console.log('[Weekly Task Remind] Response data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok && responseData.ok) {
      console.log('[Weekly Task Remind] ✅ Tin nhắn đã được gửi thành công!');
    } else {
      // Xử lý lỗi TOPIC_CLOSED
      if (responseData.error_code === 400 && responseData.description?.includes('TOPIC_CLOSED')) {
        console.error('[Weekly Task Remind] ⚠️ Topic đã bị đóng, không thể gửi tin nhắn:', responseData);
      } else {
        console.error('[Weekly Task Remind] ❌ Gửi tin nhắn thất bại:', responseData);
      }
    }
  } catch (error) {
    console.error('[Weekly Task Remind] ❌ Lỗi khi gửi tin nhắn:', error);
    if (error instanceof Error) {
      console.error('[Weekly Task Remind] Error message:', error.message);
      console.error('[Weekly Task Remind] Error stack:', error.stack);
    }
  }
}

// Tính tuần theo logic ISO (tuần bắt đầu từ Thứ 2)
const getWeekNumber = (date: moment.Moment): number => {
  const d = new Date(Date.UTC(date.year(), date.month(), date.date()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// Kiểm tra và trả về danh sách công việc tuần chưa làm
function getIncompleteWeeklyTasks(weekData: any, username: string, weekNumber: string): string[] {
  const incompleteTasks: string[] = []

  // Kiểm tra đề xuất (deXuat) - phải có đủ 3 đề xuất không rỗng
  const deXuat = weekData.deXuat || []
  const filledDeXuat = deXuat.filter((item: any) => item && String(item).trim().length > 0)
  const hasAllDeXuat = filledDeXuat.length === 3

  console.log(`[Check Weekly Task] ${username} - Week ${weekNumber} - deXuat:`, JSON.stringify(deXuat), 'filled:', filledDeXuat.length, 'hasAll:', hasAllDeXuat)

  if (!hasAllDeXuat) {
    incompleteTasks.push('Đề xuất')
    console.log(`[Check Weekly Task] ${username} - Week ${weekNumber} - Đề xuất chưa đủ (${filledDeXuat.length}/3)`)
  } else {
    console.log(`[Check Weekly Task] ${username} - Week ${weekNumber} - Đề xuất đã đủ`)
  }

  // Kiểm tra các công việc khác (weeklyTasks) - mỗi task phải có employeeNote không rỗng
  const weeklyTasks = weekData.weeklyTasks || []
  const incompleteWeeklyTasks: string[] = []

  weeklyTasks.forEach((task: any) => {
    const taskContent = task.content || ''
    const taskTitle = task.title || 'Công việc khác'
    // Tạo tên công việc: nếu có content thì hiển thị "Công việc khác: {content}", nếu không thì chỉ "Công việc khác"
    const taskName = taskContent.trim() 
      ? `${taskTitle}: ${taskContent.trim()}`
      : taskTitle
    const employeeNote = task.employeeNote || ''
    const hasEmployeeNote = employeeNote.trim().length > 0

    console.log(`[Check Weekly Task] ${username} - Week ${weekNumber} - ${taskName}: employeeNote="${employeeNote}", hasNote: ${hasEmployeeNote}`)

    if (!hasEmployeeNote) {
      incompleteWeeklyTasks.push(taskName)
      console.log(`[Check Weekly Task] ${username} - Week ${weekNumber} - ${taskName} chưa có trả lời`)
    } else {
      console.log(`[Check Weekly Task] ${username} - Week ${weekNumber} - ${taskName} đã có trả lời`)
    }
  })

  incompleteTasks.push(...incompleteWeeklyTasks)

  return incompleteTasks
}

export async function GET(request: Request) {
  try {
    // Verify user authentication
    const cookieStore = cookies()
    const userInfo = cookieStore.get("userInfo")

    // Ensure database connection
    await connectDB()

    // LUÔN LUÔN lấy tuần hiện tại từ hệ thống theo giờ Việt Nam (không phụ thuộc database)
    const today = moment.tz('Asia/Ho_Chi_Minh').format("YYYY-MM-DD")
    const todayDate = moment.tz('Asia/Ho_Chi_Minh')
    const currentWeekNumber = getWeekNumber(todayDate).toString()

    console.log(`[Weekly Task Remind] ⚠️ LUÔN LẤY TUẦN HIỆN TẠI (VN): Week ${currentWeekNumber} (Today: ${today})`)

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

    // Lấy tất cả work task data để tìm dữ liệu cho tuần hiện tại (currentWeekNumber)
    // CHỈ tìm dữ liệu có week_number = currentWeekNumber (tính từ ngày hôm nay)
    const workTasks = await prisma.work_task.findMany({
      orderBy: {
        updated_at: 'desc'
      }
    })

    // Parse và group work task data - CHỈ lấy work_task có week_number = currentWeekNumber
    const workTaskDataByUser: { [username: string]: any } = {}
    
    // Group work tasks theo username
    const workTasksByUsername: { [username: string]: any[] } = {}
    workTasks.forEach((task) => {
      if (!task.username) return
      if (!workTasksByUsername[task.username]) {
        workTasksByUsername[task.username] = []
      }
      workTasksByUsername[task.username].push(task)
    })
    
    // CHỈ tìm work_task có week_number = currentWeekNumber (tuần hiện tại từ moment())
    Object.keys(workTasksByUsername).forEach((username) => {
      const userTasks = workTasksByUsername[username]
      
      // Tìm work_task có week_number = currentWeekNumber (sắp xếp theo updated_at desc)
      for (const task of userTasks) {
        // CHỈ lấy dữ liệu có week_number khớp với tuần hiện tại
        if (task.week_number === currentWeekNumber) {
          const weekData = typeof task.week_data === 'string' ? JSON.parse(task.week_data) : task.week_data
          if (weekData) {
            workTaskDataByUser[username] = weekData
            console.log(`[Parse Data] ${username} - Found week ${currentWeekNumber} data (tuần hiện tại), updated_at: ${task.updated_at}`)
            break // Đã tìm thấy, không cần tìm tiếp
          }
        }
      }
      
      // Nếu không tìm thấy dữ liệu cho tuần hiện tại
      if (!workTaskDataByUser[username]) {
        console.log(`[Parse Data] ${username} - No week data found for week ${currentWeekNumber} (tuần hiện tại)`)
        console.log(`[Parse Data] ${username} - Available week_numbers in DB:`, userTasks.map(t => t.week_number))
      }
    })

    console.log(`[Weekly Task Remind] Total users: ${accounts.length}, Users with data: ${Object.keys(workTaskDataByUser).length}`)

    // Danh sách người chưa làm công việc tuần với chi tiết công việc chưa làm
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

      const weekData = workTaskDataByUser[account.username]
      
      if (!weekData) {
        // Chưa có dữ liệu cho tuần này - chỉ báo đề xuất chưa làm (không báo công việc khác vì chưa có công việc khác được giao)
        usersNotCompleted.push({
          username: account.username,
          name: account.name || account.username,
          telegram: account.telegram || `@${account.username}`,
          incompleteTasks: ['Đề xuất']
        })
        console.log(`[Check User] ${account.username} - No week data found, only check Đề xuất`)
        continue
      }

      // Lấy danh sách công việc chưa làm
      const incompleteTasks = getIncompleteWeeklyTasks(weekData, account.username, currentWeekNumber)
      
      console.log(`[Check User] ${account.username} - Week ${currentWeekNumber} - incompleteTasks:`, incompleteTasks);
      
      if (incompleteTasks.length > 0) {
        usersNotCompleted.push({
          username: account.username,
          name: account.name || account.username,
          telegram: account.telegram || `@${account.username}`,
          incompleteTasks: incompleteTasks
        })
        console.log(`[Check User] ${account.username} - Đã thêm vào danh sách chưa làm`);
      } else {
        console.log(`[Check User] ${account.username} - Đã hoàn thành tất cả công việc tuần`);
      }
    }

    // Gửi tin nhắn nhắc nhở cho những người chưa làm
    if (usersNotCompleted.length > 0) {
      // Tính thời gian còn lại trong tuần theo giờ Việt Nam
      const now = moment.tz('Asia/Ho_Chi_Minh')
      const endOfWeek = moment.tz('Asia/Ho_Chi_Minh').endOf('week').add(1, 'day') // Chủ nhật cuối tuần
      const timeRemaining = moment.duration(endOfWeek.diff(now))
      const daysRemaining = Math.floor(timeRemaining.asDays())
      const hoursRemaining = timeRemaining.hours()
      
      // Format thời gian còn lại
      let timeRemainingText = ''
      if (daysRemaining > 0) {
        timeRemainingText = `${daysRemaining} ngày ${hoursRemaining} giờ`
      } else {
        timeRemainingText = `${hoursRemaining} giờ`
      }

      // Thời gian nhắc nhở theo giờ Việt Nam
      const remindTime = now.format('HH:mm:ss DD/MM/YYYY')

      // Tính ngày kết thúc tuần theo giờ Việt Nam
      const weekEndDate = moment.tz('Asia/Ho_Chi_Minh').endOf('week').add(1, 'day').format('DD/MM/YYYY')

      // Tạo tin nhắn với chi tiết công việc chưa làm
      const messageParts: string[] = []
      messageParts.push('🔔 <b>Nhắc nhở làm công việc tuần</b>')
      messageParts.push(`\n⏰ <b>Thời gian nhắc nhở:</b> ${remindTime}`)
      messageParts.push(`📅 <b>Tuần kết thúc:</b> ${weekEndDate}`)
      messageParts.push(`⏳ <b>Thời gian còn lại:</b> ${timeRemainingText}\n`)

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

      messageParts.push(`\n⚠️ Vui lòng hoàn thành công việc tuần của bạn trong ${timeRemainingText}!`)

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
    console.error("Error checking weekly tasks:", error)
    return NextResponse.json(
      { error: "Failed to check weekly tasks", details: error.message },
      { status: 500 }
    )
  }
}

