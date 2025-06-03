// File: app/api/customer/create/route.ts
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(request: Request) {
    try {
        const { numberOfRows } = await request.json()

        if (!numberOfRows || typeof numberOfRows !== 'number' || numberOfRows <= 0) {
            return NextResponse.json({ error: "Invalid number of rows" }, { status: 400 })
        }

        // Get current date in DD/MM/YYYY format and convert to YYYY-MM-DD
        const today = new Date()
        const day = String(today.getDate()).padStart(2, '0')
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const year = today.getFullYear()
        const formattedDate = `${year}-${month}-${day}`

        // Start a transaction
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            // Create values array for bulk insert
            const values = Array(numberOfRows).fill([
                "", // ma_moi
                "", // phan_loai
                "", // phien_ban
                "", // ma_cu
                "", // cty
                [], // ten
                [], // telegram
                "", // link_nhom
                "", // id_nhom
                "", // nhom
                "", // nguoi_cham
                "", // tab_don
                "", // cong_no
                "", // tin_dung
                formattedDate, // ngay_check
                "binh_thuong", // tinh_trang
                "", // note_kt
                "", // note_khac
            ]).flat()

            // Create placeholders for bulk insert
            const placeholders = Array(numberOfRows)
                .fill(null)
                .map((_, i) => {
                    const start = i * 18 + 1
                    return `(${Array(18).fill(null).map((_, j) => `$${start + j}`).join(', ')})`
                })
                .join(', ')

            const result = await client.query(
                `INSERT INTO customer_data (
                    ma_moi, phan_loai, phien_ban, ma_cu, cty, ten, telegram, link_nhom,
                    id_nhom, nhom, nguoi_cham, tab_don, cong_no, tin_dung,
                    ngay_check, tinh_trang, note_kt, note_khac
                ) VALUES ${placeholders} RETURNING *`,
                values
            )

            // Commit the transaction
            await client.query('COMMIT')

            // Verify we got back the correct number of rows
            if (result.rows.length !== numberOfRows) {
                throw new Error(`Expected ${numberOfRows} rows but got ${result.rows.length}`)
            }

            return NextResponse.json(result.rows, { status: 201 })
        } catch (error) {
            // Rollback the transaction on error
            await client.query('ROLLBACK')
            throw error
        } finally {
            // Release the client back to the pool
            client.release()
        }
    } catch (error) {
        console.error("Error inserting customer data:", error)
        return NextResponse.json(
            {
                error: "Failed to insert customer data",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}
