import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
import { cookies } from "next/headers"

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

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

    let workTasks

    // Admin can see all tasks, others only their own
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
    // Also include task IDs for updating
    const groupedData: any = { users: {}, taskIds: {} }
    formattedData.forEach((task) => {
      if (!groupedData.users[task.username]) {
        groupedData.users[task.username] = { weeks: {} }
      }
      groupedData.users[task.username].weeks[task.weekNumber] = task.weekData
      // Store task ID: key format is "username_weekNumber"
      const key = `${task.username}_${task.weekNumber}`
      groupedData.taskIds[key] = task.id
    })

    return NextResponse.json(groupedData, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching work tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch work tasks", details: error.message },
      { status: 500 }
    )
  }
}

