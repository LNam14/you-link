import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        // Xác thực tình trạng đăng nhập
        const cookies = request.headers.get('cookie') || '';
        const hasAccessToken = cookies.includes('accessToken');

        if (!hasAccessToken) {
            return new Response(JSON.stringify({
                success: false,
                message: "Not authenticated. Please log in again."
            }), { status: 401 }); // Trả về mã trạng thái 401 (Unauthorized)
        }

        // Tạo đối tượng phản hồi
        const response = NextResponse.json({
            success: true,
            message: "Logout successful."
        });

        // Xóa cookie chứa accessToken và userInfo
        response.cookies.set('accessToken', '', {
            path: '/',
            expires: new Date(0) // Thời gian hết hạn đã qua
        });
        response.cookies.set('userInfo', '', {
            path: '/',
            expires: new Date(0) // Thời gian hết hạn đã qua
        });

        return response;
    } catch (error: any) {
        console.error(error);
        return new Response(JSON.stringify({
            success: false,
            message: "Error processing logout.",
            error: error.message
        }), { status: 500 });
    }
}
