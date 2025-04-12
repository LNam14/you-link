import httpService, { type ApiResponse } from "@/lib/http";

// Định nghĩa kiểu dữ liệu cho user
export interface User {
  id: string;
  username: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  // Thêm các trường khác nếu cần
}

// Định nghĩa kiểu dữ liệu cho login request
export interface LoginRequest {
  username: string;
  password: string;
}

// Định nghĩa kiểu dữ liệu cho register request
export interface RegisterRequest {
  username: string;
  password: string;
  name?: string;
  email?: string;
  role?: string;
  // Thêm các trường khác nếu cần
}

// Định nghĩa kiểu dữ liệu cho update request
export interface UpdateUserRequest {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  // Thêm các trường khác nếu cần
}

// Định nghĩa kiểu dữ liệu cho delete request
export interface DeleteUserRequest {
  id: string;
}

// Định nghĩa kiểu dữ liệu cho get by id request
export interface GetUserByIdRequest {
  id: string;
}

// Định nghĩa kiểu dữ liệu cho login response
export interface LoginResponse {
  user: User;
  token?: string;
  message?: string;
}

// Định nghĩa kiểu dữ liệu cho users response
export interface UsersResponse {
  data: User[];
}

// API endpoints
const ENDPOINTS = {
  GET_COUNT: "/auth/get-count",
  GET_ALL: "/auth/get",
  GET_STAFF: "/auth/get-staff",
  GET_BY_ID: "/auth/get-by-id",
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  UPDATE: "/auth/update",
  DELETE: "/auth/delete",
  LOGOUT: "/auth/logout",
};

/**
 * API service cho authentication và quản lý người dùng
 */
const authApiRequest = {
  /**
   * Lấy danh sách tất cả người dùng
   * @param forceRefresh Bỏ qua cache và lấy dữ liệu mới
   * @returns Promise với dữ liệu người dùng
   */
  getCount: (timestamp?: number | null) => {
    return httpService.get<UsersResponse>(ENDPOINTS.GET_COUNT, {
      params: { timestamp }, // nếu cần truyền timestamp vào query
    });
  },
  fetchData: (forceRefresh = false) => {
    return httpService.get<UsersResponse>(ENDPOINTS.GET_ALL, {
      cache: !forceRefresh,
    });
  },

  /**
   * Lấy danh sách nhân viên
   * @param forceRefresh Bỏ qua cache và lấy dữ liệu mới
   * @returns Promise với dữ liệu nhân viên
   */
  getStaff: (forceRefresh = false) => {
    return httpService.get<UsersResponse>(ENDPOINTS.GET_STAFF, {
      cache: !forceRefresh,
    });
  },

  /**
   * Lấy thông tin người dùng theo ID
   * @param data Object chứa ID người dùng
   * @returns Promise với dữ liệu người dùng
   */
  getById: (data: GetUserByIdRequest) => {
    return httpService.post<ApiResponse<User>>(ENDPOINTS.GET_BY_ID, data);
  },

  /**
   * Đăng nhập
   * @param data Thông tin đăng nhập
   * @returns Promise với kết quả đăng nhập
   */
  login: (data: LoginRequest) => {
    return httpService.post<LoginResponse>(ENDPOINTS.LOGIN, data);
  },

  /**
   * Đăng ký người dùng mới
   * @param data Thông tin đăng ký
   * @returns Promise với kết quả đăng ký
   */
  save: (data: RegisterRequest) => {
    return httpService.post<ApiResponse<User>>(ENDPOINTS.REGISTER, data);
  },

  /**
   * Cập nhật thông tin người dùng
   * @param data Thông tin cập nhật
   * @returns Promise với kết quả cập nhật
   */
  update: (data: UpdateUserRequest) => {
    return httpService.post<ApiResponse<User>>(ENDPOINTS.UPDATE, data);
  },

  /**
   * Xóa người dùng
   * @param data Thông tin xóa
   * @returns Promise với kết quả xóa
   */
  delete: (data: DeleteUserRequest) => {
    return httpService.post<ApiResponse<{ success: boolean }>>(
      ENDPOINTS.DELETE,
      data
    );
  },

  /**
   * Đăng xuất
   * @returns Promise với kết quả đăng xuất
   */
  logout: () => {
    return httpService.get<ApiResponse<{ success: boolean }>>(ENDPOINTS.LOGOUT);
  },
};

export default authApiRequest;
