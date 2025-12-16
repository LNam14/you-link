class WorkTaskApiRequest {
  private baseUrl = "/api/work-tasks";

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

  async getAllData(): Promise<any> {
    return this.request<any>("");
  }

  async create(data: { username: string; weekNumber: string; weekData: any }): Promise<any> {
    return this.request<any>("", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async update(data: { id: number; username: string; weekNumber: string; weekData: any }): Promise<any> {
    return this.request<any>("", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
}

export const workTaskApiRequest = new WorkTaskApiRequest();

