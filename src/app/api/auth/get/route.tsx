import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Helper function to retry database operations
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

export async function GET(request: Request) {
    try {
        // Query to get all accounts using Prisma with retry
        const accounts = await retryOperation(() => prisma.account.findMany());

        // Group accounts by role
        const groupedAccounts = accounts.reduce((acc: any, account: any) => {
            const role = account.role || 'Nhân viên' // Default to Nhân viên if role is not specified
            if (!acc[role]) {
                acc[role] = []
            }
            acc[role].push(account)
            return acc
        }, {})

        // Get all teams using Prisma with retry
        const teams = await retryOperation(() => prisma.team.findMany({
            orderBy: {
                name: 'asc'
            }
        }));

        // Map teams to include their members
        const teamsWithMembers = teams.map((team: any) => ({
            ...team,
            members: accounts
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
