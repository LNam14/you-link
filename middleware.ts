import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAuthTokenOptional } from "@/lib/utils/auth";

async function verifyTokenEdge(token: string) {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  try {
    await verifyTokenEdge(token);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/", request.url));
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
  matcher: ["/dashboard/:path*"],
};

