import { NextRequest } from "next/server";
import { AttendanceService } from "@/lib/services/attendance.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";

const attendanceService = new AttendanceService();

// GET: Lấy dữ liệu chấm công
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = verifyAuthToken(request);
    const username = user.username;

    // Lấy query params
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    // Nếu có year và month, lấy theo tháng
    if (year && month) {
      const attendance = await attendanceService.getAttendanceByMonth(
        username,
        parseInt(year),
        parseInt(month)
      );
      return successResponse(attendance);
    }

    // Nếu không có, lấy tất cả
    const attendance = await attendanceService.getAttendanceByUsername(username);
    return successResponse(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return errorResponse(error as Error);
  }
}

// POST: Chấm công
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = verifyAuthToken(request);
    const username = user.username;

    const body = await request.json();
    const { date } = body;

    if (!date) {
      return errorResponse(new Error("Date is required"), 400);
    }

    // Format date: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return errorResponse(new Error("Invalid date format. Expected YYYY-MM-DD"), 400);
    }

    await attendanceService.checkIn(username, date);
    return successResponse({ message: "Chấm công thành công!", date }, 201);
  } catch (error) {
    console.error("Error checking in:", error);
    return errorResponse(error as Error);
  }
}

