import httpService from "@/lib/http"

// Định nghĩa kiểu dữ liệu cho attendance
export interface Attendance {
  username: string
  date: string
}

// Định nghĩa kiểu dữ liệu cho request create
export interface CreateAttendanceRequest {
  username: string
}

// API endpoints
const ENDPOINTS = {
  CREATE: "/attendance/create",
  GET: "/attendance/get",
}

const attendanceApiRequest = {
  /**
   * Lấy danh sách điểm danh
   */
  get: () => {
    const timestamp = new Date().toISOString();
    return httpService.get<Attendance>(ENDPOINTS.GET, { 
      params: { timestamp } 
    });
  },

  /**
   * Tạo điểm danh mới
   * @param data Dữ liệu điểm danh
   */
  create: (data: CreateAttendanceRequest) => {
    return httpService.post<Attendance>(ENDPOINTS.CREATE, data).then(res => res.data)
  },
}

export default attendanceApiRequest
