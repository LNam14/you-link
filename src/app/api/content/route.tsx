import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    try {
      const newContent = await prisma.content.create({
        data: {
          ma_don: order.ma_don,
          loai: order.loai,
          ngay_order: order.ngay_order,
          note_kh1: order.note_kh1,
          note_kh2: order.note_kh2,
          chu_de: order.chu_de,
          anchor1: order.anchor1,
          url1: order.url1,
          anchor2: order.anchor2,
          url2: order.url2,
          link_kq: order.link_kq,
          deadline: order.deadline,
          gia_ban: order.gia_ban,
          gia_mua: order.gia_mua,
          ten_ncc: order.ten_ncc,
          ma_ncc: order.ma_ncc,
          tt_kh: order.tt_kh,
          tt_ncc: order.tt_ncc,
          chat: JSON.stringify(order.chat),
          note: order.note
        }
      });

      results.push({
        ma_don: order.ma_don,
        success: true,
        message: "Tạo nội dung thành công!",
        content: newContent
      });
    } catch (error: any) {
      results.push({
        ma_don: order.ma_don,
        success: false,
        message: error.message || "Lỗi khi tạo nội dung",
        error: process.env.NODE_ENV === "development" ? error : undefined
      });
    }
  }

  return NextResponse.json(
    { success: true, message: "Xử lý các đơn hàng thành công!", results },
    { status: 201 }
  );
}