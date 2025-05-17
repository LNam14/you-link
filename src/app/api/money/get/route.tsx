import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"

export async function GET(request: Request) {
    try {
        let query = ""
        let params: string[] = []

        // Get wheel data
        query = "SELECT * FROM wheel"
        const wheelResult = await pool.query(query, params)

        // Get attendance data
        query = "SELECT * FROM attendance"
        const attendanceResult = await pool.query(query, params)

        // Group wheel data by month and username
        const wheelData = wheelResult.rows.reduce((acc: any, row) => {
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
                rewardValue = row.reward
            }

            acc[month][row.username].wheel += rewardValue
            return acc
        }, {})

        // Calculate attendance and wages
        attendanceResult.rows.forEach((row) => {
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
        const formattedData = Object.entries(wheelData).map(([month, data]) => ({
            [month]: data
        }))

        return NextResponse.json({ data: formattedData }, { status: 200 })
    } catch (error) {
        console.error("Error fetching records:", error)
        return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 })
    }
}
