import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAuthTokenOptional } from "@/lib/utils/auth";

const DASHBOARD_URL = "/dashboard";
const HOME_URL = "/";

async function verifyTokenEdge(token: string) {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Trang chủ dùng cho đăng nhập: chỉ chuyển sang dashboard nếu đã đăng nhập hợp lệ
  if (pathname === "/") {
    const token = getAuthTokenOptional(request);
    if (!token) {
      return NextResponse.next();
    }

    try {
      await verifyTokenEdge(token);
      return NextResponse.redirect(new URL(DASHBOARD_URL, request.url));
    } catch {
      const response = NextResponse.next();
      response.cookies.set("auth-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
      return response;
    }
  }

  // Chỉ áp dụng cho khu vực dashboard
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Cho phép truy cập công cụ check site mà không cần đăng nhập
  if (pathname.startsWith("/dashboard/tool-check-site")) {
    return NextResponse.next();
  }

  const token = getAuthTokenOptional(request);

  if (!token) {
    return NextResponse.redirect(new URL(HOME_URL, request.url));
  }

  try {
    await verifyTokenEdge(token);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL(HOME_URL, request.url));
    // Xóa cookie nếu token không hợp lệ để tránh loop
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  }
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};

