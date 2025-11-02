import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Helper function to retry database operations
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export async function GET(request: Request) {
  try {
    // Verify user authentication
    const cookieStore = cookies()
    const userInfo = cookieStore.get("userInfo")

    if (!userInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { username, role } = JSON.parse(userInfo.value)

    if (!username) {
      return NextResponse.json({ error: "Username not found" }, { status: 400 })
    }

    // Ensure database connection
    await connectDB()

    // Fetch all data in parallel
    const [
      attendanceRecords,
      templateData,
      accountsData,
      workTasksData
    ] = await Promise.all([
      // 1. Fetch Attendance Data
      (async () => {
        let attendanceRecords;
        if (role === "Admin") {
          attendanceRecords = await prisma.attendance.findMany({
            orderBy: {
              date: 'desc'
            }
          })
        } else {
          attendanceRecords = await prisma.attendance.findMany({
            where: {
              username: username
            },
            orderBy: {
              date: 'desc'
            }
          })
        }
        return attendanceRecords.map((record) => ({
          id: record.id,
          username: record.username,
          date: moment(record.date).format("YYYY-MM-DD"),
        }))
      })(),

      // 2. Fetch Daily Task Template
      (async () => {
        const template = await prisma.daily_task_template.findFirst({
          orderBy: {
            updated_at: 'desc'
          }
        })

        if (!template) {
          return {
            template: [],
            updatedAt: null,
            updatedBy: null
          }
        }

        const templateData = typeof template.template_data === 'string' 
          ? JSON.parse(template.template_data) 
          : template.template_data

        return {
          template: templateData,
          updatedAt: template.updated_at,
          updatedBy: template.updated_by
        }
      })(),

      // 3. Fetch Auth Data (Users)
      (async () => {
        const accounts = await retryOperation(() => prisma.account.findMany());

        // Group accounts by role
        const groupedAccounts = accounts.reduce((acc: any, account: any) => {
          const role = account.role || 'Nhân viên'
          if (!acc[role]) {
            acc[role] = []
          }
          acc[role].push(account)
          return acc
        }, {})

        // Get all teams
        const teams = await retryOperation(() => prisma.team.findMany({
          orderBy: {
            name: 'asc'
          }
        }));

        // Map teams to include their members
        const teamsWithMembers = teams.map((team: any) => ({
          ...team,
          members: accounts
            .filter((account: any) => account.team === team.name)
            .map((account: any) => ({
              username: account.username,
              name: account.name,
              position: account.position
            }))
        }))

        return {
          success: true,
          data: {
            Admin: groupedAccounts['Admin'] || [],
            NCC: groupedAccounts['NCC'] || [],
            NV: groupedAccounts['Nhân viên'] || [],
            KH: groupedAccounts['Khách hàng'] || [],
            teams: teamsWithMembers
          }
        }
      })(),

      // 4. Fetch Work Task Data
      (async () => {
        let workTasks;
        if (role === "Admin") {
          workTasks = await prisma.work_task.findMany({
            orderBy: {
              updated_at: 'desc'
            }
          })
        } else {
          workTasks = await prisma.work_task.findMany({
            where: {
              username: username
            },
            orderBy: {
              updated_at: 'desc'
            }
          })
        }

        // Parse JSON data from database
        const formattedData = workTasks.map((task) => ({
          id: task.id,
          username: task.username,
          weekNumber: task.week_number,
          weekData: typeof task.week_data === 'string' ? JSON.parse(task.week_data) : task.week_data,
          createdAt: task.created_at,
          updatedAt: task.updated_at
        }))

        // Group by username and week number to match the frontend structure
        const groupedData: any = { users: {}, taskIds: {} }
        formattedData.forEach((task) => {
          if (!groupedData.users[task.username]) {
            groupedData.users[task.username] = { weeks: {} }
          }
          groupedData.users[task.username].weeks[task.weekNumber] = task.weekData
          const key = `${task.username}_${task.weekNumber}`
          groupedData.taskIds[key] = task.id
        })

        return groupedData
      })()
    ])

    // Return all data in one response
    return NextResponse.json({
      attendance: attendanceRecords,
      dailyTaskTemplate: templateData,
      auth: accountsData,
      workTask: workTasksData
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error fetching all data:", error)
    return NextResponse.json(
      { error: "Failed to fetch data", details: error.message },
      { status: 500 }
    )
  }
}

