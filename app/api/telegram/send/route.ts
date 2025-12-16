import { NextRequest } from "next/server";
import { TelegramService } from "@/lib/services/telegram.service";
import { successResponse, errorResponse } from "@/lib/utils/response";

const telegramService = new TelegramService();

interface SendMessageRequest {
  chatId: string | number;
  message: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

/**
 * POST /api/telegram/send
 * Gửi tin nhắn tới Telegram
 * 
 * Body:
 * {
 *   "chatId": "123456789" hoặc 123456789,
 *   "message": "Nội dung tin nhắn",
 *   "parseMode": "HTML" (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json();

    // Validation
    if (!body.chatId) {
      return errorResponse(
        new Error("chatId is required"),
        400
      );
    }

    if (!body.message || body.message.trim().length === 0) {
      return errorResponse(
        new Error("message cannot be empty"),
        400
      );
    }

    // Send message
    const result = await telegramService.sendMessage({
      chatId: body.chatId,
      message: body.message,
      parseMode: body.parseMode,
    });

    return successResponse({
      messageId: result.result?.message_id,
      sentAt: result.result?.date,
      chatId: result.result?.chat.id,
      success: true,
    });
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return errorResponse(error as Error);
  }
}

