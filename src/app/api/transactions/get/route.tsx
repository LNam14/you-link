import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"

// Mark the route as dynamic
export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const cookieStore = cookies()
        const userInfoCookie = cookieStore.get("userInfo")

        let userInfo: any = {}
        if (userInfoCookie) {
            userInfo = JSON.parse(userInfoCookie.value)
        }

        let transactions;

        if (userInfo?.role === "Khách hàng" || userInfo?.role === "Nhân viên") {
            transactions = await prisma.transactions.findMany({
                where: {
                    customer_id: userInfo?.id
                },
                orderBy: {
                    id: 'desc'
                }
            });
        } else if (userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") {
            transactions = await prisma.transactions.findMany({
                orderBy: {
                    id: 'desc'
                }
            });
        }

        const currentTimestamp = new Date().toISOString()
        const formattedTime = new Date().toLocaleString("vi-VN")

        return NextResponse.json(
            {
                success: true,
                data: transactions,
                timestamp: currentTimestamp,
                formattedTime: formattedTime,
            },
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
