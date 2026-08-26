import type { ApiResult } from "@/lib/api/client";

export type UserRoleValue = "owner" | "cashier";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface UserResponse {
  id: string;
  email: string;
  store_id: string | null;
  full_name: string | null;
  role: UserRoleValue;
  is_active: boolean;
}

export interface UserListResponse {
  items: UserResponse[];
  total: number;
  limit: number;
  offset: number;
}

export type UserListResult = ApiResult<UserListResponse>;

export interface UserInvitationResponse {
  id: string;
  store_id: string;
  email: string;
  role: UserRoleValue;
  status: InvitationStatus;
  expires_at: string;
  invited_by_user_id: string;
  accepted_by_user_id: string | null;
  created_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  last_sent_at: string | null;
  send_count: number;
}

export interface UserInvitationCreated extends UserInvitationResponse {
  dev_invite_url: string | null;
}

export interface UserInvitationListResponse {
  items: UserInvitationResponse[];
  total: number;
  limit: number;
  offset: number;
}

export type UserInvitationListResult = ApiResult<UserInvitationListResponse>;

export interface InviteCashierFormValues {
  email: string;
  role: UserRoleValue;
}

export type InviteCashierState =
  | { ok: true; message: string; devInviteUrl: string | null; fieldErrors: Record<string, string> }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

export type UserActionState = {
  ok: boolean;
  message: string;
};

export interface AcceptInvitationFormValues {
  full_name: string;
  password: string;
}

export type AcceptInvitationState =
  | { ok: true }
  | { ok: false; message: string; fieldErrors: Record<string, string> };
