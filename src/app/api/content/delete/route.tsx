// File: /app/api/content/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

        const result = await prisma.content.delete({
            where: { id }
        });

        return NextResponse.json({
            success: true,
            message: "Xóa bản ghi thành công",
            deleted: result,
        });
    } catch (error: any) {
        console.error("Lỗi khi xóa content:", error);
        return NextResponse.json(
            { success: false, message: "Lỗi xóa bản ghi", error: error.message },
            { status: 500 }
        );
    }
}
