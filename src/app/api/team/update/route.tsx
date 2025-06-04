import { prisma } from "@/lib/db"
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

        // Get the old team name for updating accounts
        const oldTeam = await prisma.team.findUnique({
            where: { id: Number(id) }
        })

        if (!oldTeam) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Team not found",
                },
                { status: 404 },
            )
        }

        // Update team and accounts in a transaction
        const [updatedTeam] = await prisma.$transaction([
            // Update team
            prisma.team.update({
                where: { id: Number(id) },
                data: {
                    name,
                    description,
                    active: active !== undefined ? active : "Hoạt động",
                    updated_at: new Date().toISOString()
                }
            }),
            // Update accounts
            prisma.account.updateMany({
                where: { team: oldTeam.name },
                data: { team: name }
            })
        ])

        // Get updated team with member details
        const teamWithMembers = await prisma.team.findUnique({
            where: { id: Number(id) },
            include: {
                _count: {
                    select: {
                        accounts: true
                    }
                },
                accounts: {
                    where: {
                        role: 'Nhân viên'
                    },
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        role: true,
                        active: true,
                        created_at: true
                    }
                }
            }
        })

        // Transform the data to match the expected format
        const transformedTeam = {
            ...teamWithMembers,
            member_count: teamWithMembers?._count.accounts || 0,
            active_member_count: teamWithMembers?.accounts.filter(a => a.active === true).length || 0,
            members: teamWithMembers?.accounts || []
        }

        return NextResponse.json(
            {
                success: true,
                message: "Team updated successfully",
                data: transformedTeam,
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error updating team:", error)

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
                message: "Error updating team",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
