import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        // Query to get all accounts grouped by role
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

        return NextResponse.json(
            {
                success: true,
                data: {
                    Admin: groupedAccounts['Admin'] || [],
                    NCC: groupedAccounts['NCC'] || [],
                    NV: groupedAccounts['Nhân viên'] || []
                },
                message: "Successfully retrieved accounts grouped by role"
            },
            { status: 200 }
        )

    } catch (error: any) {
        console.error("Error getting accounts:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Error getting accounts",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
