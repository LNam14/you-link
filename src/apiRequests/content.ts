import httpService from "@/lib/http"

// API endpoints
const ENDPOINTS = {
  CREATE: "/content/create",
  UPDATE: "/content/update", 
  GET: "/content/get",
  DELETE: "/content/delete",
}

const contentApiRequest = {
  /**
   * Lấy danh sách điểm danh
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
}

export default contentApiRequest
