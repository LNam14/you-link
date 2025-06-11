// File: /app/api/content/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest) {
    try {
        let body;
        try {
            const rawBody = await req.text();
            console.log("Raw request body:", rawBody); // Log raw body for debugging
            body = JSON.parse(rawBody);
        } catch (parseError) {
            console.error("JSON Parse Error Details:", {
                error: parseError instanceof Error ? parseError.message : "Unknown parsing error",
                stack: parseError instanceof Error ? parseError.stack : undefined
            });
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid JSON format in request body",
                    error: parseError instanceof Error ? parseError.message : "Unknown parsing error",
                    details: "Please ensure all property names and string values are double-quoted"
                },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!body.id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required field: id",
                    receivedFields: Object.keys(body)
                },
                { status: 400 }
            );
        }

        // Validate chat array format if present
        if (body.chat && !Array.isArray(body.chat)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid chat format",
                    details: "Chat must be an array of objects with role, name, message, and time properties"
                },
                { status: 400 }
            );
        }

        const {
            id,
            loai, ngay_order, note_kh1, note_kh2, chu_de,
            anchor1, url1, anchor2, url2, link_kq, deadline,
            gia_ban, gia_mua, ten_ncc, ma_ncc,
            tt_kh, tt_ncc, chat,
            note,
        } = body;

        // Create update data object with only provided fields
        const updateData: any = {};
        if (loai !== undefined) updateData.loai = loai;
        if (ngay_order !== undefined) updateData.ngay_order = ngay_order;
        if (note_kh1 !== undefined) updateData.note_kh1 = note_kh1;
        if (note_kh2 !== undefined) updateData.note_kh2 = note_kh2;
        if (chu_de !== undefined) updateData.chu_de = chu_de;
        if (anchor1 !== undefined) updateData.anchor1 = anchor1;
        if (url1 !== undefined) updateData.url1 = url1;
        if (anchor2 !== undefined) updateData.anchor2 = anchor2;
        if (url2 !== undefined) updateData.url2 = url2;
        if (link_kq !== undefined) updateData.link_kq = link_kq;
        if (deadline !== undefined) updateData.deadline = deadline;
        if (gia_ban !== undefined) updateData.gia_ban = gia_ban;
        if (gia_mua !== undefined) updateData.gia_mua = gia_mua;
        if (ten_ncc !== undefined) updateData.ten_ncc = ten_ncc;
        if (ma_ncc !== undefined) updateData.ma_ncc = ma_ncc;
        if (tt_kh !== undefined) updateData.tt_kh = tt_kh;
        if (tt_ncc !== undefined) updateData.tt_ncc = tt_ncc;
        if (chat !== undefined) updateData.chat = JSON.stringify(chat);
        if (note !== undefined) updateData.note = note;

        // If no fields to update, return error
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, message: "Không có trường nào để cập nhật" },
                { status: 400 }
            );
        }

        const result = await prisma.content.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true, message: "Cập nhật thành công", content: result });
    } catch (error: any) {
        console.error("Lỗi PUT content:", error);
        return NextResponse.json(
            { success: false, message: "Lỗi cập nhật", error: error.message },
            { status: 500 }
        );
    }
}
