import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import executeQuery from "@/app/db/db";

const GET_LAST_ORDER_NUMBER = `
  SELECT ma_don 
  FROM content 
  WHERE ma_don LIKE $1 
  ORDER BY ma_don DESC 
  LIMIT 1
`;

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

async function getNextOrderNumber(username: string): Promise<string> {
    const pattern = `${username}-%`;
    const result: any = await executeQuery(GET_LAST_ORDER_NUMBER, [pattern]);

    if (!result || result.length === 0) {
        return `${username}-1`;
    }

    const lastOrder = result[0].ma_don;
    const lastNumber = parseInt(lastOrder.split('-')[1]);
    return `${username}-${lastNumber + 1}`;
}

function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const {
            loai, ngay_order = new Date(), note_kh1, note_kh2, chu_de, note,
            anchor1, url1, anchor2, url2, link_kq, deadline = new Date().toISOString(),
            gia_ban = 0, gia_mua = 0, ten_ncc, ma_ncc,
            tt_kh = "Chưa nhập", tt_ncc = "Chưa nhận",
            chat = [],
        } = body;

        // Get user info from cookie
        const userInfo = await getUserInfoFromCookie();
        if (!userInfo || !userInfo.username) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy thông tin người dùng" },
                { status: 401 }
            );
        }

        // Generate ma_don
        const ma_don = await getNextOrderNumber(userInfo.username);

        // Format ngay_order to DD/MM/YYYY
        const validNgayOrder = formatDate(new Date(ngay_order));

        const insertResult: any = await executeQuery(INSERT_CONTENT, [
            ma_don, loai, validNgayOrder, note_kh1, note_kh2, chu_de,
            anchor1, url1, anchor2, url2, link_kq, deadline,
            gia_ban, gia_mua, ten_ncc, ma_ncc, tt_kh, tt_ncc, JSON.stringify(chat), note,
        ]);

        if (!insertResult || insertResult.length === 0) {
            return NextResponse.json(
                { success: false, message: "Không thể tạo nội dung" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: true, message: "Tạo nội dung thành công!", content: insertResult[0] },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error creating content:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Đã xảy ra lỗi khi tạo nội dung",
                error: process.env.NODE_ENV === "development" ? error : undefined,
            },
            { status: 500 }
        );
    }
}

async function getUserInfoFromCookie() {
    try {
        const cookieStore = cookies();
        const userInfoCookie = cookieStore.get("userInfo");

        if (!userInfoCookie) return null;

        return JSON.parse(userInfoCookie.value);
    } catch (error) {
        console.error("Error parsing user info cookie:", error);
        return null;
    }
}
