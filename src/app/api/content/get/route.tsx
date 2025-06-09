// File: /app/api/content/route.ts
import executeQuery from "@/app/db/db";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';

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

        // Query 1: Get all content
        const contentResult = await executeQuery("SELECT * FROM content ORDER BY id DESC", []);

        // Query 2: Get transaction data for specific user
        let transactionResult = null;
        try {
            transactionResult = await executeQuery(
                `SELECT week, name, status FROM transactions WHERE name = '${userData.username}' ORDER BY id DESC`,
                []
            );
        } catch (error) {
            console.log("No transactions found for user:", userData.username);
            transactionResult = null;
        }

        return NextResponse.json({
            success: true,
            data: contentResult,
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
