import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Get all teams using Prisma
        const teams = await prisma.team.findMany({
            orderBy: {
                name: 'asc'
            }
        })

        return NextResponse.json(
            {
                success: true,
                data: teams || [],
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
