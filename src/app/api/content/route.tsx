import { NextResponse } from "next/server";
import executeQuery from "@/app/db/db";

const INSERT_CONTENT = `
  INSERT INTO content (
    ma_don, loai, ngay_order, note_kh1, note_kh2, chu_de,
    anchor1, url1, anchor2, url2, link_kq, deadline,
    gia_ban, gia_mua, ten_ncc, ma_ncc, tt_kh, tt_ncc, chat, note
  ) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12,
    $13, $14, $15, $16, $17, $18, $19, $20
  ) RETURNING *
`;

export async function POST(request: any) {
    const body = await request.json();
    const orders = Object.entries(body).map(([ma_don, orderData]: any) => ({
        ma_don,
        loai: orderData.loai || "Content 1",
        ngay_order: orderData.ngay_order || "31/05/2025",
        note_kh1: orderData.note_kh1 || "",
        note_kh2: orderData.note_kh2 || "",
        chu_de: orderData.chu_de || "",
        note: orderData.note || "1 ngày lên được 60 bài",
        anchor1: orderData.anchor1 || "",
        url1: orderData.url1 || "",
        anchor2: orderData.anchor2 || "",
        url2: orderData.url2 || "",
        link_kq: orderData.link_kq || "",
        deadline: orderData.deadline || "",
        gia_ban: orderData.gia_ban || 2.31,
        gia_mua: orderData.gia_mua || 2.31,
        ten_ncc: orderData.ten_ncc || "",
        ma_ncc: orderData.ma_ncc || "ODR1",
        tt_kh: orderData.tt_kh || "Đã nhập",
        tt_ncc: orderData.tt_ncc || "Đã lên bài",
        chat: orderData.chat || []
    }));

    const results: any = [];
    for (const order of orders) {
        const insertResult: any = await executeQuery(INSERT_CONTENT, [
            order.ma_don,
            order.loai,
            order.ngay_order,
            order.note_kh1,
            order.note_kh2,
            order.chu_de,
            order.anchor1,
            order.url1,
            order.anchor2,
            order.url2,
            order.link_kq,
            order.deadline,
            order.gia_ban,
            order.gia_mua,
            order.ten_ncc,
            order.ma_ncc,
            order.tt_kh,
            order.tt_ncc,
            JSON.stringify(order.chat),
            order.note
        ]);
        results.push({
            ma_don: order.ma_don,
            success: true,
            message: "Tạo nội dung thành công!",
            content: insertResult[0]
        });
    }

    return NextResponse.json(
        { success: true, message: "Xử lý các đơn hàng thành công!", results },
        { status: 201 }
    );
}