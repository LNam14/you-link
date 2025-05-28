import httpService, { type ApiResponse } from "@/lib/http"

// Định nghĩa kiểu dữ liệu cho team
export interface Team {
  id: string
  name: string
  description?: string
  active: string
  created_at?: string
  updated_at?: string
  member_count?: number
  active_member_count?: number
  members?: TeamMember[]
}

export interface TeamMember {
  id: string
  username: string
  name: string
  role: string
  active: boolean
  created_at?: string
  position:string
}

// Định nghĩa kiểu dữ liệu cho create team request
export interface CreateTeamRequest {
  name: string
  description?: string
  active?: string
}

// Định nghĩa kiểu dữ liệu cho update team request
export interface UpdateTeamRequest {
  id: string
  name: string
  description?: string
  active?: string
}

// Định nghĩa kiểu dữ liệu cho delete team request
export interface DeleteTeamRequest {
  name: string
}

// Định nghĩa kiểu dữ liệu cho toggle status request
export interface ToggleStatusRequest {
  id: string
}

// API endpoints
const ENDPOINTS = {
  CREATE: "/team/create",
  UPDATE: "/team/update",
  DELETE: "/team/delete",
  TOGGLE_STATUS: "/team/toggle-status",
}

/**
 * API service cho quản lý team
 */
const teamApiRequest = {
  /**
   * Tạo team mới
   * @param data Thông tin team
   * @returns Promise với kết quả tạo team
   */
  create: (data: CreateTeamRequest) => {
    return httpService.post<ApiResponse<Team>>(ENDPOINTS.CREATE, data)
  },

  /**
   * Cập nhật thông tin team
   * @param data Thông tin cập nhật team
   * @returns Promise với kết quả cập nhật
   */
  update: (data: UpdateTeamRequest) => {
    return httpService.post<ApiResponse<Team>>(ENDPOINTS.UPDATE, data)
  },

  /**
   * Xóa team
   * @param data Thông tin xóa team
   * @returns Promise với kết quả xóa
   */
  delete: (data: DeleteTeamRequest) => {
    return httpService.post<ApiResponse<{ success: boolean }>>(ENDPOINTS.DELETE, data)
  },

  /**
   * Toggle trạng thái team
   * @param data Thông tin toggle status
   * @returns Promise với kết quả toggle
   */
  toggleStatus: (data: ToggleStatusRequest) => {
    return httpService.post<ApiResponse<Team>>(ENDPOINTS.TOGGLE_STATUS, data)
  },
}

export default teamApiRequest
