import httpService from "@/lib/http";

// Định nghĩa kiểu dữ liệu cho transaction
export interface Transaction {
  id: string;
  amount: string;
  deposit_date: string;
  method: string;
  description: string;
  name: string;
  status: "Đang chờ" | "Hoàn thành" | "Lỗi";
  customer_id?: string;
}

// Định nghĩa kiểu dữ liệu cho response
export interface TransactionResponse {
  data: Transaction[];
}

// Định nghĩa kiểu dữ liệu cho request update
export interface UpdateTransactionRequest {
  transaction_id: string;
  status: string;
}

// Định nghĩa kiểu dữ liệu cho request delete
export interface DeleteTransactionRequest {
  transaction_id: string;
}

// API endpoints
const ENDPOINTS = {
  GET: "/transactions/get",
  CREATE: "/transactions/create",
  UPDATE: "/transactions/update",
  DELETE: "/transactions/delete", // Sửa lại endpoint cho đồng nhất
};

const transactionApiRequest = {
  /**
   * Lấy danh sách giao dịch
   * @param forceRefresh Bỏ qua cache và lấy dữ liệu mới
   */
  get: () => {
    return httpService.get<TransactionResponse>(ENDPOINTS.GET, {});
  },

  /**
   * Tạo giao dịch mới
   * @param data Dữ liệu giao dịch
   */
  create: (data: Partial<Transaction>) => {
    return httpService.post<Transaction>(ENDPOINTS.CREATE, data);
  },

  /**
   * Cập nhật trạng thái giao dịch
   * @param data Dữ liệu cập nhật
   */
  update: (data: UpdateTransactionRequest) => {
    return httpService.post<Transaction>(ENDPOINTS.UPDATE, data);
  },

  /**
   * Xóa giao dịch
   * @param data Dữ liệu xóa
   */
  delete: (data: DeleteTransactionRequest) => {
    return httpService.post<{ success: boolean }>(ENDPOINTS.DELETE, data);
  },
};

export default transactionApiRequest;
