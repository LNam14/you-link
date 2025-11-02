import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { account, team } from "@prisma/client"
import { Prisma } from "@prisma/client"

type TeamWithMembers = {
    id: number;
    name: string | null;
    description: string | null;
    active: string | null;
    created_at: string | null;
    updated_at: string | null;
    _count: { accounts: number };
    accounts: Array<{
        id: number;
        username: string | null;
        name: string | null;
        role: string;
        active: string;
        created_at: Date | null;
    }>;
}

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

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

        // Get updated team
        const updatedTeamData = await prisma.team.findUnique({
            where: { id: Number(id) }
        })

        if (!updatedTeamData) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Team not found",
                },
                { status: 404 },
            )
        }

        // Get accounts for this team separately (since there's no relation in schema)
        const accounts = await prisma.account.findMany({
            where: {
                team: updatedTeamData.name,
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
        })

        // Count total accounts for this team
        const accountCount = await prisma.account.count({
            where: {
                team: updatedTeamData.name,
                role: 'Nhân viên'
            }
        })

        // Transform the data to match the expected format
        const transformedTeam:any = {
            ...updatedTeamData,
            member_count: accountCount,
            active_member_count: accounts.filter(a => a.active === "Hoạt động").length,
            members: accounts,
            _count: { accounts: accountCount },
            accounts: accounts
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
