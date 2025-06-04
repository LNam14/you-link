import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"
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

    let wheelRecords;
    if (role === "Admin") {
      wheelRecords = await prisma.wheel.findMany({
        orderBy: {
          date: 'desc'
        }
      });
    } else {
      wheelRecords = await prisma.wheel.findMany({
        where: {
          username: username
        },
        orderBy: {
          date: 'desc'
        }
      });
    }

    // Format the data
    const formattedData = wheelRecords.map((record) => ({
      id: record.id,
      username: record.username,
      reward: record.reward,
      date: moment(record.date).format("YYYY-MM-DD"),
    }))

    return NextResponse.json({ data: formattedData }, { status: 200 })
  } catch (error) {
    console.error("Error fetching wheel records:", error)
    return NextResponse.json({ error: "Failed to fetch wheel records" }, { status: 500 })
  }
}
