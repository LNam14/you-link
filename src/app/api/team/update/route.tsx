import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const { id, name, description, active } = await request.json()

        // Validate input
        if (!id || !name) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Team ID and name are required",
                },
                { status: 400 },
            )
        }

        // Update the team with description and active status
        const query = `
            WITH updated_team AS (
                UPDATE team 
                SET name = $1, description = $2, active = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4 
                RETURNING *
            ),
            updated_accounts AS (
                UPDATE account
                SET team = $1
                WHERE team = (SELECT name FROM team WHERE id = $4)
            )
            SELECT * FROM updated_team;
        `
        const result = await executeQuery(query, [name, description || null, active !== undefined ? active : "Hoạt động", id])

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

        // Get updated team with member details
        const teamWithMembersQuery = `
            SELECT 
                t.*,
                COUNT(a.id) as member_count,
                COUNT(CASE WHEN a.active = true THEN 1 END) as active_member_count,
                COALESCE(
                    JSON_AGG(
                        CASE 
                            WHEN a.id IS NOT NULL THEN 
                                JSON_BUILD_OBJECT(
                                    'id', a.id,
                                    'username', a.username,
                                    'name', a.name,
                                    'role', a.role,
                                    'active', a.active,
                                    'created_at', a.created_at
                                )
                            ELSE NULL
                        END
                    ) FILTER (WHERE a.id IS NOT NULL),
                    '[]'::json
                ) as members
            FROM team t
            LEFT JOIN account a ON t.id = a.team AND a.role = 'Nhân viên'
            WHERE t.id = $1
            GROUP BY t.id, t.name, t.description, t.active, t.created_at, t.updated_at
        `
        const teamWithMembers: any = await executeQuery(teamWithMembersQuery, [id])

        return NextResponse.json(
            {
                success: true,
                message: "Team updated successfully",
                data: teamWithMembers[0],
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error updating team:", error)

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
                message: "Error updating team",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
