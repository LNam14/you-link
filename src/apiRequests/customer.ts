import httpService from "@/lib/http"

export interface BulkCreateRequest {
  numberOfRows: number
}

// Add new interface for API response
export interface CustomerApiResponse {
    customers: any[]
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
    return httpService.get<any>(ENDPOINTS.GET, { 
      params: { timestamp } 
    });
  },

  /**
   * Tạo khách hàng mới (hỗ trợ tạo nhiều)
   * @param data dữ liệu khách hàng hoặc mảng khách hàng
   */
  create: (data: any) => {
    return httpService.post<any | any[]>(ENDPOINTS.CREATE, data).then(res => res.data)
  },

  /**
   * Cập nhật khách hàng (hỗ trợ cập nhật nhiều)
   * @param data dữ liệu khách hàng hoặc mảng khách hàng bao gồm `id`
   */
  update: (data: any | any[]) => {
    return httpService.put<any | any[]>(ENDPOINTS.UPDATE, data).then(res => res.data)
  },

  /**
   * Xóa khách hàng theo ID
   * @param id ID của khách hàng cần xóa
   */
  delete: (id: number) => {
    return httpService.delete<{ message: string; data: any }>(`${ENDPOINTS.DELETE}?id=${id}`).then(res => res.data)
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
