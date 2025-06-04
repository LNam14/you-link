import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { PaymentService } from "@/lib/payment"
import { prisma } from "@/lib/db"

// Add dynamic route configuration
export const dynamic = 'force-dynamic';
/**
 * API tạo giao dịch mới
 */
export async function POST(request: Request) {
    try {
        // Lấy thông tin người dùng từ cookie
        const userInfo = await getUserInfoFromCookie()

        if (!userInfo || !userInfo?.id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Bạn cần đăng nhập để thực hiện giao dịch",
                },
                { status: 401 },
            )
        }

        // Lấy và kiểm tra dữ liệu đầu vào
        const body = await request.json().catch(() => ({}))
        const { type, amount, paymentMethod, wallet, customer_id = userInfo?.id } = body

        // Tạo description theo format: username + timestamp
        const timestamp = Date.now()
        const description = `${userInfo?.username}-${timestamp}`

        // Sử dụng PaymentService để xử lý thanh toán
        const paymentService = PaymentService.getInstance()
        const result = await paymentService.processPayment(userInfo?.id, amount, paymentMethod)

        // Kiểm tra số tiền
        if (!amount) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Số tiền giao dịch là bắt buộc",
                },
                { status: 400 },
            )
        }

        if (isNaN(Number(amount)) || Number(amount) <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Số tiền phải là một số dương. Giá trị hiện tại: ${amount}`,
                },
                { status: 400 },
            )
        }

        try {
            // Tạo giao dịch mới sử dụng Prisma
            const newTransaction = await prisma.transactions.create({
                data: {
                    type,
                    amount: amount.toString(),
                    deposit_date: new Date(),
                    method: paymentMethod,
                    description,
                    customer_id,
                    name: userInfo?.username || "unknown",
                    wallet,
                    status: "Đang chờ"
                },
                // @ts-expect-error - Prisma types are not properly inferred
                include: {
                    account: {
                        select: {
                            username: true
                        }
                    }
                }
            }) as any;

            return NextResponse.json(
                {
                    success: true,
                    message: "Tạo giao dịch thành công! Giao dịch của bạn đang chờ xác nhận.",
                    transaction: newTransaction,
                },
                { status: 201 },
            )
        } catch (error) {
            throw error
        }
    } catch (error: any) {
        // Xử lý lỗi
        console.error("Error creating transaction:", error)

        return NextResponse.json(
            {
                success: false,
                message: error.message || "Lỗi khi xử lý yêu cầu tạo giao dịch",
                error: process.env.NODE_ENV === "development" ? error : undefined,
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
