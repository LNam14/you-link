import { NextResponse } from "next/server";
import { AppError } from "./errors";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function errorResponse(
  error: Error | AppError | string,
  status?: number
): NextResponse<ApiResponse> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  const errorMessage = error instanceof Error ? error.message : error;
  const errorStatus = status || 500;

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
    },
    { status: errorStatus }
  );
}

