import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Add runtime configuration
export const runtime = 'edge'

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database configuration is missing" },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { username } = body
    
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: "Username is required and must be a string" },
        { status: 400 }
      )
    }
    
    // Get current date in Vietnam timezone (UTC+7)
    const vietnamDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    const currentDate = vietnamDate.toISOString().split("T")[0]

    const attendance = await prisma.attendance.create({
      data: {
        username,
        date: new Date(currentDate)
      }
    })

    // Format the response data with Vietnam timezone
    const formattedData = {
      id: attendance.id,
      username: attendance.username,
      date: new Date(attendance.date).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
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
