import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

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
            7: "status",
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

        // Update the account
        const query = `UPDATE account SET ${columnName} = $1 WHERE id = $2 RETURNING *`
        const result = await executeQuery(query, [value, id])

        // Check if any rows were affected
        if (!Array.isArray(result) || result.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Username đã tồn tại!",
                },
                { status: 404 },
            )
        }

        return NextResponse.json(
            {
                success: true,
                message: "Account updated successfully",
                data: result[0],
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error updating account:", error)

        // Check for duplicate username error
        if (error.message && error.message.includes("account_username_key")) {
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
