import httpService from "@/lib/http"

// Định nghĩa kiểu dữ liệu cho custom daily task
export interface CustomDailyTask {
  id: string
  name: string
  type: 'boolean' | 'text'
}

export interface DailyTaskTemplateResponse {
  template: CustomDailyTask[]
  updatedAt: string | null
  updatedBy: string | null
}

export interface UpdateDailyTaskTemplateRequest {
  template: CustomDailyTask[]
}

// API endpoints
const ENDPOINTS = {
  GET: "/daily-task-template/get",
  UPDATE: "/daily-task-template/update",
}

const dailyTaskTemplateApiRequest = {
  /**
   * Lấy template công việc hàng ngày (dùng chung cho tất cả user)
   * @returns Promise với template data
   */
  get: () => {
    const timestamp = new Date().toISOString();
    return httpService.get<DailyTaskTemplateResponse>(ENDPOINTS.GET, { 
      params: { timestamp } 
    });
  },

  /**
   * Cập nhật template công việc hàng ngày
   * Thay đổi sẽ áp dụng cho tuần tiếp theo
   * @param data Template data (array of CustomDailyTask)
   */
  update: (data: UpdateDailyTaskTemplateRequest) => {
    return httpService.put<DailyTaskTemplateResponse>(ENDPOINTS.UPDATE, data).then(res => res.data)
  },
}

export default dailyTaskTemplateApiRequest

