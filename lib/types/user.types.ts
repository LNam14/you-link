export interface User {
  id: number;
  username: string;
  password: string;
  fullname: string;
  role: string;
  position: string;
  telegram: string;
  active: boolean;
  team: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserDto {
  username: string;
  password: string;
  fullname: string;
  role: string;
  position: string;
  telegram?: string;
  active?: boolean;
  team: string;
}

export interface UpdateUserDto {
  username?: string;
  password?: string;
  fullname?: string;
  role?: string;
  position?: string;
  telegram?: string;
  active?: boolean;
  team?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  password?: string;
  fullname: string;
  role: string;
  position: string;
  telegram: string;
  active: boolean;
  team: string;
  createdAt?: string;
  updatedAt?: string;
}

