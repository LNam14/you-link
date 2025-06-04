import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"

interface AttendanceRecord {
  id: number
  username: string
  date: Date
}
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const userInfo = cookieStore.get("userInfo")

    if (!userInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { username, role } = JSON.parse(userInfo.value)

    if (!username) {
      return NextResponse.json({ error: "Username not found" }, { status: 400 })
    }

    let attendanceRecords: AttendanceRecord[]

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

    // Format the data to ensure consistent date format
    const formattedData = attendanceRecords.map((record) => ({
      id: record.id,
      username: record.username,
      date: moment(record.date).format("YYYY-MM-DD"),
    }))

    return NextResponse.json(formattedData, { status: 200 })
  } catch (error) {
    console.error("Error fetching attendance records:", error)
    return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 })
  }
}
