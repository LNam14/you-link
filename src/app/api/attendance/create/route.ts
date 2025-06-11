import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"

// Remove edge runtime configuration
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Verify user authentication
    const cookieStore = cookies()
    const userInfo = cookieStore.get("userInfo")

    if (!userInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { username } = body
    
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: "Username is required and must be a string" },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await prisma.account.findUnique({
      where: { username }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    // Get current date in Vietnam timezone (UTC+7)
    const currentDate = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD")

    // Check if attendance already exists for today
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        username,
        date: currentDate
      }
    })

    if (existingAttendance) {
      return NextResponse.json(
        { error: "Attendance already recorded for today" },
        { status: 400 }
      )
    }

    const attendance = await prisma.attendance.create({
      data: {
        username,
        date: currentDate
      }
    })

    // Format the response data with Vietnam timezone
    const formattedData = {
      id: attendance.id,
      username: attendance.username,
      date: moment(attendance.date).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ss"),
    }

    return NextResponse.json(formattedData, { status: 201 })
  } catch (error) {
    console.error("Error creating attendance record:", error)
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to create attendance record: ${error.message}` },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create attendance record" },
      { status: 500 }
    )
  }
}
