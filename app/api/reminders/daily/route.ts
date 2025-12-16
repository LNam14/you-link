import { NextRequest } from "next/server";
import { ReminderService } from "@/lib/services/reminder.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";

const reminderService = new ReminderService();

/**
 * POST /api/reminders/daily
 * Gửi nhắc nhở công việc hàng ngày tới Telegram
 * 
 * Body (optional):
 * {
 *   "chatId": "-1003124919874_156" (optional, mặc định là "-1003124919874_156")
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    const body = await request.json().catch(() => ({}));
    const chatId = body.chatId || "-1003124919874_156";

    await reminderService.sendDailyReminder(chatId);

    return successResponse({
      message: "Đã gửi nhắc nhở công việc hàng ngày thành công",
    });
  } catch (error) {
    console.error("Error sending daily reminder:", error);
    return errorResponse(error as Error);
  }
}

/**
 * GET /api/reminders/daily
 * Lấy danh sách nhân viên cần nhắc nhở (không gửi tin nhắn)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    const reminderData = await reminderService.getDailyReminderUsers();

    return successResponse(reminderData);
  } catch (error) {
    console.error("Error getting daily reminder data:", error);
    return errorResponse(error as Error);
  }
}

