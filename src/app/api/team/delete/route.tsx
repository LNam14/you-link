import { prisma } from "@/lib/db"
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

        // First find the team to get its ID
        const team = await prisma.team.findFirst({
            where: { name }
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

        // Update accounts to remove team association
        await prisma.account.updateMany({
            where: { team: name },
            data: { team: null }
        })

        // Delete the team
        const deletedTeam = await prisma.team.delete({
            where: { id: team.id }
        })

        return NextResponse.json(
            {
                success: true,
                message: "Team deleted successfully",
                data: deletedTeam,
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
