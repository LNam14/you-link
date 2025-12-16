import { NextRequest } from "next/server";
import { ReminderService } from "@/lib/services/reminder.service";
import { successResponse, errorResponse } from "@/lib/utils/response";

const reminderService = new ReminderService();

/**
 * POST /api/reminders/weekly
 * Gửi nhắc nhở công việc tuần tới Telegram
 * 
 * Body (optional):
 * {
 *   "chatId": "-1003124919874_156" (optional, mặc định là "-1003124919874_156")
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const chatId = body.chatId || "-1003124919874_156";

    await reminderService.sendWeeklyReminder(chatId);

    return successResponse({
      message: "Đã gửi nhắc nhở công việc tuần thành công",
    });
  } catch (error) {
    console.error("Error sending weekly reminder:", error);
    return errorResponse(error as Error);
  }
}

/**
 * GET /api/reminders/weekly
 * Lấy danh sách nhân viên cần nhắc nhở (không gửi tin nhắn)
 */
export async function GET(request: NextRequest) {
  try {
    const reminderData = await reminderService.getWeeklyReminderUsers();

    return successResponse(reminderData);
  } catch (error) {
    console.error("Error getting weekly reminder data:", error);
    return errorResponse(error as Error);
  }
}

