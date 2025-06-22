import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id } = body

        // Validate input
        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing id"
                },
                { status: 400 }
            )
        }

        // Delete the account using Prisma
        const deletedAccount = await prisma.account.delete({
            where: {
                id: Number(id)
            }
        })

        return NextResponse.json(
            {
                success: true,
                message: "Account deleted successfully"
            },
            { status: 200 }
        )

    } catch (error: any) {
        console.error("Error deleting account:", error)

        // Handle Prisma's specific error types
        if (error.code === 'P2025') {
            return NextResponse.json(
                {
                    success: false,
                    message: "Account not found"
                },
                { status: 404 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                message: "Error deleting account",
                error: error.message
            },
            { status: 500 }
        )
    }
} 