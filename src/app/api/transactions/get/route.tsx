import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// Mark the route as dynamic
export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const cookieStore = cookies()
        const userInfoCookie = cookieStore.get("userInfo")

        let userInfo: any = {}
        if (userInfoCookie) {
            userInfo = JSON.parse(userInfoCookie.value)
        }

        let transactions: any
        let queryResult: any

        if (userInfo?.role === "Khách hàng" || userInfo?.role === "Nhân viên") {
            queryResult = await executeQuery(
                `SELECT t.*, a.username 
                 FROM transactions t
                 JOIN account a ON t.customer_id = a.id
                 WHERE t.customer_id = $1
                 ORDER BY t.deposit_date DESC`,
                [userInfo?.id],
            )
        } else if (userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") {
            queryResult = await executeQuery(
                `SELECT t.*, a.username 
                 FROM transactions t
                 JOIN account a ON t.customer_id = a.id
                 ORDER BY t.deposit_date DESC`,
                [],
            )
        }

        if (queryResult && queryResult.status === false) {
            console.error("Database error:", queryResult.error)
            return NextResponse.json(
                { success: false, error: queryResult.error },
                { status: 500 },
            )
        }

        transactions = queryResult

        return NextResponse.json(
            { success: true, data: transactions },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error fetching transactions:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Error fetching transactions",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
