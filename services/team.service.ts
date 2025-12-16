import { Team, CreateTeamDto, UpdateTeamDto } from "@/lib/types";

class TeamService {
  private baseUrl = "/api/teams";

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

    // Check if response has content before parsing JSON
    const contentType = response.headers.get("content-type");
    const hasJsonContent = contentType && contentType.includes("application/json");
    
    let data: any = null;
    if (hasJsonContent) {
      const text = await response.text();
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          // If JSON parsing fails, treat as empty response
          console.error("Failed to parse JSON response:", e);
          data = null;
        }
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || data?.message || "Có lỗi xảy ra");
    }

    // For DELETE requests, return void if no data
    if (options.method === "DELETE") {
      return undefined as T;
    }

    return data?.data ?? data ?? undefined as T;
  }

  async getAllTeams(): Promise<Team[]> {
    return this.request<Team[]>("");
  }

  async getTeamById(id: string): Promise<Team> {
    return this.request<Team>(`/${id}`);
  }

  async createTeam(teamData: CreateTeamDto): Promise<Team> {
    return this.request<Team>("", {
      method: "POST",
      body: JSON.stringify(teamData),
    });
  }

  async updateTeam(id: string, teamData: UpdateTeamDto): Promise<Team> {
    return this.request<Team>(`/${id}`, {
      method: "PUT",
      body: JSON.stringify(teamData),
    });
  }

  async deleteTeam(id: string): Promise<void> {
    await this.request<void>(`/${id}`, {
      method: "DELETE",
    });
  }
}

export const teamService = new TeamService();

