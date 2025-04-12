import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import executeQuery from "@/app/db/db"
import { cache } from "react"

// Sử dụng biến môi trường cho thông tin nhạy cảm
const JWT_SECRET = process.env.NEXT_PRIVATE_TOKEN || "123"

// Cache hàm tạo token để tránh tạo lại nhiều lần
const createAccessToken = cache((payload: object) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d", algorithm: "HS256" })
})

// Chuẩn bị câu truy vấn SQL một lần
// PostgreSQL uses $1, $2, etc. for parameterized queries instead of ?
const USER_QUERY = `SELECT id, name, username, password, phone, role, active FROM account WHERE username = $1 LIMIT 1`

// Hàm xử lý request được tối ưu hóa
export async function POST(request: Request) {
    try {
        // Sử dụng destructuring để lấy dữ liệu từ request
        const body = await request.json().catch(() => ({}))
        const { username, password } = body

        // Kiểm tra đầu vào
        if (!username) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Vui lòng nhập tên đăng nhập",
                    field: "username",
                },
                { status: 400 },
            )
        }

        if (!password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Vui lòng nhập mật khẩu",
                    field: "password",
                },
                { status: 400 },
            )
        }

        // Thực hiện truy vấn với prepared statement
        const users: any = await executeQuery(USER_QUERY, [username])

        // Kiểm tra kết quả truy vấn
        if (!users || users.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Tài khoản không tồn tại",
                    field: "username",
                },
                { status: 404 },
            )
        }

        // Lấy thông tin người dùng
        const userData = users[0]

        // Kiểm tra trạng thái tài khoản
        if (userData.active === 0 || userData.active === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên",
                    field: "account",
                },
                { status: 403 },
            )
        }

        // Kiểm tra mật khẩu (Lưu ý: Nên sử dụng bcrypt hoặc argon2 trong thực tế)
        if (password !== userData.password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Mật khẩu không chính xác",
                    field: "password",
                },
                { status: 401 },
            )
        }

        // Tạo payload cho token
        const tokenPayload = {
            username: userData.username,
            role: userData.role,
        }

        // Tạo Access Token (sử dụng hàm đã cache)
        const accessToken = createAccessToken(tokenPayload)

        // Tạo đối tượng thông tin người dùng (chỉ lấy các trường cần thiết)
        const userInfo = {
            id: userData.id,
            name: userData.name,
            username: userData.username,
            phone: userData.phone,
            role: userData.role,
            active: userData.active,
        }

        // Tạo response và thiết lập cookies
        const response = NextResponse.json({
            success: true,
            message: "Đăng nhập thành công!",
            user: userInfo,
        })

        // Thiết lập cookie với Access Token
        response.cookies.set("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30, // 30 ngày (tính bằng giây)
            path: "/",
            sameSite: "strict", // Tăng cường bảo mật
        })

        // Thiết lập cookie với thông tin người dùng
        response.cookies.set("userInfo", JSON.stringify(userInfo), {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30, // 30 ngày (tính bằng giây)
            path: "/",
            sameSite: "lax", // Cho phép truy cập từ client
        })

        return response
    } catch (error: any) {
        // Xử lý lỗi
        console.error("Login error:", error)

        // Trả về thông báo lỗi cụ thể
        const errorMessage = error.message || "Lỗi khi xử lý đăng nhập"

        return NextResponse.json(
            {
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === "development" ? error : undefined,
            },
            { status: 500 },
        )
    }
}
