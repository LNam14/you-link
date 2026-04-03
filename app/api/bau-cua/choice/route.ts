import { NextRequest } from "next/server";
import { BauCuaRepository, AnimalType } from "@/lib/repositories/bau-cua.repository";
import { TelegramService } from "@/lib/services/telegram.service";
import { AuthService } from "@/lib/services/auth.service";
import { getAuthToken } from "@/lib/utils/auth";
import { verifyToken } from "@/lib/utils/jwt";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { formatDateTime, getVietnamTime, getVietnamHours, getVietnamMinutes, formatVietnamTime, getVietnamDate } from "@/lib/utils/date";

const bauCuaRepository = new BauCuaRepository();
const telegramService = new TelegramService();
const authService = new AuthService();

interface ChoiceRequest {
  animal: AnimalType;
}

/**
 * POST /api/bau-cua/choice
 * Lưu lựa chọn bầu cua của user và gửi tin nhắn Telegram
 */
export async function POST(request: NextRequest) {
  try {
    // Xác thực user
    const token = getAuthToken(request);
    if (!token) {
      return errorResponse(new Error("Authentication required"), 401);
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;
    const username = decoded.username;

    // Kiểm tra thời gian (chỉ cho phép từ 12:00 đến 22:55) - sử dụng múi giờ Việt Nam
    const vietnamNow = getVietnamTime();
    const hours = getVietnamHours();
    const minutes = getVietnamMinutes();
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = 12 * 60; // 12:00
    const endMinutes = 22 * 60 + 55; // 22:55

    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      return errorResponse(
        new Error("Chỉ có thể chọn từ 12:00 đến 22:55!"),
        400
      );
    }

    // Parse body
    const body: ChoiceRequest = await request.json();

    if (!body.animal || !["bau", "ca", "cua", "ga", "huou", "tom"].includes(body.animal)) {
      return errorResponse(
        new Error("Con vật không hợp lệ. Phải là: bau, ca, cua, ga, huou, tom"),
        400
      );
    }

    // Lấy thông tin user đầy đủ (cần fullname và telegram)
    const user = await authService.getCurrentUser(userId);
    const fullname = user.fullname || user.username;
    const telegram = user.telegram ||user.username;

    // Lấy ngày hiện tại (YYYY-MM-DD) - sử dụng múi giờ Việt Nam
    const date = getVietnamDate();

    // Kiểm tra xem user đã chọn trong ngày hôm nay chưa
    const existingChoice = await bauCuaRepository.getUserChoice(date, username);
    if (existingChoice) {
      return errorResponse(
        new Error("Bạn đã chọn con vật trong ngày hôm nay rồi!"),
        400
      );
    }

    // Lưu lựa chọn - sử dụng múi giờ Việt Nam
    const timestamp = formatDateTime(vietnamNow);
    await bauCuaRepository.saveChoice({
      animal: body.animal,
      fullname,
      username,
      timestamp,
      date,
    });

    // Gửi tin nhắn Telegram - sử dụng múi giờ Việt Nam
    const telegramHandle = telegram.replace("@", "");
    const timeStr = formatVietnamTime();
    
    const message = `🎲 BẦU CUA TÔM CÁ 🎲\n\n` +
      `👤 Người chơi: ${fullname} (@${telegramHandle})\n` +
      `📅 Ngày: ${date}\n` +
      `⏰ Thời gian: ${timeStr}\n\n` +
      `Chúc may mắn! 🍀`;

    try {
      await telegramService.sendMessage({
        chatId: "-5254819954",
        message: message,
      });
    } catch (telegramError) {
      console.error("Error sending Telegram message:", telegramError);
      // Không fail request nếu Telegram lỗi, chỉ log
    }

    return successResponse({
      message: "Đã lưu lựa chọn và gửi tin nhắn thành công",
      choice: {
        animal: body.animal,
        date,
        timestamp,
      },
    });
  } catch (error) {
    console.error("Error saving bau cua choice:", error);
    return errorResponse(error as Error);
  }
}

