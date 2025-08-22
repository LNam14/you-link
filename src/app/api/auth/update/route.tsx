import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { id, field, value } = await request.json()

        // Validate input
        if (!id || field === undefined || value === undefined) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required fields: id, field, and value are required",
                },
                { status: 400 },
            )
        }

        // Map field index to database column names
        const fieldMap: { [key: string | number]: string } = {
            0: "username",
            1: "password",
            2: "name",
            3: "role",
            4: "position",
            5: "created_at",
            6: "updated_at",
            7: "active",
            8: "team",
        }

        const columnName = fieldMap[field]
        if (!columnName) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Invalid field index: ${field}. Valid values are: 0-8`,
                },
                { status: 400 },
            )
        }

        // Build update data object
        const updateData: any = {}
        updateData[columnName] = value

        // Coerce id to number and validate
        const numericId = Number(id)
        if (!Number.isInteger(numericId)) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Invalid id: expected integer, received ${id}`,
                },
                { status: 400 },
            )
        }

        // Update the account using Prisma
        const updatedAccount = await prisma.account.update({
            where: { id: numericId },
            data: updateData,
        })

        return NextResponse.json(
            {
                success: true,
                message: "Account updated successfully",
                data: updatedAccount,
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error updating account:", error)

        // Check for duplicate username error
        if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Username đã tồn tại",
                },
                { status: 400 },
            )
        }

        return NextResponse.json(
            {
                success: false,
                message: "Error updating account",
                error: error.message,
            },
            { status: 500 },
        )
    }
}
