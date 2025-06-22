import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { role, count = 1, team, position } = body

        // Validate input
        if (!role || count < 1) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required fields or invalid count"
                },
                { status: 400 }
            )
        }

        // Create array of account data for bulk creation
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
        const accountsData = Array(count).fill(null).map(() => ({
            role,
            ...(team && { team }),
            ...(position && { position }),
            created_at: now,
            updated_at: now,
        }))

        // Create multiple accounts using Prisma
        const result = await prisma.account.createMany({
            data: accountsData,
            skipDuplicates: true,
        })

        return NextResponse.json(
            {
                success: true,
                message: `Successfully created ${result.count} accounts`,
                data: result
            },
            { status: 200 }
        )

    } catch (error: any) {
        console.error("Error creating accounts:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Error creating accounts",
                error: error.message
            },
            { status: 500 }
        )
    }
} 