export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTeamDto {
  name: string;
  description?: string;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
}

