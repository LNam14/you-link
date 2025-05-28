import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { role, count = 1, team, position } = body

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
            // Add role, team, and position to values array
            values.push(role)
            if (team) values.push(team)
            if (position) values.push(position)

            // Create placeholder with optional team and position
            const placeholderValues = [`$${i * 3 + 1}`] // role
            if (team) placeholderValues.push(`$${i * 3 + 2}`) // team
            if (position) placeholderValues.push(`$${i * 3 + 3}`) // position

            placeholders.push(`(NULL, NULL, ${placeholderValues.join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
        }

        // Build the column list based on provided fields
        const columns = ['username', 'password', 'role']
        if (team) columns.push('team')
        if (position) columns.push('position')
        columns.push('created_at', 'updated_at')

        // Insert multiple accounts with role, team, and position if provided
        const query = `
            INSERT INTO account (${columns.join(', ')})
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