import httpService from "@/lib/http"

// Định nghĩa kiểu dữ liệu cho customer
export interface CustomerData {
  id?: number
  ma_moi: string
  phan_loai: string
  phien_ban: string
  ma_cu: string
  cty: string
  ten: string[]
  telegram: string[]
  link_nhom: string
  id_nhom: string
  nhom: string
  nguoi_cham: string
  tab_don: string
  cong_no: string
  tin_dung: string
  ngay_check: string // dạng dd/mm/yyyy
  tinh_trang: string
  note_kt: string
  note_khac: string
  created_at?: string
  updated_at?: string
}

export interface BulkCreateRequest {
  numberOfRows: number
}

// Add new interface for API response
export interface CustomerApiResponse {
    customers: CustomerData[]
    staffNames: string[]
    teamNames: string[]
}

// API endpoints
const ENDPOINTS = {
  CREATE: "/customer/create",
  UPDATE: "/customer/update", 
  GET: "/customer/get",
  DELETE: "/customer/delete",
}

const customerApiRequest = {
  /**
   * Lấy danh sách khách hàng với dữ liệu mới nhất
   */
  get: () => {
    const timestamp = new Date().toISOString();
    return httpService.get<CustomerData>(ENDPOINTS.GET, { 
      params: { timestamp } 
    });
  },

  /**
   * Tạo khách hàng mới (hỗ trợ tạo nhiều)
   * @param data dữ liệu khách hàng hoặc mảng khách hàng
   */
  create: (data: any) => {
    return httpService.post<CustomerData | CustomerData[]>(ENDPOINTS.CREATE, data).then(res => res.data)
  },

  /**
   * Cập nhật khách hàng (hỗ trợ cập nhật nhiều)
   * @param data dữ liệu khách hàng hoặc mảng khách hàng bao gồm `id`
   */
  update: (data: CustomerData | CustomerData[]) => {
    return httpService.put<CustomerData | CustomerData[]>(ENDPOINTS.UPDATE, data).then(res => res.data)
  },

  /**
   * Xóa khách hàng theo ID
   * @param id ID của khách hàng cần xóa
   */
  delete: (id: number) => {
    return httpService.delete<{ message: string; data: CustomerData }>(`${ENDPOINTS.DELETE}?id=${id}`).then(res => res.data)
  },

  /**
   * Xóa nhiều khách hàng
   * @param ids Mảng ID của các khách hàng cần xóa
   */
  deleteMultiple: async (ids: number[]) => {
    const results = await Promise.all(
      ids.map(id => customerApiRequest.delete(id))
    )
    return results
  },
}

export default customerApiRequest
