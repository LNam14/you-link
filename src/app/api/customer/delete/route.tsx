import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: "ID is required for delete" }, { status: 400 })
        }

        const result = await pool.query(
            "DELETE FROM customer_data WHERE id = $1 RETURNING *",
            [id]
        )

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "Customer deleted successfully", data: result.rows[0] }, { status: 200 })
    } catch (error) {
        console.error("Error deleting customer data:", error)
        return NextResponse.json({ error: "Failed to delete customer data" }, { status: 500 })
    }
}
