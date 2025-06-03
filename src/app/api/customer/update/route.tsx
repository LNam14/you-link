// File: app/api/customer/route.ts (trong cùng file hoặc tách riêng cũng được)

import { pool } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PUT(request: Request) {
    const client = await pool.connect()

    try {
        const data = await request.json()

        // Chuyển đổi data thành mảng nếu là object đơn lẻ
        const itemsToUpdate = Array.isArray(data) ? data : [data]

        // Bắt đầu transaction
        await client.query('BEGIN')

        const results = []

        for (const item of itemsToUpdate) {
            const {
                id,
                ma_moi,
                phan_loai,
                phien_ban,
                ma_cu,
                cty,
                ten,
                telegram,
                link_nhom,
                id_nhom,
                nhom,
                nguoi_cham,
                tab_don,
                cong_no,
                tin_dung,
                ngay_check,
                tinh_trang,
                note_kt,
                note_khac,
            } = item

            if (!id) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: "ID is required for update" }, { status: 400 })
            }

            // Validate and process array fields
            const processedTen = Array.isArray(ten) ? ten : [ten].filter(Boolean)
            const processedTelegram = Array.isArray(telegram) ? telegram : [telegram].filter(Boolean)

            // Chuyển ngày nếu có
            const formattedDate = ngay_check
                ? (() => {
                    const [day, month, year] = ngay_check.split("/")
                    return `${year}-${month}-${day}`
                })()
                : null

            const result = await client.query(
                `UPDATE customer_data SET
                ma_moi = $1,
                phan_loai = $2,
                phien_ban = $3,
                ma_cu = $4,
                cty = $5,
                ten = $6,
                telegram = $7,
                link_nhom = $8,
                id_nhom = $9,
                nhom = $10,
                nguoi_cham = $11,
                tab_don = $12,
                cong_no = $13,
                tin_dung = $14,
                ngay_check = $15,
                tinh_trang = $16,
                note_kt = $17,
                note_khac = $18
                WHERE id = $19
                RETURNING *`,
                [
                    ma_moi,
                    phan_loai,
                    phien_ban,
                    ma_cu,
                    cty,
                    processedTen,
                    processedTelegram,
                    link_nhom,
                    id_nhom,
                    nhom,
                    nguoi_cham,
                    tab_don,
                    cong_no,
                    tin_dung,
                    formattedDate,
                    tinh_trang,
                    note_kt,
                    note_khac,
                    id,
                ]
            )

            if (result.rowCount === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: `Customer with ID ${id} not found` }, { status: 404 })
            }

            results.push(result.rows[0])
        }

        // Commit transaction nếu tất cả đều thành công
        await client.query('COMMIT')

        // Trả về kết quả phù hợp với kiểu input
        return NextResponse.json(Array.isArray(data) ? results : results[0], { status: 200 })
    } catch (error) {
        // Rollback nếu có lỗi
        await client.query('ROLLBACK')
        console.error("Error updating customer data:", error)
        return NextResponse.json({ error: "Failed to update customer data" }, { status: 500 })
    } finally {
        // Giải phóng client
        client.release()
    }
}
