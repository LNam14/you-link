import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Telegram notification
const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
const PENALTY_CHAT_ID = '-1003124919874_191'; // Group chat ID để gửi xử phạt
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegramNotification(message: string): Promise<void> {
  console.log('[Daily Task Penalty] Bắt đầu gửi tin nhắn xử phạt...');
  console.log('[Daily Task Penalty] Chat ID:', PENALTY_CHAT_ID);
  console.log('[Daily Task Penalty] Message:', message);
  
  try {
    const requestBody: any = {
      chat_id: PENALTY_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    
    console.log('[Daily Task Penalty] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseData = await response.json();
    console.log('[Daily Task Penalty] Response status:', response.status);
    console.log('[Daily Task Penalty] Response data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok && responseData.ok) {
      console.log('[Daily Task Penalty] ✅ Tin nhắn đã được gửi thành công!');
    } else {
      console.error('[Daily Task Penalty] ❌ Gửi tin nhắn thất bại:', responseData);
    }
  } catch (error) {
    console.error('[Daily Task Penalty] ❌ Lỗi khi gửi tin nhắn:', error);
    if (error instanceof Error) {
      console.error('[Daily Task Penalty] Error message:', error.message);
      console.error('[Daily Task Penalty] Error stack:', error.stack);
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

    // Lấy ngày hôm qua (yesterday)
    const yesterday = moment().subtract(1, 'days').format("YYYY-MM-DD")
    const yesterdayDate = moment(yesterday)
    
    // Tính tuần của ngày hôm qua theo logic ISO (tuần bắt đầu từ Thứ 2)
    // Giống như logic trong frontend: getWeekNumber
    const getWeekNumber = (date: moment.Moment): number => {
      const d = new Date(Date.UTC(date.year(), date.month(), date.date()))
      const dayNum = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    }
    
    const weekNumber = getWeekNumber(yesterdayDate).toString()
    // Tính tuần trước đó (nếu yesterday là Chủ nhật, có thể thuộc tuần trước)
    const previousWeekNumber = getWeekNumber(yesterdayDate.clone().subtract(7, 'days')).toString()

    console.log(`[Daily Task Penalty] Yesterday: ${yesterday}, Week: ${weekNumber}, Previous Week: ${previousWeekNumber}`)

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
        penalized: []
      }, { status: 200 })
    }

    const dailyTaskTemplate = typeof template.template_data === 'string' 
      ? JSON.parse(template.template_data) 
      : template.template_data

    // Lấy work task data của tất cả users - query tất cả work_task (không filter theo week_number)
    // Vì có thể yesterday thuộc tuần khác với tuần được tính
    const workTasks = await prisma.work_task.findMany({
      orderBy: {
        updated_at: 'desc'
      }
    })
    
    console.log(`[Daily Task Penalty] Found ${workTasks.length} total work tasks`)

    // Parse và group work task data - tìm dailyTask có date = yesterday trong tất cả work_task
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
    
    // Tìm dailyTask có date = yesterday trong tất cả work_task của mỗi user
    Object.keys(workTasksByUsername).forEach((username) => {
      const userTasks = workTasksByUsername[username]
      
      // Tìm dailyTask có date = yesterday trong tất cả work_task (sắp xếp theo updated_at desc)
      for (const task of userTasks) {
        const weekData = typeof task.week_data === 'string' ? JSON.parse(task.week_data) : task.week_data
        if (weekData && weekData.dailyTasks && Array.isArray(weekData.dailyTasks)) {
          const yesterdayTask = weekData.dailyTasks.find((dt: any) => dt.date === yesterday)
          if (yesterdayTask) {
            // Tìm thấy dailyTask có date = yesterday
            // Lưu tất cả dailyTasks của tuần này (để có thể kiểm tra các task khác nếu cần)
            workTaskDataByUser[username] = weekData.dailyTasks
            console.log(`[Parse Data] ${username} - Found yesterday task in week ${task.week_number}, updated_at: ${task.updated_at}`)
            console.log(`[Parse Data] ${username} - Yesterday task data:`, JSON.stringify(yesterdayTask))
            break // Đã tìm thấy, không cần tìm tiếp
          }
        }
      }
      
      // Nếu không tìm thấy, log để debug
      if (!workTaskDataByUser[username]) {
        console.log(`[Parse Data] ${username} - No dailyTask found for date ${yesterday} in any work_task`)
        console.log(`[Parse Data] ${username} - Available work_tasks:`, userTasks.map(t => ({ week_number: t.week_number, updated_at: t.updated_at })))
        // Log tất cả dates có trong work_tasks của user này
        userTasks.forEach((task) => {
          const weekData = typeof task.week_data === 'string' ? JSON.parse(task.week_data) : task.week_data
          if (weekData && weekData.dailyTasks && Array.isArray(weekData.dailyTasks)) {
            const dates = weekData.dailyTasks.map((dt: any) => dt.date)
            console.log(`[Parse Data] ${username} - Week ${task.week_number} dates:`, dates)
          }
        })
      }
    })

    console.log(`[Daily Task Penalty] Yesterday: ${yesterday}, Week: ${weekNumber}`)
    console.log(`[Daily Task Penalty] Total users: ${accounts.length}, Users with data: ${Object.keys(workTaskDataByUser).length}`)

    // Danh sách người chưa làm công việc ngày hôm qua với chi tiết công việc chưa làm
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
      
      const yesterdayTask = dailyTasks.find((task: any) => task.date === yesterday)
      
      console.log(`[Check User] ${account.username} - Looking for date: ${yesterday}`)
      if (yesterdayTask) {
        console.log(`[Check User] ${account.username} - Found yesterdayTask:`, JSON.stringify(yesterdayTask))
      } else {
        console.log(`[Check User] ${account.username} - No yesterdayTask found. Available dates:`, dailyTasks.map((t: any) => t.date))
      }

      if (!yesterdayTask) {
        // Chưa có dữ liệu cho ngày hôm qua - tất cả công việc đều chưa làm
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
      const incompleteTasks = getIncompleteTasks(yesterdayTask, dailyTaskTemplate, account.username, yesterday)
      
      console.log(`[Check User] ${account.username} - ${yesterday} - incompleteTasks:`, incompleteTasks);
      
      if (incompleteTasks.length > 0) {
        usersNotCompleted.push({
          username: account.username,
          name: account.name || account.username,
          telegram: account.telegram || `@${account.username}`,
          incompleteTasks: incompleteTasks
        })
        console.log(`[Check User] ${account.username} - Đã thêm vào danh sách chưa làm`);
      } else {
        console.log(`[Check User] ${account.username} - Đã hoàn thành tất cả công việc ngày hôm qua`);
      }
    }

    // Lưu dữ liệu xử phạt vào database và gửi tin nhắn
    const penaltyAmount = "- 200.000" // Số tiền xử phạt: -200.000 VND
    const now = moment().format("YYYY-MM-DD HH:mm:ss")
    const savedPenalties: Array<{ username: string, penalty_date: string }> = []

    // Lưu vào database cho từng người chưa hoàn thành
    for (const user of usersNotCompleted) {
      try {
        // Kiểm tra xem đã có record cho username và penalty_date chưa (tránh duplicate)
        // Note: Prisma Client cần được regenerate sau khi thêm model mới (chạy: npx prisma generate)
        // @ts-expect-error - daily_task_penalty model chưa có trong Prisma Client, cần regenerate
        const existingPenalty = await prisma.daily_task_penalty.findFirst({
          where: {
            username: user.username,
            penalty_date: yesterday
          }
        })

        if (!existingPenalty) {
          // Tạo mới record xử phạt
          // @ts-expect-error - daily_task_penalty model chưa có trong Prisma Client, cần regenerate
          await prisma.daily_task_penalty.create({
            data: {
              username: user.username,
              penalty_date: yesterday,
              penalty_amount: penaltyAmount,
              created_at: now,
              updated_at: now
            }
          })
          savedPenalties.push({
            username: user.username,
            penalty_date: yesterday
          })
          console.log(`[Save Penalty] Đã lưu xử phạt cho ${user.username} - ngày ${yesterday}`)
        } else {
          console.log(`[Save Penalty] Đã tồn tại xử phạt cho ${user.username} - ngày ${yesterday}, bỏ qua`)
        }
      } catch (error: any) {
        console.error(`[Save Penalty] Lỗi khi lưu xử phạt cho ${user.username}:`, error)
        // Tiếp tục với các user khác dù có lỗi
      }
    }

    // Gửi tin nhắn xử phạt cho những người chưa làm ngày hôm qua
    if (usersNotCompleted.length > 0) {
      // Thời gian xử phạt
      const penaltyTime = moment().format('HH:mm:ss DD/MM/YYYY')
      const yesterdayFormatted = moment(yesterday).format('DD/MM/YYYY')

      // Tạo tin nhắn với chi tiết công việc chưa làm
      const messageParts: string[] = []
      messageParts.push('⚠️ <b>Phiếu bé hư - Chưa hoàn thành công việc hàng ngày</b>')
      messageParts.push(`\n📅 <b>Ngày phát phiếu:</b> ${yesterdayFormatted}`)
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

      messageParts.push(`\n❌ Những người trên đã không hoàn thành công việc hàng ngày vào ngày ${yesterdayFormatted}.`)
      messageParts.push(`💰 Số tiền: ${penaltyAmount} VND`)

      const message = messageParts.join('\n')
      await sendTelegramNotification(message)
    }

    return NextResponse.json({
      success: true,
      message: `Đã kiểm tra và gửi phiếu bé hư cho ${usersNotCompleted.length} người chưa hoàn thành công việc ngày ${yesterday}`,
      penalized: usersNotCompleted.map(u => ({
        username: u.username,
        name: u.name,
        telegram: u.telegram,
        incompleteTasks: u.incompleteTasks
      })),
      savedPenalties: savedPenalties,
      yesterday: yesterday,
      penaltyAmount: penaltyAmount,
      total: accounts.length,
      notCompleted: usersNotCompleted.length,
      saved: savedPenalties.length
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error checking daily tasks for penalty:", error)
    return NextResponse.json(
      { error: "Failed to check daily tasks for penalty", details: error.message },
      { status: 500 }
    )
  }
}

