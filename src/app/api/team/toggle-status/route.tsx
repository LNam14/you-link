import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const { id } = await request.json()

        // Validate input
        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Team ID is required",
                },
                { status: 400 },
            )
        }

        // Toggle team active status
        const query = `
            UPDATE team 
            SET active = CASE 
                WHEN active = 'Hoạt động' THEN 'Ngưng hoạt động'
                WHEN active = 'Ngưng hoạt động' THEN 'Hoạt động'
                ELSE active
            END,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 
            RETURNING *
        `
        const result = await executeQuery(query, [id])

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

        const updatedTeam = result[0]
        const statusMessage = updatedTeam.active === "Hoạt động" ? "kích hoạt" : "vô hiệu hóa"

        return NextResponse.json(
            {
                success: true,
                message: `Team đã được ${statusMessage} thành công`,
                data: updatedTeam,
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error toggling team status:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Error toggling team status",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
