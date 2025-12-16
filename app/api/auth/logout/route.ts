import { NextRequest } from "next/server";
import { successResponse } from "@/lib/utils/response";

export async function POST(request: NextRequest) {
  // Create response
  const response = successResponse({ message: "Logged out successfully" }, 200);

  // Clear auth token cookie
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}

