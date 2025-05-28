import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, description, active = "Hoạt động" } = body

        // Validate input
        if (!name) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Team name is required",
                },
                { status: 400 },
            )
        }

        // Insert new team with description and active status
        const query = `
            INSERT INTO team (name, description, active, created_at, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `
        const result: any = await executeQuery(query, [name, description || null, active])

        // Check if the result is an error
        if ("status" in result && !result.status) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Error creating team",
                    error: result.error,
                },
                { status: 500 },
            )
        }

        // Get the created team with member count (will be 0 for new team)
        const teamWithDetails = {
            ...result[0],
            member_count: 0,
            active_member_count: 0,
            members: [],
        }

        return NextResponse.json(
            {
                success: true,
                message: "Team created successfully",
                data: teamWithDetails,
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error creating team:", error)

        // Check for duplicate team name error
        if (error.message && error.message.includes("team_name_key")) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Tên team đã tồn tại",
                },
                { status: 400 },
            )
        }

        return NextResponse.json(
            {
                success: false,
                message: "Error creating team",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
