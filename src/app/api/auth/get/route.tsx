import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        // Query to get all accounts
        const result: any = await executeQuery("SELECT * FROM account", [])

        return NextResponse.json(
            {
                success: true,
                data: result.rows,
                message: "Successfully retrieved accounts"
            },
            { status: 200 }
        )

    } catch (error: any) {
        console.error("Error getting accounts:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Error getting accounts",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
