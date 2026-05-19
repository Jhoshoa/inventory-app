export type UserRole = "owner" | "cashier" | string;

export interface AuthUser {
  id: string;
  email: string;
  store_id?: string;
  full_name?: string | null;
  role?: UserRole;
  is_active?: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}
