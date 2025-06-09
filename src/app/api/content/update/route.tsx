// File: /app/api/content/route.ts
import { NextRequest, NextResponse } from "next/server";
import executeQuery from "@/app/db/db";

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
            id, // Use id instead of ma_don
            loai, ngay_order, note_kh1, note_kh2, chu_de,
            anchor1, url1, anchor2, url2, link_kq, deadline,
            gia_ban, gia_mua, ten_ncc, ma_ncc,
            tt_kh, tt_ncc, chat,
            note,
        } = body;

        if (!id) {
            return NextResponse.json({ success: false, message: "Thiếu id trong request body" }, { status: 400 });
        }

        // Build dynamic update query based on provided fields
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        // Helper function to add field to update if it exists in body
        const addFieldToUpdate = (fieldName: string, value: any) => {
            if (value !== undefined) {
                updateFields.push(`${fieldName} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        };

        // Add each field to update if it exists in the request
        addFieldToUpdate('loai', loai);
        addFieldToUpdate('ngay_order', ngay_order);
        addFieldToUpdate('note_kh1', note_kh1);
        addFieldToUpdate('note_kh2', note_kh2);
        addFieldToUpdate('chu_de', chu_de);
        addFieldToUpdate('anchor1', anchor1);
        addFieldToUpdate('url1', url1);
        addFieldToUpdate('anchor2', anchor2);
        addFieldToUpdate('url2', url2);
        addFieldToUpdate('link_kq', link_kq);
        addFieldToUpdate('deadline', deadline);
        addFieldToUpdate('gia_ban', gia_ban);
        addFieldToUpdate('gia_mua', gia_mua);
        addFieldToUpdate('ten_ncc', ten_ncc);
        addFieldToUpdate('ma_ncc', ma_ncc);
        addFieldToUpdate('tt_kh', tt_kh);
        addFieldToUpdate('tt_ncc', tt_ncc);
        addFieldToUpdate('chat', chat ? JSON.stringify(chat) : undefined);
        addFieldToUpdate('note', note);

        // If no fields to update, return error
        if (updateFields.length === 0) {
            return NextResponse.json(
                { success: false, message: "Không có trường nào để cập nhật" },
                { status: 400 }
            );
        }

        // Add id as the last parameter
        values.push(id);

        const query = `
            UPDATE content 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result: any = await executeQuery(query, values);

        if (!result || result.length === 0) {
            return NextResponse.json({ success: false, message: "Không tìm thấy bản ghi để cập nhật" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Cập nhật thành công", content: result[0] });
    } catch (error: any) {
        console.error("Lỗi PUT content:", error);
        return NextResponse.json({ success: false, message: "Lỗi cập nhật", error: error.message }, { status: 500 });
    }
}
