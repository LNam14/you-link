import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAuthTokenOptional } from "@/lib/utils/auth";

const DASHBOARD_URL = "/dashboard";
const PUBLIC_UNAUTH_ROUTES = ["/dashboard"];

async function verifyTokenEdge(token: string) {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getAuthTokenOptional(request);

  // User chưa đăng nhập chỉ được vào /dashboard hoặc /dashboard/tool-check-site
  const allowWithoutAuth =
    PUBLIC_UNAUTH_ROUTES.includes(pathname) ||
    pathname.startsWith("/dashboard/tool-check-site");

  if (!token) {
    if (allowWithoutAuth) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(DASHBOARD_URL, request.url));
  }

  try {
    await verifyTokenEdge(token);
    if (pathname === "/") {
      return NextResponse.redirect(new URL(DASHBOARD_URL, request.url));
    }
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
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};

