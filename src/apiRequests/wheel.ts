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
    // API trả về trực tiếp mảng Attendance[]
    return httpService.get<Wheel[]>(ENDPOINTS.GET)
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
