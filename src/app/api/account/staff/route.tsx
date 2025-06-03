import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {
    try {
        const result = await pool.query(
            "SELECT name FROM account WHERE role = 'Nhân viên' ORDER BY name ASC"
        )

        return NextResponse.json(result.rows, { status: 200 })
    } catch (error) {
        console.error("Error fetching staff data:", error)
        return NextResponse.json({ error: "Failed to fetch staff data" }, { status: 500 })
    }
} 