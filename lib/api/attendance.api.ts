class AttendanceApiRequest {
  private baseUrl = "/api/attendance";

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth-token");
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Có lỗi xảy ra");
    }

    return data.data ?? data;
  }

  async get(): Promise<any[]> {
    const data = await this.request<any>("");
    // Convert object format to array format
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const array: any[] = [];
      Object.keys(data).forEach((username) => {
        Object.keys(data[username]).forEach((date) => {
          array.push({ username, date });
        });
      });
      return array;
    }
    return Array.isArray(data) ? data : [];
  }

  async create(data: { username?: string }): Promise<any> {
    return this.request<any>("", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const attendanceApiRequest = new AttendanceApiRequest();

