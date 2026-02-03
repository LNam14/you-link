import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAuthTokenOptional } from "@/lib/utils/auth";

const DASHBOARD_URL = "/dashboard";

/**
 * Kiểm tra host hiện tại có nằm trong danh sách domain được phép (bắt buộc đăng nhập) hay không.
 * Nếu ALLOWED_DOMAINS không set hoặc host không nằm trong list → coi là "không phù hợp / không được phép" → không bắt buộc đăng nhập.
 */
function isAllowedDomain(host: string): boolean {
  const allowed = process.env.ALLOWED_DOMAINS;
  if (!allowed || !allowed.trim()) return false;
  const list = allowed.split(",").map((d) => d.trim().toLowerCase());
  const hostLower = host.toLowerCase().replace(/^https?:\/\//, "").split(":")[0];
  return list.some((d) => d === hostLower || hostLower.endsWith("." + d));
}

async function verifyTokenEdge(token: string) {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || request.nextUrl.hostname || "";

  // Truy cập / thì chuyển thẳng sang /dashboard, không mở trang login
  if (pathname === "/") {
    return NextResponse.redirect(new URL(DASHBOARD_URL, request.url));
  }

  // Chỉ áp dụng cho khu vực dashboard
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Cho phép truy cập công cụ check site mà không cần đăng nhập
  if (pathname.startsWith("/dashboard/tool-check-site")) {
    return NextResponse.next();
  }

  // Tên miền không phù hợp / không được phép → cho phép vào dashboard không cần đăng nhập
  if (!isAllowedDomain(host)) {
    return NextResponse.next();
  }

  const token = getAuthTokenOptional(request);

  if (!token) {
    return NextResponse.redirect(new URL(DASHBOARD_URL, request.url));
  }

  try {
    await verifyTokenEdge(token);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL(DASHBOARD_URL, request.url));
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

