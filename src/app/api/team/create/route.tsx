import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

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

        // Create new team using Prisma
        const team = await prisma.team.create({
            data: {
                name,
                description,
                active,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        })

        // Return team with member count (will be 0 for new team)
        const teamWithDetails = {
            ...team,
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

        // Check for unique constraint violation
        if (error.code === 'P2002') {
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
