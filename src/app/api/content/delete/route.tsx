// File: /app/api/content/route.ts
import { NextRequest, NextResponse } from "next/server";
import executeQuery from "@/app/db/db";

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Thiếu id trong request body" },
                { status: 400 }
            );
        }

        const result: any = await executeQuery("DELETE FROM content WHERE id = $1 RETURNING *", [id]);

        if (!result || result.length === 0) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy bản ghi để xóa" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Xóa bản ghi thành công",
            deleted: result[0],
        });
    } catch (error: any) {
        console.error("Lỗi khi xóa content:", error);
        return NextResponse.json(
            { success: false, message: "Lỗi xóa bản ghi", error: error.message },
            { status: 500 }
        );
    }
}
