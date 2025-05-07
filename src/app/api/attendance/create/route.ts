import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { username } = await request.json()
    
    // Get current date in Vietnam timezone (UTC+7)
    const vietnamDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    const currentDate = vietnamDate.toISOString().split("T")[0] // Get current date in YYYY-MM-DD format

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    const result = await pool.query("INSERT INTO attendance (username, date) VALUES ($1, $2) RETURNING *", [
      username,
      currentDate,
    ])

    // Format the response data with Vietnam timezone
    const formattedData = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      date: new Date(result.rows[0].date).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    }

    return NextResponse.json(formattedData, { status: 201 })
  } catch (error) {
    console.error("Error creating attendance record:", error)
    return NextResponse.json({ error: "Failed to create attendance record" }, { status: 500 })
  }
}
