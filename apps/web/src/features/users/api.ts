import { apiRequest, type ApiResult } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type {
  UserInvitationListResponse,
  UserInvitationListResult,
  UserListResponse,
  UserListResult,
} from "./types";

export interface UserInvitationPreview {
  email: string;
  store_name: string;
  role: "owner" | "cashier";
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
}

export async function getInvitationPreview(token: string): Promise<ApiResult<UserInvitationPreview>> {
  return apiRequest<UserInvitationPreview>(`/user-invitations/preview/${encodeURIComponent(token)}`);
}

export async function listUsers(limit = 50, offset = 0): Promise<UserListResult> {
  const token = await getAuthToken();
  if (!token) return { ok: true, data: { items: [], total: 0, limit, offset } };
  return apiRequest<UserListResponse>(`/users?limit=${limit}&offset=${offset}`, { token });
}

export async function listUserInvitations(limit = 50, offset = 0): Promise<UserInvitationListResult> {
  const token = await getAuthToken();
  if (!token) return { ok: true, data: { items: [], total: 0, limit, offset } };
  return apiRequest<UserInvitationListResponse>(
    `/user-invitations?limit=${limit}&offset=${offset}`,
    { token },
  );
}
