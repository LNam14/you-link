import { TelegramService } from "./telegram"
import { executeQuery } from "@/app/db/db"

export class OrderService {
  private static instance: OrderService
  private telegramService: TelegramService

  private constructor() {
    this.telegramService = TelegramService.getInstance()
  }

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService()
    }
    return OrderService.instance
  }

  async createOrder(orderData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        orderID,
        orderNgay,
        NgDiDon,
        TenNV,
        MaNV,
        IDNV,
        Domain,
        HangMuc,
        LinkOrder,
        NoiDung,
        Duyet,
        TinhTrang,
        ckNumber,
        TiGia,
        USDT,
        NguoiNhan,
        ThanhToan,
        LinkBill,
        Note,
        KTXN,
        TongTien,
      } = orderData

      // Insert order
      const result = await executeQuery(
        `INSERT INTO Orders 
        (ID, Ngay, NgDiDon, TenNV, MaNV, IDNV, Domain, HangMuc, LinkOrder, NoiDung, Duyet, TinhTrang, CK, TiGia, USDT, NguoiNhan, ThanhToan, LinkBill, Note, KTXN, TongTien) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderID,
          orderNgay,
          NgDiDon,
          TenNV,
          MaNV,
          IDNV,
          Domain,
          HangMuc,
          LinkOrder,
          NoiDung,
          Duyet,
          TinhTrang,
          ckNumber,
          TiGia ? Number(TiGia) : null,
          USDT ? Number(USDT) : null,
          NguoiNhan,
          ThanhToan,
          LinkBill,
          Note,
          KTXN,
          TongTien,
        ]
      )

      if (!result || (result as any).error) {
        return {
          success: false,
          error: "Không thể tạo đơn hàng",
        }
      }

      // Send notification
      await this.telegramService.sendMessage(
        "-4618711960",
        `Đơn hàng mới #${orderID} đã được tạo bởi ${TenNV}`
      )

      return { success: true }
    } catch (error) {
      console.error("Order creation error:", error)
      return {
        success: false,
        error: "Có lỗi xảy ra khi tạo đơn hàng",
      }
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await executeQuery(
        `UPDATE Orders SET TinhTrang = ? WHERE ID = ?`,
        [status, orderId]
      )

      if (!result || (result as any).error) {
        return {
          success: false,
          error: "Không thể cập nhật trạng thái đơn hàng",
        }
      }

      // Send notification
      await this.telegramService.sendMessage(
        "-4618711960",
        `Đơn hàng #${orderId} đã được cập nhật trạng thái thành ${status}`
      )

      return { success: true }
    } catch (error) {
      console.error("Order status update error:", error)
      return {
        success: false,
        error: "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng",
      }
    }
  }

  async getOrderHistory(userId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const result = await executeQuery(
        `SELECT * FROM Orders WHERE IDNV = ? ORDER BY Ngay DESC`,
        [userId]
      )

      if (!result || (result as any).error) {
        return {
          success: false,
          error: "Không thể lấy lịch sử đơn hàng",
        }
      }

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error("Error fetching order history:", error)
      return {
        success: false,
        error: "Có lỗi xảy ra khi lấy lịch sử đơn hàng",
      }
    }
  }
} 