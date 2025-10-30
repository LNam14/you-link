import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { message } from "antd";

// Định nghĩa kiểu dữ liệu cho response API
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status?: number;
}

// Tạo class HttpService để quản lý các request API
class HttpService {
  private instance: AxiosInstance;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(baseURL = "/api", timeout = 120000) {
    this.instance = axios.create({
      baseURL,
      timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  // Thiết lập interceptors cho request và response
  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Tạo AbortController cho mỗi request để có thể hủy nếu cần
        const controller = new AbortController();
        const requestId = this.getRequestId(config);
        config.signal = controller.signal;
        this.abortControllers.set(requestId, controller);

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        // Xóa AbortController khi request hoàn thành
        const requestId = this.getRequestId(response.config);
        this.abortControllers.delete(requestId);

        return response;
      },
      (error: AxiosError) => {
        // Xóa AbortController khi request bị lỗi
        if (error.config) {
          const requestId = this.getRequestId(error.config);
          this.abortControllers.delete(requestId);
        }

        // Xử lý lỗi tập trung
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  // Tạo ID duy nhất cho mỗi request dựa trên URL và method
  private getRequestId(config: AxiosRequestConfig): string {
    return `${config.method}-${config.url}-${JSON.stringify(
      config.params || {}
    )}-${JSON.stringify(config.data || {})}`;
  }

  // Hủy request đang thực hiện
  public cancelRequest(config: AxiosRequestConfig): void {
    const requestId = this.getRequestId(config);
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  // Hủy tất cả request đang thực hiện
  public cancelAllRequests(): void {
    this.abortControllers.forEach((controller) => {
      controller.abort();
    });
    this.abortControllers.clear();
  }

  // Xử lý lỗi tập trung
  private handleError(error: any): void {
    // Không xử lý lỗi khi request bị hủy
    if (axios.isCancel(error)) {
      console.log("Request canceled:", error.message);
      return;
    }

    if (error.response) {
      const status = error.response.status;
      const errorMessage =
        (error.response.data as any)?.message ||
        "Đã xảy ra lỗi không mong muốn";

      switch (status) {
        case 400:
          message.error(`${errorMessage}`);
          break;
        case 401:
          message.error(`${errorMessage}`);
          // Có thể thêm logic chuyển hướng đến trang đăng nhập
          break;
        case 403:
          message.error(`${errorMessage}`);
          break;
        case 404:
          message.error(`${errorMessage}`);
          break;
        case 500:
          message.error(`${errorMessage}`);
          break;
        default:
          message.error(`${errorMessage}`);
      }
    } else if (error.request) {
      message.error("Không nhận được phản hồi từ máy chủ");
    } else {
      message.error("Đã xảy ra lỗi không mong muốn");
    }
  }

  // Cache cho các GET request
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTime = 60000; // 1 phút

  // Kiểm tra và lấy dữ liệu từ cache
  private getFromCache<T>(config: any): AxiosResponse<T> | null {
    if (config.method?.toLowerCase() !== "get" || config.cache === false) {
      return null;
    }

    const cacheKey = this.getRequestId(config);
    const cachedData = this.cache.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTime) {
      return {
        data: cachedData.data,
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      } as AxiosResponse<T>;
    }

    return null;
  }

  // Lưu dữ liệu vào cache
  private saveToCache(config: any, response: AxiosResponse): void {
    if (config.method?.toLowerCase() !== "get" || config.cache === false) {
      return;
    }

    const cacheKey = this.getRequestId(config);
    this.cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
    });
  }

  // Xóa cache
  public clearCache(): void {
    this.cache.clear();
  }

  // Các phương thức HTTP
  public async get<T = any>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const requestConfig = { ...config, params, url, method: "get" };

    // Kiểm tra cache
    const cachedResponse: any = this.getFromCache<T>(requestConfig);
    if (cachedResponse) {
      return cachedResponse.data;
    }

    const response = await this.instance.request<ApiResponse<T>>(requestConfig);

    // Lưu vào cache
    this.saveToCache(requestConfig, response);

    return response.data;
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.request<ApiResponse<T>>({
      ...config,
      url,
      method: "post",
      data,
    });
    return response.data;
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.request<ApiResponse<T>>({
      ...config,
      url,
      method: "put",
      data,
    });
    return response.data;
  }

  public async delete<T = any>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.instance.request<ApiResponse<T>>({
      ...config,
      url,
      method: "delete",
      params,
    });
    return response.data;
  }
}

// Tạo và export instance mặc định
const httpService = new HttpService();
export default httpService;
