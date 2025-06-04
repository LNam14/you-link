import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { username, reward } = await request.json()
    
    // Get current date in Vietnam timezone (UTC+7)
    const vietnamDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))

    if (!username || !reward) {
      return NextResponse.json({ error: "Username and reward are required" }, { status: 400 })
    }

    const result = await prisma.wheel.create({
      data: {
        username,
        reward,
        date: vietnamDate
      }
    })

    // Format the response data with Vietnam timezone
    const formattedData = {
      id: result.id,
      username: result.username,
      reward: result.reward,
      date: new Date(result.date!).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    }

    return NextResponse.json(formattedData, { status: 201 })
  } catch (error) {
    console.error("Error creating wheel record:", error)
    return NextResponse.json({ error: "Failed to create wheel record" }, { status: 500 })
  }
}
