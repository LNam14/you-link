import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import executeQuery from "@/app/db/db"

// Sử dụng biến môi trường cho thông tin nhạy cảm
const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || process.env.NEXT_PRIVATE_TOKEN || "your_refresh_token_secret"

// Chuẩn bị các câu truy vấn SQL
// PostgreSQL uses $1, $2, etc. for parameterized queries instead of ?
const CHECK_USER_BY_ID = `SELECT id FROM account WHERE id = $1 LIMIT 1`
const CHECK_USER_BY_USERNAME = `SELECT id FROM account WHERE username = $1 LIMIT 1`
const UPDATE_USER = `UPDATE account SET name = $1, username = $2, password = $3, phone = $4, role = $5, active = $6 WHERE id = $7`
const INSERT_USER = `INSERT INTO account (id, name, username, telegram, password, phone, role, refreshToken) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

// Interface cho dữ liệu người dùng
interface UserData {
    id: string | number
    name: string
    username?: string
    password: string
    phone?: string
    role: string
    active?: boolean
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
                    errors.push({ id: user.id, message: validationError })
                    continue
                }

                const { id, name, username, password, phone, role, active, telegram } = user

                // Kiểm tra người dùng tồn tại bằng ID
                const existingUsers = await executeQuery(CHECK_USER_BY_ID, [id])
                const userExists = Array.isArray(existingUsers) && existingUsers.length > 0

                if (userExists) {
                    // Cập nhật người dùng hiện có
                    await executeQuery(UPDATE_USER, [name, username, password, phone, role, active, id])

                    results.push({ id, action: "updated" })
                } else {
                    // Kiểm tra username đã tồn tại chưa
                    if (username) {
                        const existingUsernames = await executeQuery(CHECK_USER_BY_USERNAME, [username])

                        if (Array.isArray(existingUsernames) && existingUsernames.length > 0) {
                            errors.push({ id, message: `Username ${username} đã tồn tại!` })
                            continue
                        }
                    }

                    // Tạo refresh token cho người dùng mới
                    const refreshToken = createRefreshToken(username || name, role)

                    // Thêm người dùng mới
                    const log = await executeQuery(INSERT_USER, [id, name, username, telegram, password, phone, role, refreshToken])
                    console.log("log", log);

                    results.push({ id, action: "created" })
                }
            } catch (userError: any) {
                errors.push({ id: user.id, message: userError.message })
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
                message: "Xử lý thành công.",
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
