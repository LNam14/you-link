export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: number;
    username: string;
    fullname: string;
    role: string;
    position: string;
    telegram: string;
    active: boolean;
    team: string;
  };
  token: string;
}

export interface AuthUser {
  id: number;
  username: string;
  fullname: string;
  role: string;
  position: string;
  telegram: string;
  active: boolean;
  team: string;
}

