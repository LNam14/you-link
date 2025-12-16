export interface SendMessageParams {
  chatId: string | number;
  message: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  messageThreadId?: number; // ID của topic trong group
}

export interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
    date: number;
    text: string;
    chat: {
      id: number;
      type: string;
    };
  };
  error_code?: number;
  description?: string;
}

export class TelegramService {
  private botToken: string;
  private baseUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || "";
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    if (!this.botToken) {
      console.warn("TELEGRAM_BOT_TOKEN is not set in environment variables");
    }
  }

  /**
   * Gửi tin nhắn tới Telegram
   * @param params - Tham số gửi tin nhắn
   * @returns Promise<TelegramResponse>
   */
  async sendMessage(params: SendMessageParams): Promise<TelegramResponse> {
    if (!this.botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    let { chatId, message, parseMode, messageThreadId } = params;

    if (!chatId) {
      throw new Error("Chat ID is required");
    }

    if (!message || message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    // Xử lý chat ID có format: "-1003124919874_156" (group_topic)
    // Tách thành group ID và topic ID
    let groupId: string | number = chatId;
    let topicId: number | undefined = messageThreadId;

    if (typeof chatId === "string" && chatId.includes("_")) {
      const parts = chatId.split("_");
      groupId = parts[0];
      topicId = parseInt(parts[1], 10);
    }

    try {
      const url = `${this.baseUrl}/sendMessage`;
      const payload: any = {
        chat_id: groupId,
        text: message,
      };

      if (parseMode) {
        payload.parse_mode = parseMode;
      }

      // Thêm message_thread_id nếu có topic
      if (topicId) {
        payload.message_thread_id = topicId;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: TelegramResponse = await response.json();

      if (!data.ok) {
        // Nếu topic bị đóng, thử gửi vào group chính (không có topic)
        if (data.description?.includes("TOPIC_CLOSED") && topicId) {
          console.warn(`Topic ${topicId} is closed, trying to send to main group`);
          
          // Thử lại không có topic
          const retryPayload: any = {
            chat_id: groupId,
            text: message,
          };

          if (parseMode) {
            retryPayload.parse_mode = parseMode;
          }

          const retryResponse = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(retryPayload),
          });

          const retryData: TelegramResponse = await retryResponse.json();

          if (!retryData.ok) {
            throw new Error(
              retryData.description || `Telegram API error: ${retryData.error_code}`
            );
          }

          return retryData;
        }

        throw new Error(
          data.description || `Telegram API error: ${data.error_code}`
        );
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send Telegram message: ${error.message}`);
      }
      throw new Error("Failed to send Telegram message: Unknown error");
    }
  }

  /**
   * Gửi tin nhắn tới nhiều chat IDs
   * @param chatIds - Mảng chat IDs
   * @param message - Nội dung tin nhắn
   * @param parseMode - Chế độ parse (HTML, Markdown, MarkdownV2)
   * @returns Promise<TelegramResponse[]>
   */
  async sendMessageToMultiple(
    chatIds: (string | number)[],
    message: string,
    parseMode?: "HTML" | "Markdown" | "MarkdownV2"
  ): Promise<TelegramResponse[]> {
    const promises = chatIds.map((chatId) =>
      this.sendMessage({ chatId, message, parseMode })
    );

    return Promise.all(promises);
  }

  /**
   * Kiểm tra bot token có hợp lệ không
   * @returns Promise<boolean>
   */
  async verifyBotToken(): Promise<boolean> {
    if (!this.botToken) {
      return false;
    }

    try {
      const url = `${this.baseUrl}/getMe`;
      const response = await fetch(url);
      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      return false;
    }
  }
}

