import httpService, { type ApiResponse } from "@/lib/http";
import axios from "axios";

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
  id: number;
  field: string;
  value: string;
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

// Định nghĩa kiểu dữ liệu cho username response
export interface UsernameResponse {
  success: boolean;
  data: {
    username: string;
    name: string | null;
    displayName: string;
  }[];
}

// Định nghĩa kiểu dữ liệu cho create request
export interface CreateUserRequest {
  count: number;
  role: string;
  team?: string;
  position?: string;
}

// Định nghĩa kiểu dữ liệu cho get request
export interface GetRequest {
  timestamp?: string;
}

// API endpoints
const ENDPOINTS = {
  GET_COUNT: "/auth/get-count",
  GET: "/auth/get",
  GET_STAFF: "/auth/get-staff",
  GET_BY_ID: "/auth/get-by-id",
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  UPDATE: "/auth/update",
  DELETE: "/auth/delete",
  LOGOUT: "/auth/logout",
  CREATE: "/auth/create",
  GET_USERNAMES: "/auth/get-usernames",
};

/**
 * API service cho authentication và quản lý người dùng
 */
const authApiRequest = {
  /**
   * Lấy danh sách tất cả người dùng
   * @returns Promise với dữ liệu người dùng
   */
  getCount: () => {
    const timestamp = new Date().toISOString();
    return httpService.get<UsersResponse>(ENDPOINTS.GET_COUNT, {
      params: { timestamp }
    });
  },
  get: () => {
    const timestamp = new Date().toISOString();
    return httpService.get<UsersResponse>(ENDPOINTS.GET, { 
      params: { timestamp },
      retry: 3, // Retry 3 times if failed
      retryDelay: 1000, // Wait 1 second between retries
      dedupe: true // Ensure only one request is made at a time
    });
  },

  /**
   * Lấy thông tin người dùng theo ID
   * @param data Object chứa ID người dùng
   * @returns Promise với dữ liệu người dùng
   */
  getById: (data: GetUserByIdRequest) => {
    const timestamp = new Date().toISOString();
    return httpService.post<ApiResponse<User>>(ENDPOINTS.GET_BY_ID, {
      ...data,
      timestamp
    });
  },

  /**
   * Lấy danh sách nhân viên
   * @returns Promise với dữ liệu nhân viên
   */
  getStaff: () => {
    const timestamp = new Date().toISOString();
    return httpService.get<UsersResponse>(ENDPOINTS.GET_STAFF, {
      params: { timestamp }
    });
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
   * @param data Thông tin cập nhật (id, field, value)
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

  /**
   * Tạo nhiều tài khoản mới
   * @param data Thông tin tạo tài khoản
   * @returns Promise với kết quả tạo tài khoản
   */
  create: (data: CreateUserRequest) => {
    return httpService.post<ApiResponse<User[]>>(ENDPOINTS.CREATE, data);
  },

  /**
   * Lấy danh sách username và name
   * @returns Promise với dữ liệu username và name
   */
  getUsernames: () => {
    const timestamp = new Date().toISOString();
    return httpService.get<UsernameResponse>(ENDPOINTS.GET_USERNAMES, {
      params: { timestamp }
    });
  },
};

export default authApiRequest;
