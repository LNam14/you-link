import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { role, count = 1 } = body

        // Validate input
        if (!role || count < 1) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required fields or invalid count"
                },
                { status: 400 }
            )
        }

        // Generate values for multiple accounts
        const values = []
        const placeholders = []
        for (let i = 0; i < count; i++) {
            values.push(role)
            placeholders.push(`(NULL, NULL, $${i + 1}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
        }

        // Insert multiple accounts with only role set
        const query = `
            INSERT INTO account (username, password, role, created_at, updated_at)
            VALUES ${placeholders.join(', ')}
            RETURNING *
        `
        const result = await executeQuery(query, values)

        // Check if the result is an error
        if ('status' in result && !result.status) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Error creating accounts",
                    error: result.error
                },
                { status: 500 }
            )
        }

        return NextResponse.json(
            {
                success: true,
                message: `Successfully created ${count} accounts`,
                data: result
            },
            { status: 200 }
        )

    } catch (error: any) {
        console.error("Error creating accounts:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Error creating accounts",
                error: error.message
            },
            { status: 500 }
        )
    }
} 