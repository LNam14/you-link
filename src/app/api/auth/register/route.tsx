import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/db"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

// Sử dụng biến môi trường cho thông tin nhạy cảm
const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || process.env.NEXT_PRIVATE_TOKEN || "your_refresh_token_secret"

// Interface cho dữ liệu người dùng
interface UserData {
    name: string
    username?: string
    password: string
    phone?: string
    role: string
    active?: string
    telegram?: string
}

// Hàm tạo refresh token
function createRefreshToken(username: string, role: string): string {
    return jwt.sign({ username, role }, JWT_REFRESH_SECRET, {
        expiresIn: "7d",
        algorithm: "HS256",
    })
}

// Hàm kiểm tra dữ liệu đầu vào
function validateUserData(user: UserData): string | null {
    if (!user.username || !user.password) {
        return "Tên và mật khẩu là bắt buộc."
    }

    if (user.username && user.username.length < 3) {
        return "Username phải có ít nhất 3 ký tự."
    }

    if (user.password.length < 3) {
        return "Mật khẩu phải có ít nhất 3 ký tự."
    }

    return null
}

/**
 * Register/Update users API route handler
 */
export async function POST(request: Request) {
    try {
        // Lấy dữ liệu từ request
        const body = await request.json()

        // Kiểm tra dữ liệu đầu vào
        if (!Array.isArray(body) || body.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Không có người dùng nào được gửi.",
                },
                { status: 400 },
            )
        }

        const results = []
        const errors = []

        // Xử lý từng người dùng
        for (const user of body) {
            try {
                // Kiểm tra dữ liệu người dùng
                const validationError = validateUserData(user)
                if (validationError) {
                    errors.push({ username: user.username, message: validationError })
                    continue
                }

                const { name, username, password, phone, role, active, telegram } = user

                // Kiểm tra username đã tồn tại chưa
                if (username) {
                    const existingUser = await prisma.account.findUnique({
                        where: { username }
                    })

                    if (existingUser) {
                        // Cập nhật người dùng hiện có
                        const updatedUser = await prisma.account.update({
                            where: { username },
                            data: {
                                name,
                                password,
                                phone,
                                role,
                                active: active || "Hoạt động"
                            }
                        })

                        results.push({ id: updatedUser.id, username, action: "updated" })
                        continue
                    }
                }

                // Tạo refresh token cho người dùng mới
                const refreshToken = createRefreshToken(username || name, role)

                // Thêm người dùng mới
                const newUser = await prisma.account.create({
                    data: {
                        name,
                        username,
                        telegram,
                        password,
                        phone,
                        role,
                        refreshtoken: refreshToken,
                        active: active || "Hoạt động"
                    }
                })

                results.push({ id: newUser.id, username, action: "created" })
            } catch (userError: any) {
                errors.push({ username: user.username, message: userError.message })
            }
        }

        // Trả về kết quả
        if (errors.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: errors.map((e) => e.message).join("; "),
                    results,
                    errors,
                },
                { status: 207 }, // 207 Multi-Status
            )
        }

        return NextResponse.json(
            {
                success: true,
                message: "Đăng ký thành công.",
                results,
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Registration error:", error)

        return NextResponse.json(
            {
                success: false,
                message: error.message || "Có lỗi xảy ra khi xử lý.",
                error: process.env.NODE_ENV === "development" ? error : undefined,
            },
            { status: 500 },
        )
    }
}
