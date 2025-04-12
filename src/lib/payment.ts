import { PAYMENT_CONFIG } from "@/app/config"
import { TelegramService } from "./telegram"
import executeQuery from "@/app/db/db"

export class PaymentService {
  private static instance: PaymentService
  private telegramService: TelegramService

  private constructor() {
    this.telegramService = TelegramService.getInstance()
  }

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService()
    }
    return PaymentService.instance
  }

  async processPayment(userId: string, amount: number, method: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate amount
      if (amount < PAYMENT_CONFIG.minAmount || amount > PAYMENT_CONFIG.maxAmount) {
        return {
          success: false,
          error: `Số tiền phải từ ${PAYMENT_CONFIG.minAmount} đến ${PAYMENT_CONFIG.maxAmount}`,
        }
      }

      // Validate payment method
      if (!PAYMENT_CONFIG.supportedMethods.includes(method)) {
        return {
          success: false,
          error: "Phương thức thanh toán không được hỗ trợ",
        }
      }

      // Create transaction
      const result = await executeQuery(
        `INSERT INTO transactions (amount, deposit_date, method, description, customer_id, name, status) 
         VALUES ($1, NOW(), $2, $3, $4, $5, 'Đang chờ')
         RETURNING id`,
        [amount, method, `Payment-${Date.now()}`, userId, "Payment"]
      )

      if (!result || (result as any).error) {
        return {
          success: false,
          error: "Không thể tạo giao dịch",
        }
      }

      // Send notification
      await this.telegramService.sendMessage(
        PAYMENT_CONFIG.defaultChatId,
        `Người dùng ${userId} đã tạo giao dịch ${amount} ${method}`
      )

      return { success: true }
    } catch (error) {
      console.error("Payment processing error:", error)
      return {
        success: false,
        error: "Có lỗi xảy ra khi xử lý thanh toán",
      }
    }
  }

  async getPaymentHistory(userId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const result = await executeQuery(
        `SELECT * FROM transactions WHERE customer_id = $1 ORDER BY deposit_date DESC`,
        [userId]
      )

      if (!result || (result as any).error) {
        return {
          success: false,
          error: "Không thể lấy lịch sử giao dịch",
        }
      }

      return {
        success: true,
        data: Array.isArray(result) ? result : [],
      }
    } catch (error) {
      console.error("Error fetching payment history:", error)
      return {
        success: false,
        error: "Có lỗi xảy ra khi lấy lịch sử giao dịch",
      }
    }
  }
} 