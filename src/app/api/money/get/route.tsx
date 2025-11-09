import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import moment from "moment"
const momentTz = require("moment-timezone")
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Set default timezone to Vietnam
momentTz.tz.setDefault("Asia/Ho_Chi_Minh")

type WheelData = {
    [month: string]: {
        [username: string]: {
            wheel: number
            wage: number
            penalty: number
        }
    }
}

export async function GET(request: Request) {
    try {
        // Get wheel data using Prisma
        const wheelResult = await prisma.wheel.findMany()

        // Get attendance data using Prisma
        const attendanceResult = await prisma.attendance.findMany()

        // Get account data to fetch names
        const accountResult = await prisma.account.findMany({
            select: {
                username: true,
                name: true
            }
        })

        // Create a map of username to name for quick lookup
        const usernameToNameMap = new Map<string, string>()
        accountResult.forEach(account => {
            if (account.username && account.name) {
                usernameToNameMap.set(account.username, account.name)
            }
        })

        // Group wheel data by month and username
        const wheelData = wheelResult.reduce((acc: WheelData, row) => {
            if (!row.date) return acc // Skip if date is null

            const month = moment(row.date).format('YYYY-MM')
            if (!acc[month]) {
                acc[month] = {}
            }

            // Create username-name key
            const name = usernameToNameMap.get(row.username) || ''
            const displayKey = name ? `${row.username}-${name}` : row.username

            if (!acc[month][displayKey]) {
                acc[month][displayKey] = {
                    wheel: 0,
                    wage: 0,
                    penalty: 0
                }
            }

            // Format wheel reward value
            let rewardValue = 0
            if (typeof row.reward === 'string') {
                if (row.reward.includes('VND')) {
                    // Check if reward is negative (has minus sign)
                    const isNegative = row.reward.includes('-')
                    // Remove all non-numeric characters except dots, commas and minus, then remove dots and commas
                    const cleanValue = row.reward.replace(/[^0-9.,-]/g, '').replace(/[.,]/g, '')
                    rewardValue = parseInt(cleanValue) || 0
                    // If original string had minus, make sure the value is negative
                    if (isNegative && rewardValue > 0) {
                        rewardValue = -rewardValue
                    }
                } else if (row.reward.includes('Quay thêm')) {
                    rewardValue = 0
                }
            } else {
                rewardValue = Number(row.reward)
            }

            acc[month][displayKey].wheel += rewardValue
            return acc
        }, {} as WheelData)

        // Calculate attendance and wages
        attendanceResult.forEach((row) => {
            if (!row.date) return // Skip if date is null

            const month = moment(row.date).format('YYYY-MM')
            if (!wheelData[month]) {
                wheelData[month] = {}
            }

            // Create username-name key
            const name = usernameToNameMap.get(row.username) || ''
            const displayKey = name ? `${row.username}-${name}` : row.username

            if (!wheelData[month][displayKey]) {
                wheelData[month][displayKey] = {
                    wheel: 0,
                    wage: 0,
                    penalty: 0
                }
            }

            // Count attendance days and calculate wage (302 per day)
            wheelData[month][displayKey].wage += 302000
        })

        // Get penalty data (daily_task_penalty - bao gồm cả daily và weekly penalties)
        // Xử lý trường hợp Prisma Client chưa có model mới
        let dailyPenalties: any[] = []
        
        try {
            // @ts-expect-error - daily_task_penalty model chưa có trong Prisma Client, cần regenerate
            if (prisma.daily_task_penalty && typeof prisma.daily_task_penalty.findMany === 'function') {
                dailyPenalties = await prisma.daily_task_penalty.findMany()
            }
        } catch (error) {
            console.log('[Money API] daily_task_penalty model chưa có trong Prisma Client, bỏ qua')
        }
        
        // Process penalties (bao gồm cả daily và weekly penalties - đều lưu trong daily_task_penalty)
        dailyPenalties.forEach((penalty) => {
            if (!penalty.penalty_date || !penalty.username) return

            const month = moment(penalty.penalty_date).format('YYYY-MM')
            if (!wheelData[month]) {
                wheelData[month] = {}
            }

            // Create username-name key
            const name = usernameToNameMap.get(penalty.username) || ''
            const displayKey = name ? `${penalty.username}-${name}` : penalty.username

            if (!wheelData[month][displayKey]) {
                wheelData[month][displayKey] = {
                    wheel: 0,
                    wage: 0,
                    penalty: 0
                }
            }

            // Parse penalty amount (format: "-200000" hoặc "- 200.000")
            // Trong database lưu là "-200000" (string) hoặc -200000 (number)
            // Nếu có 2 records: -200000 và -200000 thì tổng phải là 400000
            let penaltyAmount = 0
            if (typeof penalty.penalty_amount === 'string') {
                // Xóa tất cả ký tự không phải số và dấu trừ
                const cleanValue = penalty.penalty_amount.replace(/[^0-9-]/g, '')
                penaltyAmount = parseInt(cleanValue, 10) || 0
            } else {
                penaltyAmount = Number(penalty.penalty_amount) || 0
            }

            // Lấy giá trị tuyệt đối để cộng dồn (vì trong DB lưu âm, nhưng ta cộng dồn dương)
            // Ví dụ: -200000 -> Math.abs -> 200000
            const penaltyValue = Math.abs(penaltyAmount)
            
            // Cộng dồn: nếu có 2 lần -200000 thì tổng = 200000 + 200000 = 400000
            const oldPenalty = wheelData[month][displayKey].penalty
            wheelData[month][displayKey].penalty += penaltyValue
            
            console.log(`[Penalty] ${penalty.username} - ${penalty.penalty_date} - DB: ${penalty.penalty_amount} -> Parsed: ${penaltyAmount} -> Value: ${penaltyValue} -> Old: ${oldPenalty} -> New Total: ${wheelData[month][displayKey].penalty}`)
        })

        // Format the final output
        const formattedData = Object.entries(wheelData)
            .sort(([monthA], [monthB]) => monthB.localeCompare(monthA)) // Sort months in descending order
            .map(([month, data]) => ({
                [month]: Object.fromEntries(
                    Object.entries(data).sort(([a], [b]) => a.localeCompare(b, 'vi', { sensitivity: 'base' }))
                )
            }))

        return NextResponse.json({ data: formattedData }, { status: 200 })
    } catch (error) {
        console.error("Error fetching records:", error)
        return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 })
    }
}
