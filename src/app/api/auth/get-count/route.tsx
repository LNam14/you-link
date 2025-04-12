import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        console.log("Starting customer count query")

        // Get the timestamp from URL params if provided
        const { searchParams } = new URL(request.url)
        const timestamp = searchParams.get("timestamp")

        console.log(`Request timestamp: ${timestamp}`)

        // Query to count accounts with role "Khách hàng"
        // PostgreSQL is case-sensitive, so we use LOWER() for comparison
        const result: any = await executeQuery("SELECT COUNT(*) as count FROM account WHERE LOWER(role) = LOWER($1)", [
            "Khách hàng",
        ])

        // Log all accounts to debug
        const allAccounts = await executeQuery("SELECT id, role FROM account", [])
        console.log("All accounts:", JSON.stringify(allAccounts))

        console.log("Raw query result:", JSON.stringify(result))

        if (!Array.isArray(result) || result.length === 0) {
            console.log("No results returned from query")
            return NextResponse.json(
                {
                    success: true,
                    count: 0,
                    timestamp: timestamp,
                },
                { status: 200 },
            )
        }

        // Ensure we're getting a number and not a string
        const count = Number.parseInt(result[0].count, 10)
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
