import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import moment from "moment-timezone"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const { username, reward } = await request.json()
    
    // Get current date in Vietnam timezone (Asia/Ho_Chi_Minh) and format as string
    const formattedDate = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD")

    if (!username || !reward) {
      return NextResponse.json({ error: "Username and reward are required" }, { status: 400 })
    }

    const result = await prisma.wheel.create({
      data: {
        username,
        reward,
        date: formattedDate
      }
    })

    // Format the response data with Vietnam timezone
    const formattedData = {
      id: result.id,
      username: result.username,
      reward: result.reward,
      date: formattedDate
    }

    return NextResponse.json(formattedData, { status: 201 })
  } catch (error) {
    console.error("Error creating wheel record:", error)
    return NextResponse.json({ error: "Failed to create wheel record" }, { status: 500 })
  }
}
