import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        // Query to get all teams
        const result: any = await executeQuery("SELECT * FROM team ORDER BY name", [])

        return NextResponse.json(
            {
                success: true,
                data: result || [],
                message: "Successfully retrieved teams",
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error getting teams:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Error getting teams",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
