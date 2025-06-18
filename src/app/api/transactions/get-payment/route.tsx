// File: /app/api/content/route.ts
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const cookieStore = cookies();
        const userInfo = cookieStore.get('userInfo');

        if (!userInfo) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const userData = JSON.parse(userInfo.value);

        // Get transaction data for specific user
        let transactionResult = null;
        try {
            transactionResult = await prisma.transactions.findMany({
                where: {
                    name: userData.username
                },
                orderBy: {
                    id: 'desc'
                },
                select: {
                    week: true,
                    name: true,
                    status: true
                }
            });
        } catch (error) {
            console.log("No transactions found for user:", userData.username);
            transactionResult = null;
        }

        return NextResponse.json({
            success: true,
            transaction: transactionResult,
        });
    } catch (error: any) {
        console.error("Lỗi GET content:", error);
        return NextResponse.json(
            { success: false, message: "Lỗi khi lấy danh sách", error: error.message },
            { status: 500 }
        );
    }
}
