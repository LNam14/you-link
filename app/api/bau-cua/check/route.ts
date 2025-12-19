import { NextRequest } from "next/server";
import { BauCuaRepository } from "@/lib/repositories/bau-cua.repository";
import { getAuthToken } from "@/lib/utils/auth";
import { verifyToken } from "@/lib/utils/jwt";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { getVietnamDate } from "@/lib/utils/date";

const bauCuaRepository = new BauCuaRepository();

/**
 * GET /api/bau-cua/check?date=YYYY-MM-DD
 * Kiểm tra xem user đã chọn con vật trong ngày chưa
 */
export async function GET(request: NextRequest) {
  try {
    // Xác thực user
    const token = getAuthToken(request);
    if (!token) {
      return errorResponse(new Error("Authentication required"), 401);
    }

    const decoded = verifyToken(token);
    const username = decoded.username;

    // Lấy date từ query params hoặc dùng ngày hôm nay - sử dụng múi giờ Việt Nam
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    let date: string;
    if (dateParam) {
      date = dateParam;
    } else {
      date = getVietnamDate();
    }

    // Kiểm tra xem user đã chọn chưa
    const choice = await bauCuaRepository.getUserChoice(date, username);

    return successResponse({
      hasChosen: !!choice,
      choice: choice || null,
      date,
    });
  } catch (error) {
    console.error("Error checking bau cua choice:", error);
    return errorResponse(error as Error);
  }
}

