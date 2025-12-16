interface SendMessageParams {
  chatId: string | number;
  message: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

interface SendBulkMessageParams {
  chatIds: (string | number)[];
  message: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

interface SendMessageResponse {
  messageId?: number;
  sentAt?: number;
  chatId?: number;
  success: boolean;
}

interface SendBulkMessageResponse {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    chatId: string | number;
    success: boolean;
    messageId?: number;
    error?: string;
  }>;
}

class TelegramApiRequest {
  private baseUrl = "/api/telegram";

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth-token");
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || "Có lỗi xảy ra");
    }

    return data.data ?? data;
  }

  /**
   * Gửi tin nhắn tới một Telegram chat ID
   * @param params - Tham số gửi tin nhắn
   * @returns Promise<SendMessageResponse>
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>("/send", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Gửi tin nhắn tới nhiều Telegram chat IDs
   * @param params - Tham số gửi tin nhắn hàng loạt
   * @returns Promise<SendBulkMessageResponse>
   */
  async sendBulkMessage(params: SendBulkMessageParams): Promise<SendBulkMessageResponse> {
    return this.request<SendBulkMessageResponse>("/send-bulk", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }
}

export const telegramApiRequest = new TelegramApiRequest();

