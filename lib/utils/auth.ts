import { NextRequest } from "next/server";
import { verifyToken, extractTokenFromHeader } from "./jwt";
import { ValidationError, UnauthorizedError } from "./errors";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: number;
    username: string;
    role: string;
  };
}

/**
 * Get auth token from request (header or cookie)
 * Returns null if token not found (doesn't throw error)
 */
export function getAuthTokenOptional(request: NextRequest): string | null {
  // Try to get token from Authorization header
  const authHeader = request.headers.get("authorization");
  let token = extractTokenFromHeader(authHeader);

  // If not in header, try to get from cookie
  if (!token) {
    token = request.cookies.get("auth-token")?.value || null;
  }

  return token;
}

/**
 * Get auth token from request (header or cookie)
 * Throws error if token not found
 */
export function getAuthToken(request: NextRequest): string {
  const token = getAuthTokenOptional(request);
  
  if (!token) {
    throw new UnauthorizedError();
  }

  return token;
}

/**
 * Verify auth token and return decoded user info
 * Throws error if token is invalid or not found
 */
export function verifyAuthToken(request: NextRequest): {
  userId: number;
  username: string;
  role: string;
} {
  const token = getAuthToken(request);
  const decoded = verifyToken(token);
  return decoded;
}

/**
 * Check if user is already authenticated
 * Returns decoded user info if authenticated, null otherwise
 */
export function checkAuthOptional(request: NextRequest): {
  userId: number;
  username: string;
  role: string;
} | null {
  try {
    const token = getAuthTokenOptional(request);
    if (!token) {
      return null;
    }
    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    return null;
  }
}

