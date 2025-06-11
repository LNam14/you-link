import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

async function getNextOrderNumber(username: string): Promise<string> {
    try {
        // Find all content entries for this username
        const allContent = await prisma.content.findMany({
            where: {
                ma_don: {
                    startsWith: username + '-'
                }
            },
            select: {
                ma_don: true
            }
        });

        // Find the highest number
        let maxNumber = 0;
        allContent.forEach(content => {
            const match = content.ma_don.match(/-(\d+)$/);
            if (match) {
                const number = parseInt(match[1]);
                if (number > maxNumber) {
                    maxNumber = number;
                }
            }
        });

        // Generate next number
        const nextNumber = maxNumber + 1;
        return `${username}-${nextNumber}`;
    } catch (error) {
        console.error('Error in getNextOrderNumber:', error);
        throw error;
    }
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
        const cookieStore = cookies();
        const userInfoCookie = cookieStore.get("userInfo");

        if (!userInfoCookie) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy thông tin người dùng" },
                { status: 401 }
            );
        }

        const userInfo = JSON.parse(userInfoCookie.value);
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

        const content = await prisma.content.create({
            data: {
                ma_don,
                loai,
                ngay_order: validNgayOrder,
                note_kh1,
                note_kh2,
                chu_de,
                anchor1,
                url1,
                anchor2,
                url2,
                link_kq,
                deadline,
                gia_ban,
                gia_mua,
                ten_ncc,
                ma_ncc,
                tt_kh,
                tt_ncc,
                chat: JSON.stringify(chat),
                note,
            }
        });

        return NextResponse.json(
            { success: true, message: "Tạo nội dung thành công!", content },
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
