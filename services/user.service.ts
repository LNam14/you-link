import { UserResponse, CreateUserDto, UpdateUserDto } from "@/lib/types";

export interface User {
  id: number;
  username: string;
  fullname: string;
  role: string;
  position: string;
  telegram: string;
  active: boolean;
  team: string;
}

class UserService {
  private baseUrl = "/api/users";

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

    const data = await response.json();

    if (!response.ok) {
      // Handle "User not found" gracefully
      if (response.status === 404 || data.error?.includes("not found") || data.error?.includes("Not found")) {
        console.warn("User not found:", endpoint);
        return null as T;
      }
      throw new Error(data.error || "Có lỗi xảy ra");
    }

    return data.data;
  }

  async getAllUsers(): Promise<UserResponse[]> {
    return this.request<UserResponse[]>("");
  }

  async getUserById(id: number): Promise<UserResponse> {
    return this.request<UserResponse>(`/${id}`);
  }

  async createUser(userData: CreateUserDto): Promise<UserResponse> {
    return this.request<UserResponse>("", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: UpdateUserDto): Promise<UserResponse | null> {
    const result = await this.request<UserResponse>(`/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
    // Return null if user not found instead of throwing error
    return result;
  }

  async deleteUser(id: number): Promise<void> {
    await this.request<void>(`/${id}`, {
      method: "DELETE",
    });
    // Return void even if user not found (already deleted)
    return;
  }

  async deleteUserByUsername(username: string): Promise<void> {
    const encodedUsername = encodeURIComponent(String(username || "").trim());
    await this.request<void>(`/by-username/${encodedUsername}`, {
      method: "DELETE",
    });
    return;
  }
}

export const userService = new UserService();

