import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { PaymentService } from "@/lib/payment"
import executeQuery from "@/app/db/db"

// Câu truy vấn PostgreSQL
const INSERT_TRANSACTION = `
  INSERT INTO transactions (type, amount, deposit_date, method, description, customer_id, name, status) 
  VALUES ($1, $2, NOW(), $3, $4, $5, $6, 'Đang chờ')
  RETURNING id
`

const GET_NEW_TRANSACTION = `
  SELECT id, type, amount, deposit_date, method, description, status, customer_id 
  FROM transactions 
  WHERE id = $1 
  LIMIT 1
`

// Các phương thức thanh toán hợp lệ
const VALID_PAYMENT_METHODS = ["Bank Transfer", "Cash", "Credit Card", "Momo", "Zalo Pay", "VNPay"]

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
        const { type, amount, paymentMethod, customer_id = userInfo?.id } = body

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
            // Bắt đầu transaction
            await executeQuery("BEGIN", [])

            // Thêm giao dịch vào cơ sở dữ liệu và lấy ID được trả về
            const insertResult: any = await executeQuery(INSERT_TRANSACTION, [
                type,
                amount,
                paymentMethod,
                description,
                customer_id,
                userInfo?.username || "unknown",
            ])

            if (!insertResult || insertResult.length === 0) {
                // Rollback nếu không thể tạo giao dịch
                await executeQuery("ROLLBACK", [])
                return NextResponse.json(
                    {
                        success: false,
                        message: "Không thể tạo giao dịch. Vui lòng thử lại sau",
                    },
                    { status: 500 },
                )
            }

            // Lấy ID từ kết quả RETURNING
            const newTransactionId = insertResult[0].id

            // Lấy thông tin giao dịch vừa tạo
            const newTransaction: any = await executeQuery(GET_NEW_TRANSACTION, [newTransactionId])

            // Commit transaction
            await executeQuery("COMMIT", [])

            if (!newTransaction || newTransaction.length === 0) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Không tìm thấy giao dịch sau khi tạo. ID: ${newTransactionId}`,
                    },
                    { status: 404 },
                )
            }

            return NextResponse.json(
                {
                    success: true,
                    message: "Tạo giao dịch thành công! Giao dịch của bạn đang chờ xác nhận.",
                    transaction: newTransaction[0],
                },
                { status: 201 },
            )
        } catch (error) {
            // Rollback nếu có lỗi
            await executeQuery("ROLLBACK", [])
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
