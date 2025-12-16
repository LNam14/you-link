import { NextRequest } from "next/server";
import { TelegramService } from "@/lib/services/telegram.service";
import { successResponse, errorResponse } from "@/lib/utils/response";

const telegramService = new TelegramService();

interface SendBulkMessageRequest {
  chatIds: (string | number)[];
  message: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

/**
 * POST /api/telegram/send-bulk
 * Gửi tin nhắn tới nhiều Telegram chat IDs
 * 
 * Body:
 * {
 *   "chatIds": ["123456789", "987654321"],
 *   "message": "Nội dung tin nhắn",
 *   "parseMode": "HTML" (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendBulkMessageRequest = await request.json();

    // Validation
    if (!body.chatIds || !Array.isArray(body.chatIds) || body.chatIds.length === 0) {
      return errorResponse(
        new Error("chatIds must be a non-empty array"),
        400
      );
    }

    if (!body.message || body.message.trim().length === 0) {
      return errorResponse(
        new Error("message cannot be empty"),
        400
      );
    }

    // Send messages
    const results = await telegramService.sendMessageToMultiple(
      body.chatIds,
      body.message,
      body.parseMode
    );

    const successCount = results.filter((r) => r.ok).length;
    const failedCount = results.length - successCount;

    return successResponse({
      total: results.length,
      success: successCount,
      failed: failedCount,
      results: results.map((r, index) => ({
        chatId: body.chatIds[index],
        success: r.ok,
        messageId: r.result?.message_id,
        error: r.ok ? undefined : r.description,
      })),
    });
  } catch (error) {
    console.error("Error sending bulk Telegram messages:", error);
    return errorResponse(error as Error);
  }
}

