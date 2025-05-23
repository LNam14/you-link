import httpService from "@/lib/http"

// Định nghĩa kiểu dữ liệu cho wheel
export interface Wheel {
  username: string
  reward: string
  date: string
}

// Định nghĩa kiểu dữ liệu cho request create
export interface CreateWheelRequest {
  username: string
  reward: string
}

// API endpoints
const ENDPOINTS = {
  CREATE: "/wheel/create",
  GET: "/wheel/get",
}

const wheelApiRequest = {
  /**
   * Lấy danh sách điểm danh
   */
  get: () => {
    const timestamp = new Date().getTime();
    return httpService.get<Wheel[]>(`${ENDPOINTS.GET}?_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  },
  /**
   * Tạo điểm danh mới
   * @param data Dữ liệu điểm danh
   */
  create: (data: CreateWheelRequest) => {
    return httpService.post<Wheel>(ENDPOINTS.CREATE, data).then(res => res.data)
  },
}

export default wheelApiRequest
