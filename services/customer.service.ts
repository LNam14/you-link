import { CustomerResponse, CreateCustomerDto, UpdateCustomerDto } from "@/lib/types";

class CustomerService {
  private baseUrl = "/api/customers";

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth-token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // If response is not JSON, create error from status text
      throw new Error(`Lỗi ${response.status}: ${response.statusText || "Không thể xử lý phản hồi"}`);
    }

    if (!response.ok) {
      // Handle 404 errors gracefully
      if (response.status === 404 || data?.error?.includes("not found") || data?.error?.includes("Not found")) {
        console.warn("Customer not found:", endpoint);
        return null as T;
      }
      
      // Handle authentication errors specifically
      if (response.status === 401 || response.status === 403) {
        const errorMsg = data?.error || data?.message || "Bạn không có quyền truy cập. Vui lòng đăng nhập lại.";
        throw new Error(errorMsg);
      }
      
      // Handle other errors
      const errorMsg = data?.error || data?.message || `Lỗi ${response.status}: ${response.statusText || "Có lỗi xảy ra"}`;
      throw new Error(errorMsg);
    }

    return data?.data;
  }

  async getAllCustomers(): Promise<CustomerResponse[]> {
    return this.request<CustomerResponse[]>("");
  }

  async getCustomerById(id: number): Promise<CustomerResponse> {
    return this.request<CustomerResponse>(`/${id}`);
  }

  async createCustomer(customerData: CreateCustomerDto): Promise<CustomerResponse> {
    return this.request<CustomerResponse>("", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(id: number, customerData: UpdateCustomerDto): Promise<CustomerResponse | null> {
    const result = await this.request<CustomerResponse>(`/${id}`, {
      method: "PUT",
      body: JSON.stringify(customerData),
    });
    return result;
  }

  async deleteCustomer(id: number): Promise<void> {
    await this.request<void>(`/${id}`, {
      method: "DELETE",
    });
  }

  async getCongNoFromSheet(): Promise<Map<string, string>> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/cong-no`, {
      headers,
    });
    
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(`Lỗi ${response.status}: ${response.statusText || "Không thể xử lý phản hồi"}`);
    }
    
    if (!response.ok) {
      // Handle authentication errors specifically
      if (response.status === 401 || response.status === 403) {
        const errorMsg = data?.error || data?.message || "Bạn không có quyền truy cập. Vui lòng đăng nhập lại.";
        throw new Error(errorMsg);
      }
      const errorMsg = data?.error || data?.message || `Lỗi ${response.status}: ${response.statusText || "Không thể lấy dữ liệu công nợ"}`;
      throw new Error(errorMsg);
    }
    
    // Convert array to Map
    const map = new Map<string, string>();
    if (data?.data && Array.isArray(data.data)) {
      data.data.forEach(([maMoi, congNo]: [string, string]) => {
        if (maMoi && congNo) {
          map.set(maMoi.trim(), congNo.trim());
        }
      });
    }
    return map;
  }
}

export const customerService = new CustomerService();

