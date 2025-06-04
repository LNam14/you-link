import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Định nghĩa các trạng thái giao dịch hợp lệ
const VALID_STATUSES = ["Đang chờ", "Hoàn thành", "Lỗi"]

// Định nghĩa các vai trò có quyền cập nhật giao dịch
const AUTHORIZED_ROLES = ["Admin", "Nhân viên"]
// Add dynamic route configuration
export const dynamic = 'force-dynamic';
/**
 * API cập nhật trạng thái giao dịch
 */
export async function POST(req: Request) {
    try {
        // Kiểm tra quyền truy cập
        const userInfo = await getUserInfoFromCookie()

        if (!userInfo || !AUTHORIZED_ROLES.includes(userInfo?.role)) {
            return NextResponse.json(
                { success: false, message: "Bạn không có quyền thực hiện hành động này" },
                { status: 403 },
            )
        }

        // Lấy và kiểm tra dữ liệu đầu vào
        const { transaction_id, status } = await req.json()

        if (!transaction_id) {
            return NextResponse.json({ success: false, message: "ID giao dịch là bắt buộc" }, { status: 400 })
        }

        if (!status || !VALID_STATUSES.includes(status)) {
            return NextResponse.json({ success: false, message: "Trạng thái không hợp lệ" }, { status: 400 })
        }

        try {
            // Cập nhật trạng thái giao dịch sử dụng Prisma
            const updatedTransaction = await prisma.transactions.update({
                where: {
                    id: transaction_id
                },
                data: {
                    status: status
                }
            });

            return NextResponse.json({
                success: true,
                message: "Cập nhật giao dịch thành công",
                status: status,
                transaction: updatedTransaction
            })
        } catch (error) {
            throw error
        }
    } catch (error: any) {
        console.error("Error updating transaction:", error)

        return NextResponse.json(
            {
                success: false,
                message: "Lỗi khi cập nhật giao dịch",
                error: process.env.NODE_ENV === "development" ? error.message : undefined,
            },
            { status: 500 },
        )
    }
}

/**
 * Lấy thông tin người dùng từ cookie
 */
async function getUserInfoFromCookie() {
    try {
        const cookieStore = cookies()
        const userInfoCookie = cookieStore.get("userInfo")

        if (!userInfoCookie) {
            return null
        }

        return JSON.parse(userInfoCookie.value)
    } catch (error) {
        console.error("Error parsing user info cookie:", error)
        return null
    }
}
