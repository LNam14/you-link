import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        console.log("Starting customer count query")

        // Get the timestamp from URL params if provided
        const { searchParams } = new URL(request.url)
        const timestamp = searchParams.get("timestamp")

        console.log(`Request timestamp: ${timestamp}`)

        // Count accounts with role "Khách hàng" using Prisma
        const count = await prisma.account.count({
            where: {
                role: {
                    equals: "Khách hàng",
                    mode: 'insensitive' // This is equivalent to LOWER() in PostgreSQL
                }
            }
        })

        // Log all accounts to debug
        const allAccounts = await prisma.account.findMany({
            select: {
                id: true,
                role: true
            }
        })
        console.log("All accounts:", JSON.stringify(allAccounts))

        console.log(`Final count: ${count}`)

        return NextResponse.json(
            {
                success: true,
                count: count,
                timestamp: timestamp,
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error getting customer count:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Error getting customer count",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
