import jwt from "jsonwebtoken";
import { AuthUser } from "../types/auth.types";

const JWT_SECRET: string = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "3d"; // 3 ngày

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

export function generateToken(user: AuthUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return authHeader;
}

