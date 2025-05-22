import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

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

        // Delete the account by id
        const query = `DELETE FROM account WHERE id = $1 RETURNING *`
        const result = await executeQuery(query, [id])

        // Check if the result is an error
        if ('status' in result && !result.status) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Error deleting account",
                    error: result.error
                },
                { status: 500 }
            )
        }

        // Check if any rows were affected
        if (!Array.isArray(result) || result.length === 0) {
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
                success: true,
                message: "Account deleted successfully"
            },
            { status: 200 }
        )

    } catch (error: any) {
        console.error("Error deleting account:", error)
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