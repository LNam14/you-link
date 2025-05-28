import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const { name } = await request.json()

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

        // Check if team has members
        const memberCheckQuery = `
            SELECT COUNT(*) as member_count 
            FROM account 
            WHERE team = $1
        `
        const memberCheck: any = await executeQuery(memberCheckQuery, [name])
        // Update accounts to remove team association
        const updateAccountsQuery = `
            UPDATE account 
            SET team = NULL 
            WHERE team = $1
        `
        await executeQuery(updateAccountsQuery, [name])

        // Delete the team
        const deleteQuery = `
            DELETE FROM team 
            WHERE name = $1 
            RETURNING *
        `
        const result = await executeQuery(deleteQuery, [name])

        // Check if any rows were affected
        if (!Array.isArray(result) || result.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Team not found",
                },
                { status: 404 },
            )
        }

        return NextResponse.json(
            {
                success: true,
                message: "Team deleted successfully",
                data: result[0],
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error deleting team:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Error deleting team",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
