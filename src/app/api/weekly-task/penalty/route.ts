import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment-timezone"

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Telegram notification
const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
const PENALTY_CHAT_ID = '-1003124919874'; // Group chat ID để gửi xử phạt
const PENALTY_TOPIC_ID = 191; // Topic ID trong group
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegramNotification(message: string): Promise<void> {
  console.log('[Weekly Task Penalty] Bắt đầu gửi tin nhắn xử phạt...');
  console.log('[Weekly Task Penalty] Chat ID:', PENALTY_CHAT_ID);
  console.log('[Weekly Task Penalty] Topic ID:', PENALTY_TOPIC_ID);
  console.log('[Weekly Task Penalty] Message:', message);
  
  try {
    const requestBody: any = {
      chat_id: PENALTY_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    
    // Thêm message_thread_id để gửi đến topic cụ thể trong group
    if (PENALTY_TOPIC_ID) {
      requestBody.message_thread_id = PENALTY_TOPIC_ID;
    }
    
    console.log('[Weekly Task Penalty] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseData = await response.json();
    console.log('[Weekly Task Penalty] Response status:', response.status);
    console.log('[Weekly Task Penalty] Response data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok && responseData.ok) {
      console.log('[Weekly Task Penalty] ✅ Tin nhắn đã được gửi thành công!');
    } else {
      // Xử lý lỗi TOPIC_CLOSED
      if (responseData.error_code === 400 && responseData.description?.includes('TOPIC_CLOSED')) {
        console.error('[Weekly Task Penalty] ⚠️ Topic đã bị đóng, không thể gửi tin nhắn:', responseData);
      } else {
        console.error('[Weekly Task Penalty] ❌ Gửi tin nhắn thất bại:', responseData);
      }
    }
  } catch (error) {
    console.error('[Weekly Task Penalty] ❌ Lỗi khi gửi tin nhắn:', error);
    if (error instanceof Error) {
      console.error('[Weekly Task Penalty] Error message:', error.message);
      console.error('[Weekly Task Penalty] Error stack:', error.stack);
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

    // LUÔN LUÔN lấy tuần trước từ hệ thống theo giờ Việt Nam (không phụ thuộc database)
    const today = moment.tz('Asia/Ho_Chi_Minh')
    const lastWeek = moment.tz('Asia/Ho_Chi_Minh').subtract(1, 'week')
    const lastWeekNumber = getWeekNumber(lastWeek).toString()

    // Tính ngày bắt đầu và kết thúc tuần trước
    const lastWeekStart = moment.tz('Asia/Ho_Chi_Minh').subtract(1, 'week').startOf('week').add(1, 'day') // Thứ 2
    const lastWeekEnd = moment.tz('Asia/Ho_Chi_Minh').subtract(1, 'week').endOf('week').add(1, 'day') // Chủ nhật

    console.log(`[Weekly Task Penalty] ⚠️ LUÔN LẤY TUẦN TRƯỚC (VN): Week ${lastWeekNumber}, Start: ${lastWeekStart.format('YYYY-MM-DD')}, End: ${lastWeekEnd.format('YYYY-MM-DD')}`)

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

    // Lấy tất cả work task data để tìm dữ liệu cho tuần trước (lastWeekNumber)
    // CHỈ tìm dữ liệu có week_number = lastWeekNumber (tính từ ngày hôm nay)
    const workTasks = await prisma.work_task.findMany({
      orderBy: {
        updated_at: 'desc'
      }
    })

    // Parse và group work task data - CHỈ lấy work_task có week_number = lastWeekNumber
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
    
    // CHỈ tìm work_task có week_number = lastWeekNumber (tuần trước từ moment())
    Object.keys(workTasksByUsername).forEach((username) => {
      const userTasks = workTasksByUsername[username]
      
      // Tìm work_task có week_number = lastWeekNumber (sắp xếp theo updated_at desc)
      for (const task of userTasks) {
        // CHỈ lấy dữ liệu có week_number khớp với tuần trước
        if (task.week_number === lastWeekNumber) {
          const weekData = typeof task.week_data === 'string' ? JSON.parse(task.week_data) : task.week_data
          if (weekData) {
            workTaskDataByUser[username] = weekData
            console.log(`[Parse Data] ${username} - Found week ${lastWeekNumber} data (tuần trước), updated_at: ${task.updated_at}`)
            break // Đã tìm thấy, không cần tìm tiếp
          }
        }
      }
      
      // Nếu không tìm thấy dữ liệu cho tuần trước
      if (!workTaskDataByUser[username]) {
        console.log(`[Parse Data] ${username} - No week data found for week ${lastWeekNumber} (tuần trước)`)
        console.log(`[Parse Data] ${username} - Available week_numbers in DB:`, userTasks.map(t => t.week_number))
      }
    })

    console.log(`[Weekly Task Penalty] Total users: ${accounts.length}, Users with data: ${Object.keys(workTaskDataByUser).length}`)

    // Danh sách người chưa làm công việc tuần trước với chi tiết công việc chưa làm
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
        // Chưa có dữ liệu cho tuần trước - không trừ tiền nếu không có dữ liệu
        // Chỉ trừ tiền khi có dữ liệu và xác nhận chưa hoàn thành
        console.log(`[Check User] ${account.username} - Không có dữ liệu cho tuần ${lastWeekNumber}, bỏ qua (không trừ tiền)`)
        continue
      }

      // Lấy danh sách công việc chưa làm
      const incompleteTasks = getIncompleteWeeklyTasks(weekData, account.username, lastWeekNumber)
      
      console.log(`[Check User] ${account.username} - Week ${lastWeekNumber} - incompleteTasks:`, incompleteTasks);
      
      if (incompleteTasks.length > 0) {
        usersNotCompleted.push({
          username: account.username,
          name: account.name || account.username,
          telegram: account.telegram || `@${account.username}`,
          incompleteTasks: incompleteTasks
        })
        console.log(`[Check User] ${account.username} - Đã thêm vào danh sách chưa làm`);
      } else {
        console.log(`[Check User] ${account.username} - Đã hoàn thành tất cả công việc tuần trước`);
      }
    }

    // Lưu dữ liệu xử phạt vào database và gửi tin nhắn
    // Lưu vào bảng daily_task_penalty (dùng chung với xử phạt hàng ngày)
    // Dùng ngày Thứ 2 của tuần trước làm penalty_date
    const penaltyDate = lastWeekStart.format('YYYY-MM-DD') // Thứ 2 của tuần trước
    const penaltyAmount = "- 200.000" // Số tiền xử phạt: -200.000 VND
    const now = moment.tz('Asia/Ho_Chi_Minh').format("YYYY-MM-DD HH:mm:ss")
    const savedPenalties: Array<{ username: string, penalty_date: string }> = []

    // Lưu vào database cho từng người chưa hoàn thành
    for (const user of usersNotCompleted) {
      try {
        // Kiểm tra xem đã có record cho username và penalty_date chưa (tránh duplicate)
        // @ts-expect-error - daily_task_penalty model chưa có trong Prisma Client, cần regenerate
        const existingPenalty = await prisma.daily_task_penalty.findFirst({
          where: {
            username: user.username,
            penalty_date: penaltyDate
          }
        })

        if (!existingPenalty) {
          // Tạo mới record xử phạt vào bảng daily_task_penalty
          // @ts-expect-error - daily_task_penalty model chưa có trong Prisma Client, cần regenerate
          await prisma.daily_task_penalty.create({
            data: {
              username: user.username,
              penalty_date: penaltyDate,
              penalty_amount: penaltyAmount,
              created_at: now,
              updated_at: now
            }
          })
          savedPenalties.push({
            username: user.username,
            penalty_date: penaltyDate
          })
          console.log(`[Save Penalty] Đã lưu xử phạt tuần cho ${user.username} - tuần ${lastWeekNumber} (ngày ${penaltyDate})`)
        } else {
          console.log(`[Save Penalty] Đã tồn tại xử phạt cho ${user.username} - ngày ${penaltyDate}, bỏ qua`)
        }
      } catch (error: any) {
        console.error(`[Save Penalty] Lỗi khi lưu xử phạt cho ${user.username}:`, error)
        // Tiếp tục với các user khác dù có lỗi
      }
    }

    // Gửi tin nhắn xử phạt cho những người chưa làm tuần trước
    const penaltyTime = moment.tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')
    const weekRange = `${lastWeekStart.format('DD/MM/YYYY')} - ${lastWeekEnd.format('DD/MM/YYYY')}`

    if (usersNotCompleted.length > 0) {
      // Tạo tin nhắn với chi tiết công việc chưa làm
      const messageParts: string[] = []
      messageParts.push('⚠️ <b>Phiếu bé hư - Chưa hoàn thành công việc tuần</b>')
      messageParts.push(`\n📅 <b>Tuần phát phiếu:</b> Tuần ${lastWeekNumber} (${weekRange})`)
      messageParts.push(`⏰ <b>Thời gian phát phiếu:</b> ${penaltyTime}`)
      messageParts.push(`💰 <b>Số tiền:</b> ${penaltyAmount} VND\n`)

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

      messageParts.push(`\n❌ Những người trên đã không hoàn thành công việc tuần ${lastWeekNumber} (${weekRange}).`)
      messageParts.push(`💰 Số tiền: ${penaltyAmount} VND`)

      const message = messageParts.join('\n')
      await sendTelegramNotification(message)
    } else {
      // Gửi tin nhắn cổ động khi tất cả đều hoàn thành
      const messageParts: string[] = []
      messageParts.push('🎉 <b>Chúc mừng - Tất cả đã hoàn thành công việc tuần!</b>')
      messageParts.push(`\n📅 <b>Tuần kiểm tra:</b> Tuần ${lastWeekNumber} (${weekRange})`)
      messageParts.push(`⏰ <b>Thời gian kiểm tra:</b> ${penaltyTime}`)
      messageParts.push(`\n✅ Tất cả nhân viên đã hoàn thành đầy đủ công việc tuần ${lastWeekNumber} (${weekRange}).`)
      messageParts.push(`\n💪 <b>Cố gắng phát huy và duy trì tinh thần làm việc tích cực!</b>`)
      messageParts.push(`🌟 <b>Tiếp tục nỗ lực trong những tuần tiếp theo!</b>`)

      const message = messageParts.join('\n')
      await sendTelegramNotification(message)
    }

    const responseMessage = usersNotCompleted.length > 0
      ? `Đã kiểm tra và gửi phiếu bé hư cho ${usersNotCompleted.length} người chưa hoàn thành công việc tuần ${lastWeekNumber}`
      : `Đã kiểm tra và gửi tin nhắn cổ động - Tất cả nhân viên đã hoàn thành công việc tuần ${lastWeekNumber}`

    return NextResponse.json({
      success: true,
      message: responseMessage,
      penalized: usersNotCompleted.map(u => ({
        username: u.username,
        name: u.name,
        telegram: u.telegram,
        incompleteTasks: u.incompleteTasks
      })),
      savedPenalties: savedPenalties,
      lastWeek: lastWeekNumber,
      weekRange: `${lastWeekStart.format('YYYY-MM-DD')} - ${lastWeekEnd.format('YYYY-MM-DD')}`,
      penaltyDate: penaltyDate,
      penaltyAmount: penaltyAmount,
      total: accounts.length,
      notCompleted: usersNotCompleted.length,
      saved: savedPenalties.length,
      allCompleted: usersNotCompleted.length === 0
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error checking weekly tasks for penalty:", error)
    return NextResponse.json(
      { error: "Failed to check weekly tasks for penalty", details: error.message },
      { status: 500 }
    )
  }
}

