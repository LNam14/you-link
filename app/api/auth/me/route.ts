import { NextRequest } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { getAuthTokenOptional } from "@/lib/utils/auth";
import { verifyToken } from "@/lib/utils/jwt";
import { successResponse, errorResponse } from "@/lib/utils/response";

const authService = new AuthService();

export async function GET(request: NextRequest) {
  try {
    // Get token from header or cookie
    const token = getAuthTokenOptional(request);
    
    if (!token) {
      return errorResponse(new Error("Authentication required"), 401);
    }

    // Verify token
    const decoded = verifyToken(token);

    // Get full user information
    const user = await authService.getCurrentUser(decoded.userId);

    // Check if username in token matches current username in DB
    // If username was changed by admin, user should be logged out
    if (user.username !== decoded.username) {
      return errorResponse(new Error("Session invalidated"), 401);
    }

    // Check if user is still active
    // If active was changed to false by admin, user should be logged out
    if (!user.active) {
      return errorResponse(new Error("User account is inactive"), 401);
    }

    return successResponse(user);
  } catch (error: any) {
    console.error("Error getting current user:", error);
    return errorResponse(error as Error, 401);
  }
}

