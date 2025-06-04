import { prisma } from "@/lib/db"
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

        // Get current team status
        const team = await prisma.team.findUnique({
            where: { id: Number(id) }
        })

        if (!team) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Team not found",
                },
                { status: 404 },
            )
        }

        // Toggle team active status
        const newStatus = team.active === "Hoạt động" ? "Ngưng hoạt động" : "Hoạt động"
        const updatedTeam = await prisma.team.update({
            where: { id: Number(id) },
            data: {
                active: newStatus,
                updated_at: new Date().toISOString()
            }
        })

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
