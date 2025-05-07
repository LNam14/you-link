import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { username, reward } = await request.json()
    
    // Get current date in Vietnam timezone (UTC+7)
    const vietnamDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    const currentDate = vietnamDate.toISOString().split("T")[0] // Get current date in YYYY-MM-DD format

    if (!username || !reward) {
      return NextResponse.json({ error: "Username and reward are required" }, { status: 400 })
    }

    const result = await pool.query("INSERT INTO wheel (username, reward, date) VALUES ($1, $2, $3) RETURNING *", [
      username,
      reward,
      currentDate,
    ])

    // Format the response data with Vietnam timezone
    const formattedData = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      reward: result.rows[0].reward,
      date: new Date(result.rows[0].date).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    }

    return NextResponse.json(formattedData, { status: 201 })
  } catch (error) {
    console.error("Error creating wheel record:", error)
    return NextResponse.json({ error: "Failed to create wheel record" }, { status: 500 })
  }
}
