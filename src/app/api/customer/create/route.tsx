// File: app/api/customer/create/route.ts
import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // Ensure database connection is established
        await connectDB();

        const { numberOfRows } = await request.json()

        if (!numberOfRows || typeof numberOfRows !== 'number' || numberOfRows <= 0) {
            return NextResponse.json({ error: "Invalid number of rows" }, { status: 400 })
        }

        // Get current date in DD/MM/YYYY format
        const today = new Date()
        const day = String(today.getDate()).padStart(2, '0')
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const year = today.getFullYear()
        const formattedDate = `${day}/${month}/${year}`

        // Create multiple customers using Prisma's createMany
        const customers = await prisma.customer_data.createMany({
            data: Array(numberOfRows).fill({
                ma_moi: "",
                ma_cu: "",
                phan_loai: "",
                phien_ban: "",
                oder: "",
                cty: "",
                team: "",
                chuc_vu: "",
                telegram: "",
                username: "",
                khac: "",
                link_nhom: "",
                id_nhom: "",
                info: "",
                nhom: "",
                nguoi_cham1: "",
                nguoi_cham2: "",
                tab_don: "",
                cong_no: "",
                tin_dung: "",
                tinh_trang: "binh_thuong",
                ngay_check: formattedDate,
                note_kt: "",
                nguoi_xem: ""
            }),
        })

        // Fetch the created customers to return them
        const createdCustomers = await prisma.customer_data.findMany({
            orderBy: {
                id: 'desc'
            },
            take: numberOfRows
        })

        return NextResponse.json(createdCustomers, { status: 201 })
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
