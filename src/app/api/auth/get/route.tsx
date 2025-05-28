import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        // Query to get all accounts
        const result: any = await executeQuery("SELECT * FROM account", [])

        // Group accounts by role
        const groupedAccounts = result.reduce((acc: any, account: any) => {
            const role = account.role || 'Nhân viên' // Default to Nhân viên if role is not specified
            if (!acc[role]) {
                acc[role] = []
            }
            acc[role].push(account)
            return acc
        }, {})

        // Get all teams
        const teams: any = await executeQuery("SELECT * FROM team ORDER BY name", [])

        // Map teams to include their members
        const teamsWithMembers = teams.map((team: any) => ({
            ...team,
            members: result
                .filter((account: any) => account.team === team.name)
                .map((account: any) => ({
                    username: account.username,
                    name: account.name,
                    position: account.position
                }))
        }))

        return NextResponse.json(
            {
                success: true,
                data: {
                    Admin: groupedAccounts['Admin'] || [],
                    NCC: groupedAccounts['NCC'] || [],
                    NV: groupedAccounts['Nhân viên'] || [],
                    KH: groupedAccounts['Khách hàng'] || [],
                    teams: teamsWithMembers
                },
                message: "Successfully retrieved accounts and teams"
            },
            { status: 200 }
        )

    } catch (error: any) {
        console.error("Error getting accounts and teams:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Error getting accounts and teams",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
