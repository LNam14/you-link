import httpService from "@/lib/http"

// Định nghĩa kiểu dữ liệu cho work task
export interface WeeklyTaskData {
  id: number
  title: string
  content: string
}

export interface DailyTaskData {
  day: string
  date: string
  chamCong: boolean
  spamMKT: string[]
  [key: string]: boolean | string[] | string
}

export interface WeekData {
  dateRange: {
    from: string
    to: string
  }
  weeklyTasks: WeeklyTaskData[]
  dailyTasks: DailyTaskData[]
}

export interface WorkTask {
  id: number
  username: string
  weekNumber: string
  weekData: WeekData
  createdAt: string
  updatedAt: string
}

export interface CreateWorkTaskRequest {
  weekNumber: string | number
  weekData: WeekData
  username?: string // Username của người được chọn (Admin chọn nhân viên)
}

export interface UpdateWorkTaskRequest {
  id: number
  weekNumber?: string | number
  weekData?: WeekData
  username?: string // Username của người được chọn (Admin chọn nhân viên)
}

export interface DeleteWorkTaskRequest {
  id: number
}

export interface WorkTaskResponse {
  users: {
    [username: string]: {
      weeks: {
        [weekNumber: string]: WeekData
      }
    }
  }
}

export interface GetAllDataResponse {
  attendance: Array<{
    id: number
    username: string
    date: string
  }>
  dailyTaskTemplate: {
    template: Array<{
      id: string
      name: string
      type: 'boolean' | 'text'
    }>
    updatedAt: string | null
    updatedBy: string | null
  }
  auth: {
    success: boolean
    data: {
      Admin: any[]
      NCC: any[]
      NV: any[]
      KH: any[]
      teams: any[]
    }
  }
  workTask: {
    users: {
      [username: string]: {
        weeks: {
          [weekNumber: string]: WeekData
        }
      }
    }
    taskIds: {
      [key: string]: number
    }
  }
}

// API endpoints
const ENDPOINTS = {
  CREATE: "/work-task/create",
  GET: "/work-task/get",
  GET_ALL_DATA: "/work-task/get-all-data",
  UPDATE: "/work-task/update",
  DELETE: "/work-task/delete",
}

const workTaskApiRequest = {
  /**
   * Lấy danh sách công việc
   * @returns Promise với dữ liệu công việc được nhóm theo user và week
   */
  get: () => {
    const timestamp = new Date().toISOString();
    return httpService.get<WorkTaskResponse>(ENDPOINTS.GET, { 
      params: { timestamp } 
    });
  },

  /**
   * Lấy tất cả dữ liệu cần thiết trong một lần gọi API
   * Bao gồm: attendance, dailyTaskTemplate, auth, workTask
   * @returns Promise với tất cả dữ liệu
   */
  getAllData: () => {
    const timestamp = new Date().toISOString();
    return httpService.get<GetAllDataResponse>(ENDPOINTS.GET_ALL_DATA, { 
      params: { timestamp } 
    });
  },

  /**
   * Tạo công việc mới
   * @param data Dữ liệu công việc (weekNumber và weekData)
   */
  create: (data: CreateWorkTaskRequest) => {
    return httpService.post<WorkTask>(ENDPOINTS.CREATE, data).then(res => res.data)
  },

  /**
   * Cập nhật công việc
   * @param data Dữ liệu công việc cần cập nhật (bao gồm id)
   */
  update: (data: UpdateWorkTaskRequest) => {
    return httpService.put<{ data: WorkTask }>(ENDPOINTS.UPDATE, data).then(res => res.data)
  },

  /**
   * Xóa công việc theo ID
   * @param id ID của công việc cần xóa
   */
  delete: (id: number) => {
    return httpService.delete<{ message: string; data: any }>(`${ENDPOINTS.DELETE}?id=${id}`).then(res => res.data)
  },
}

export default workTaskApiRequest

