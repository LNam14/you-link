import { NextRequest } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { LoginDto } from "@/lib/types/auth.types";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body: LoginDto = await request.json();

    const loginResult = await authService.login(body);

    // Create response
    const response = successResponse(loginResult, 200);

    // Set HTTP-only cookie for token (optional, for additional security)
    response.cookies.set("auth-token", loginResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 3, // 3 ngày
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error during login:", error);
    return errorResponse(error as Error);
  }
}

