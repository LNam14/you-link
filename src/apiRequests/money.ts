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
  GET: "/money/get",
}

const attendanceApiRequest = {
  /**
   * Lấy danh sách điểm danh
   */

  get: () => {
    const timestamp = new Date().getTime();
    return httpService.get<Attendance[]>(`${ENDPOINTS.GET}?_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  },
}

export default attendanceApiRequest
