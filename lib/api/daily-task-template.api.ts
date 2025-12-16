class DailyTaskTemplateApiRequest {
  private baseUrl = "/api/daily-task-templates";

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

  async get(): Promise<any> {
    return this.request<any>("");
  }

  async update(data: { template: any[] }): Promise<any> {
    return this.request<any>("", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
}

export const dailyTaskTemplateApiRequest = new DailyTaskTemplateApiRequest();

