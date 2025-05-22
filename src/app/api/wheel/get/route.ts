import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"

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

    let query = ""
    let params: string[] = []

    if (role === "Admin") {
      query = "SELECT * FROM wheel ORDER BY date DESC"
    } else {
      query = "SELECT * FROM wheel WHERE username = $1 ORDER BY date DESC"
      params = [username]
    }

    const result = await pool.query(query, params)

    // Đảm bảo dữ liệu trả về có định dạng ISO chuẩn và trả về trực tiếp mảng dữ liệu
    const formattedData = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      reward: row.reward,
      date: moment(row.date).format("YYYY-MM-DD"),
    }))

    // Trả về trực tiếp mảng dữ liệu thay vì bọc trong object data
    return NextResponse.json({ data: formattedData }, { status: 200 })
  } catch (error) {
    console.error("Error fetching wheel records:", error)
    return NextResponse.json({ error: "Failed to fetch wheel records" }, { status: 500 })
  }
}
