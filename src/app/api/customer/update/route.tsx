// File: app/api/customer/route.ts (trong cùng file hoặc tách riêng cũng được)

import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
    try {
        // Ensure database connection is established
        try {
            await connectDB();
        } catch (dbError: any) {
            console.error("Database connection error:", dbError);
            return NextResponse.json(
                { error: "Database connection failed", details: dbError?.message || 'Unknown database error' },
                { status: 503 }
            );
        }

        // Verify prisma client is available
        if (!prisma) {
            throw new Error("Database client not initialized");
        }

        const data = await request.json()
        const customersToUpdate = Array.isArray(data) ? data : [data]
        const results: any = []

        // Process all updates in a transaction
        await prisma.$transaction(async (tx) => {
            for (const customer of customersToUpdate) {
                const {
                    id,
                    ma_moi,
                    phan_loai,
                    phien_ban,
                    ma_cu,
                    oder,
                    cty,
                    team,
                    chuc_vu,
                    telegram,
                    username,
                    khac,
                    link_nhom,
                    id_nhom,
                    info,
                    nhom,
                    nguoi_cham1,
                    nguoi_cham2,
                    tab_don,
                    cong_no,
                    tin_dung,
                    ngay_check,
                    tinh_trang,
                    note_kt,
                } = customer

                if (!id) {
                    throw new Error("Customer ID is required for update")
                }

                // Convert date string to Date object if it's in DD/MM/YYYY format
                let formattedDate: string | undefined
                if (ngay_check) {
                    if (typeof ngay_check === 'string') {
                        const [day, month, year] = ngay_check.split('/')
                        if (day && month && year) {
                            // Convert to YYYY-MM-DD format string
                            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                        }
                    } else if (ngay_check instanceof Date) {
                        // If it's already a Date object, format it as YYYY-MM-DD
                        formattedDate = ngay_check.toISOString().split('T')[0]
                    }
                }

                // Update customer using Prisma
                try {
                    const updatedCustomer = await tx.customer_data.update({
                        where: { id },
                        data: {
                            ma_moi,
                            phan_loai,
                            phien_ban,
                            ma_cu,
                            oder,
                            cty,
                            team,
                            chuc_vu,
                            telegram,
                            username,
                            khac,
                            link_nhom,
                            id_nhom,
                            info,
                            nhom,
                            nguoi_cham1,
                            nguoi_cham2,
                            tab_don,
                            cong_no,
                            tin_dung,
                            ngay_check: formattedDate || null,
                            tinh_trang,
                            note_kt,
                        },
                    });
                    results.push(updatedCustomer);
                } catch (updateError: any) {
                    console.error(`Error updating customer ${id}:`, updateError);
                    if (updateError.code === 'P2025') {
                        throw new Error(`Customer with ID ${id} not found`);
                    }
                    throw updateError;
                }
            }
        });

        // Return results in the same format as input
        return NextResponse.json(Array.isArray(data) ? results : results[0], { status: 200 })
    } catch (error: any) {
        console.error("Error updating customer data:", error);
        const statusCode = error.code === 'P2025' ? 404 : 500;
        return NextResponse.json(
            {
                error: "Failed to update customer data",
                details: error.message,
                code: error.code
            },
            { status: statusCode }
        );
    }
}
