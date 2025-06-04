import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"
const momentTz = require("moment-timezone")

// Set default timezone to Vietnam
momentTz.tz.setDefault("Asia/Ho_Chi_Minh")

type WheelData = {
    [month: string]: {
        [username: string]: {
            wheel: number
            wage: number
        }
    }
}

export async function GET(request: Request) {
    try {
        // Get wheel data using Prisma
        const wheelResult = await prisma.wheel.findMany()

        // Get attendance data using Prisma
        const attendanceResult = await prisma.attendance.findMany()

        // Group wheel data by month and username
        const wheelData = wheelResult.reduce((acc: WheelData, row) => {
            if (!row.date) return acc // Skip if date is null

            const month = moment(row.date).format('YYYY-MM')
            if (!acc[month]) {
                acc[month] = {}
            }
            if (!acc[month][row.username]) {
                acc[month][row.username] = { wheel: 0, wage: 0 }
            }

            // Format wheel reward value
            let rewardValue = 0
            if (typeof row.reward === 'string') {
                if (row.reward.includes('VND')) {
                    rewardValue = parseInt(row.reward.replace(/[^0-9-]/g, ''))
                } else if (row.reward.includes('Quay thêm')) {
                    rewardValue = 0
                }
            } else {
                rewardValue = Number(row.reward)
            }

            acc[month][row.username].wheel += rewardValue
            return acc
        }, {} as WheelData)

        // Calculate attendance and wages
        attendanceResult.forEach((row) => {
            if (!row.date) return // Skip if date is null

            const month = moment(row.date).format('YYYY-MM')
            if (!wheelData[month]) {
                wheelData[month] = {}
            }
            if (!wheelData[month][row.username]) {
                wheelData[month][row.username] = { wheel: 0, wage: 0 }
            }

            // Count attendance days and calculate wage (302 per day)
            wheelData[month][row.username].wage += 302000
        })

        // Format the final output
        const formattedData = Object.entries(wheelData)
            .sort(([monthA], [monthB]) => monthB.localeCompare(monthA)) // Sort months in descending order
            .map(([month, data]) => ({
                [month]: data
            }))

        return NextResponse.json({ data: formattedData }, { status: 200 })
    } catch (error) {
        console.error("Error fetching records:", error)
        return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 })
    }
}
